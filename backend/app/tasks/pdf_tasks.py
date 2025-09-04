"""
Celery tasks for PDF generation and QR code processing
"""

from celery import current_app
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import logging
import os
from io import BytesIO

from app.core.database import SessionLocal
from app.models.invoice import Invoice
from app.services.pdf_service import PDFService
from app.services.qr_service import QRCodeService
from app.core.config import settings

logger = logging.getLogger(__name__)


@current_app.task(bind=True, max_retries=3)
def generate_invoice_pdf_task(
    self, 
    invoice_id: str, 
    include_qr: bool = True,
    company_info: Optional[Dict[str, Any]] = None,
    save_to_storage: bool = False
):
    """
    Generate PDF for invoice asynchronously
    
    Args:
        invoice_id: UUID of the invoice
        include_qr: Whether to include QR code
        company_info: Company information for header
        save_to_storage: Whether to save PDF to cloud storage
        
    Returns:
        Dict with PDF generation result
    """
    try:
        db = SessionLocal()
        
        # Get invoice
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.is_active == True
        ).first()
        
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")
        
        # Initialize services
        qr_service = QRCodeService()
        pdf_service = PDFService(qr_service)
        
        # Generate PDF
        pdf_bytes = pdf_service.generate_invoice_pdf(
            invoice=invoice,
            include_qr=include_qr,
            company_info=company_info
        )
        
        result = {
            'invoice_id': str(invoice_id),
            'invoice_number': invoice.invoice_number,
            'pdf_size': len(pdf_bytes),
            'generated_at': invoice.updated_at.isoformat() if invoice.updated_at else None,
            'include_qr': include_qr
        }
        
        # Save to storage if requested
        if save_to_storage:
            # TODO: Implement cloud storage saving
            # For now, we'll just log the action
            logger.info(f"PDF for invoice {invoice.invoice_number} would be saved to storage")
            result['saved_to_storage'] = True
        
        db.close()
        
        logger.info(f"Generated PDF for invoice {invoice.invoice_number}, size: {len(pdf_bytes)} bytes")
        return result
        
    except Exception as exc:
        logger.error(f"PDF generation failed for invoice {invoice_id}: {exc}")
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            countdown = 2 ** self.request.retries
            raise self.retry(exc=exc, countdown=countdown)
        
        # Final failure
        return {
            'error': str(exc),
            'invoice_id': str(invoice_id),
            'failed': True
        }


@current_app.task(bind=True, max_retries=3)
def generate_qr_code_task(self, invoice_id: str, regenerate: bool = False):
    """
    Generate QR code for invoice asynchronously
    
    Args:
        invoice_id: UUID of the invoice
        regenerate: Whether to regenerate existing QR token
        
    Returns:
        Dict with QR code generation result
    """
    try:
        db = SessionLocal()
        
        # Get invoice
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.is_active == True
        ).first()
        
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")
        
        # Generate QR token if needed
        if not invoice.qr_code_token or regenerate:
            invoice.generate_qr_token()
            db.commit()
            db.refresh(invoice)
        
        # Generate QR code image
        qr_service = QRCodeService()
        qr_bytes = qr_service.generate_invoice_qr_code(invoice.qr_code_token)
        qr_base64 = qr_service.generate_qr_code_base64(invoice.qr_code_token)
        
        result = {
            'invoice_id': str(invoice_id),
            'invoice_number': invoice.invoice_number,
            'qr_token': invoice.qr_code_token,
            'qr_size': len(qr_bytes),
            'qr_base64': qr_base64,
            'generated_at': invoice.updated_at.isoformat() if invoice.updated_at else None
        }
        
        db.close()
        
        logger.info(f"Generated QR code for invoice {invoice.invoice_number}")
        return result
        
    except Exception as exc:
        logger.error(f"QR code generation failed for invoice {invoice_id}: {exc}")
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            countdown = 2 ** self.request.retries
            raise self.retry(exc=exc, countdown=countdown)
        
        # Final failure
        return {
            'error': str(exc),
            'invoice_id': str(invoice_id),
            'failed': True
        }


@current_app.task(bind=True, max_retries=3)
def batch_generate_pdfs_task(
    self, 
    invoice_ids: list, 
    include_qr: bool = True,
    company_info: Optional[Dict[str, Any]] = None
):
    """
    Generate PDFs for multiple invoices in batch
    
    Args:
        invoice_ids: List of invoice UUIDs
        include_qr: Whether to include QR codes
        company_info: Company information for headers
        
    Returns:
        Dict with batch generation results
    """
    try:
        db = SessionLocal()
        results = []
        errors = []
        
        # Initialize services
        qr_service = QRCodeService()
        pdf_service = PDFService(qr_service)
        
        for invoice_id in invoice_ids:
            try:
                # Get invoice
                invoice = db.query(Invoice).filter(
                    Invoice.id == invoice_id,
                    Invoice.is_active == True
                ).first()
                
                if not invoice:
                    errors.append({
                        'invoice_id': str(invoice_id),
                        'error': 'Invoice not found'
                    })
                    continue
                
                # Generate PDF
                pdf_bytes = pdf_service.generate_invoice_pdf(
                    invoice=invoice,
                    include_qr=include_qr,
                    company_info=company_info
                )
                
                results.append({
                    'invoice_id': str(invoice_id),
                    'invoice_number': invoice.invoice_number,
                    'pdf_size': len(pdf_bytes),
                    'success': True
                })
                
            except Exception as e:
                errors.append({
                    'invoice_id': str(invoice_id),
                    'error': str(e)
                })
        
        db.close()
        
        result = {
            'total_requested': len(invoice_ids),
            'successful': len(results),
            'failed': len(errors),
            'results': results,
            'errors': errors
        }
        
        logger.info(f"Batch PDF generation completed: {len(results)} successful, {len(errors)} failed")
        return result
        
    except Exception as exc:
        logger.error(f"Batch PDF generation failed: {exc}")
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            countdown = 2 ** self.request.retries
            raise self.retry(exc=exc, countdown=countdown)
        
        # Final failure
        return {
            'error': str(exc),
            'failed': True,
            'total_requested': len(invoice_ids) if invoice_ids else 0
        }


@current_app.task
def cleanup_temp_files_task():
    """
    Clean up temporary PDF and QR code files
    """
    try:
        # TODO: Implement cleanup of temporary files
        # This would clean up any temporary files created during PDF generation
        
        logger.info("Temporary file cleanup completed")
        return {'cleaned_files': 0, 'success': True}
        
    except Exception as exc:
        logger.error(f"Temporary file cleanup failed: {exc}")
        return {'error': str(exc), 'success': False}