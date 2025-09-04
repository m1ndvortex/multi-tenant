"""
API endpoints for invoice QR code generation and public sharing
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import uuid
import logging
from io import BytesIO

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.invoice import Invoice
from app.services.invoice_sharing_service import InvoiceSharingService
from app.services.qr_service import QRCodeService
from app.services.pdf_service import PDFService
from app.tasks.pdf_tasks import generate_invoice_pdf_task, generate_qr_code_task
from app.schemas.invoice import InvoiceResponse
from app.core.exceptions import NotFoundError, ValidationError

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for request/response
class QRCodeRequest(BaseModel):
    """Request model for QR code generation"""
    regenerate: bool = Field(False, description="Whether to regenerate existing QR token")
    size: int = Field(10, ge=1, le=40, description="QR code size (1-40)")
    format: str = Field("PNG", pattern="^(PNG|JPEG|SVG)$", description="Image format")


class QRCodeResponse(BaseModel):
    """Response model for QR code generation"""
    qr_token: str
    qr_url: str
    qr_base64: Optional[str] = None
    invoice_number: str
    is_shareable: bool


class SharingSettingsRequest(BaseModel):
    """Request model for updating sharing settings"""
    is_shareable: bool
    regenerate_token: bool = False


class SharingSettingsResponse(BaseModel):
    """Response model for sharing settings"""
    invoice_id: str
    invoice_number: str
    is_shareable: bool
    qr_token: Optional[str] = None
    qr_url: Optional[str] = None


class AccessLogResponse(BaseModel):
    """Response model for access logs"""
    id: str
    invoice_id: str
    access_ip: Optional[str]
    user_agent: Optional[str]
    access_method: str
    created_at: str


class AccessStatsResponse(BaseModel):
    """Response model for access statistics"""
    total_accesses: int
    unique_ips: int
    daily_accesses: List[Dict[str, Any]]
    top_ips: List[Dict[str, Any]]
    most_accessed_invoices: List[Dict[str, Any]]
    period_days: int


# Protected endpoints (require authentication)
@router.post("/invoices/{invoice_id}/qr-code", response_model=QRCodeResponse)
async def generate_invoice_qr_code(
    invoice_id: uuid.UUID,
    request: QRCodeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate QR code for invoice"""
    try:
        # Get invoice service
        sharing_service = InvoiceSharingService(db)
        
        # Get invoice
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.is_active == True
        ).first()
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )
        
        # Generate or regenerate QR token
        if not invoice.qr_code_token or request.regenerate:
            invoice.generate_qr_token()
            invoice.is_shareable = True  # Enable sharing when generating QR code
            db.commit()
            db.refresh(invoice)
        
        # Generate QR code asynchronously
        background_tasks.add_task(
            generate_qr_code_task.delay,
            str(invoice_id),
            request.regenerate
        )
        
        # Generate QR code synchronously for immediate response
        qr_service = QRCodeService()
        qr_base64 = qr_service.generate_qr_code_base64(
            invoice.qr_code_token,
            request.format,
            request.size
        )
        
        qr_url = f"/public/invoice/{invoice.qr_code_token}"
        
        logger.info(f"Generated QR code for invoice {invoice.invoice_number}")
        
        return QRCodeResponse(
            qr_token=invoice.qr_code_token,
            qr_url=qr_url,
            qr_base64=qr_base64,
            invoice_number=invoice.invoice_number,
            is_shareable=invoice.is_shareable
        )
        
    except Exception as e:
        logger.error(f"Failed to generate QR code for invoice {invoice_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate QR code"
        )


@router.get("/invoices/{invoice_id}/qr-code/image")
async def get_invoice_qr_code_image(
    invoice_id: uuid.UUID,
    format: str = "PNG",
    size: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get QR code image for invoice"""
    try:
        # Get invoice
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.is_active == True
        ).first()
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )
        
        if not invoice.qr_code_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invoice does not have a QR code. Generate one first."
            )
        
        # Generate QR code image
        qr_service = QRCodeService()
        qr_bytes = qr_service.generate_invoice_qr_code(
            invoice.qr_code_token,
            format,
            size
        )
        
        # Return as streaming response
        media_type = f"image/{format.lower()}"
        return StreamingResponse(
            BytesIO(qr_bytes),
            media_type=media_type,
            headers={
                "Content-Disposition": f"inline; filename=qr_code_{invoice.invoice_number}.{format.lower()}"
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to get QR code image for invoice {invoice_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate QR code image"
        )


@router.put("/invoices/{invoice_id}/sharing", response_model=SharingSettingsResponse)
async def update_invoice_sharing_settings(
    invoice_id: uuid.UUID,
    request: SharingSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update invoice sharing settings"""
    try:
        sharing_service = InvoiceSharingService(db)
        
        invoice = sharing_service.update_invoice_sharing_settings(
            tenant_id=current_user.tenant_id,
            invoice_id=invoice_id,
            is_shareable=request.is_shareable,
            regenerate_token=request.regenerate_token
        )
        
        qr_url = f"/public/invoice/{invoice.qr_code_token}" if invoice.qr_code_token else None
        
        return SharingSettingsResponse(
            invoice_id=str(invoice.id),
            invoice_number=invoice.invoice_number,
            is_shareable=invoice.is_shareable,
            qr_token=invoice.qr_code_token,
            qr_url=qr_url
        )
        
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    except Exception as e:
        logger.error(f"Failed to update sharing settings for invoice {invoice_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update sharing settings"
        )


@router.get("/invoices/{invoice_id}/pdf")
async def generate_invoice_pdf(
    invoice_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    include_qr: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate PDF for invoice with optional QR code"""
    try:
        # Get invoice
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.is_active == True
        ).first()
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )
        
        # Generate PDF asynchronously for caching
        background_tasks.add_task(
            generate_invoice_pdf_task.delay,
            str(invoice_id),
            include_qr
        )
        
        # Generate PDF synchronously for immediate download
        qr_service = QRCodeService()
        pdf_service = PDFService(qr_service)
        
        # TODO: Get company info from tenant settings
        company_info = {
            'name': 'شرکت حسابداری',
            'address': 'آدرس شرکت',
            'phone': '021-12345678'
        }
        
        pdf_bytes = pdf_service.generate_invoice_pdf(
            invoice=invoice,
            include_qr=include_qr,
            company_info=company_info
        )
        
        # Return as streaming response
        filename = f"invoice_{invoice.invoice_number}.pdf"
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to generate PDF for invoice {invoice_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF"
        )


@router.get("/invoices/access-logs", response_model=List[AccessLogResponse])
async def get_invoice_access_logs(
    invoice_id: Optional[uuid.UUID] = None,
    days_back: int = 30,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get access logs for invoices"""
    try:
        sharing_service = InvoiceSharingService(db)
        
        access_logs, total = sharing_service.get_invoice_access_logs(
            tenant_id=current_user.tenant_id,
            invoice_id=invoice_id,
            days_back=days_back,
            skip=skip,
            limit=limit
        )
        
        return [
            AccessLogResponse(
                id=str(log.id),
                invoice_id=str(log.invoice_id),
                access_ip=str(log.access_ip) if log.access_ip else None,
                user_agent=log.user_agent,
                access_method=log.access_method,
                created_at=log.created_at.isoformat()
            )
            for log in access_logs
        ]
        
    except Exception as e:
        logger.error(f"Failed to get access logs for tenant {current_user.tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get access logs"
        )


@router.get("/invoices/access-stats", response_model=AccessStatsResponse)
async def get_invoice_access_statistics(
    invoice_id: Optional[uuid.UUID] = None,
    days_back: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get access statistics for invoices"""
    try:
        sharing_service = InvoiceSharingService(db)
        
        stats = sharing_service.get_invoice_access_statistics(
            tenant_id=current_user.tenant_id,
            invoice_id=invoice_id,
            days_back=days_back
        )
        
        return AccessStatsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Failed to get access statistics for tenant {current_user.tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get access statistics"
        )


# Public endpoints (no authentication required)
@router.get("/public/invoice/{qr_token}", response_model=InvoiceResponse)
async def get_public_invoice(
    qr_token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get invoice by QR token for public viewing (no authentication required)"""
    try:
        sharing_service = InvoiceSharingService(db)
        
        # Extract request information for logging
        access_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        referer = request.headers.get("referer")
        
        # Get public invoice and log access
        invoice = sharing_service.get_public_invoice(
            qr_token=qr_token,
            access_ip=access_ip,
            user_agent=user_agent,
            referer=referer
        )
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found or not shareable"
            )
        
        # Convert to response model
        from app.schemas.invoice import InvoiceResponse
        return InvoiceResponse.from_orm(invoice)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get public invoice for token {qr_token}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve invoice"
        )


@router.get("/public/invoice/{qr_token}/validate")
async def validate_qr_token(
    qr_token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Validate QR token without returning full invoice data"""
    try:
        sharing_service = InvoiceSharingService(db)
        
        access_ip = request.client.host if request.client else None
        
        result = sharing_service.validate_qr_token_access(
            qr_token=qr_token,
            access_ip=access_ip
        )
        
        if not result['valid']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['error']
            )
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to validate QR token {qr_token}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Validation failed"
        )


@router.get("/public/invoice/{qr_token}/pdf")
async def get_public_invoice_pdf(
    qr_token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get PDF for public invoice via QR token"""
    try:
        sharing_service = InvoiceSharingService(db)
        
        # Extract request information for logging
        access_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        referer = request.headers.get("referer")
        
        # Get public invoice
        invoice = sharing_service.get_public_invoice(
            qr_token=qr_token,
            access_ip=access_ip,
            user_agent=user_agent,
            referer=referer
        )
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found or not shareable"
            )
        
        # Generate PDF
        qr_service = QRCodeService()
        pdf_service = PDFService(qr_service)
        
        # Use generic company info for public PDFs
        company_info = {
            'name': 'فاکتور آنلاین',
            'address': '',
            'phone': ''
        }
        
        pdf_bytes = pdf_service.generate_invoice_pdf(
            invoice=invoice,
            include_qr=True,
            company_info=company_info
        )
        
        # Return as streaming response
        filename = f"invoice_{invoice.invoice_number}.pdf"
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={filename}",
                "Cache-Control": "public, max-age=3600"  # Cache for 1 hour
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get public PDF for token {qr_token}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF"
        )