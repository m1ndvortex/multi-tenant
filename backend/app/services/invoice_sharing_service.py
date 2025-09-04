"""
Invoice sharing service for QR code access and public viewing
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func, desc
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import uuid
import logging
from ipaddress import ip_address, AddressValueError

from app.models.invoice import Invoice
from app.models.invoice_access_log import InvoiceAccessLog
from app.core.exceptions import NotFoundError, ValidationError, BusinessLogicError

logger = logging.getLogger(__name__)


class InvoiceSharingService:
    """Service for managing invoice sharing and access logging"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_public_invoice(
        self, 
        qr_token: str, 
        access_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        referer: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Optional[Invoice]:
        """
        Get invoice by QR token for public viewing and log access
        
        Args:
            qr_token: QR code token
            access_ip: IP address of accessor
            user_agent: User agent string
            referer: HTTP referer
            session_id: Session identifier
            
        Returns:
            Invoice if found and shareable, None otherwise
        """
        try:
            # Validate QR token
            if not qr_token or len(qr_token) < 10:
                raise ValidationError("Invalid QR token")
            
            # Get invoice
            invoice = self.db.query(Invoice).options(
                joinedload(Invoice.items),
                joinedload(Invoice.customer),
                joinedload(Invoice.installments)
            ).filter(
                Invoice.qr_code_token == qr_token,
                Invoice.is_shareable == True,
                Invoice.is_active == True
            ).first()
            
            if not invoice:
                logger.warning(f"Invoice not found or not shareable for QR token: {qr_token}")
                return None
            
            # Log access
            self._log_invoice_access(
                invoice_id=invoice.id,
                qr_token=qr_token,
                access_ip=access_ip,
                user_agent=user_agent,
                referer=referer,
                session_id=session_id
            )
            
            logger.info(f"Public access to invoice {invoice.invoice_number} via QR token")
            return invoice
            
        except Exception as e:
            logger.error(f"Failed to get public invoice for token {qr_token}: {e}")
            raise
    
    def _log_invoice_access(
        self,
        invoice_id: uuid.UUID,
        qr_token: str,
        access_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        referer: Optional[str] = None,
        session_id: Optional[str] = None,
        access_method: str = "qr_code"
    ):
        """Log invoice access for analytics and security"""
        try:
            # Validate IP address
            validated_ip = None
            if access_ip:
                try:
                    ip_address(access_ip)
                    validated_ip = access_ip
                except AddressValueError:
                    logger.warning(f"Invalid IP address: {access_ip}")
            
            # Create access log
            access_log = InvoiceAccessLog(
                invoice_id=invoice_id,
                qr_token=qr_token,
                access_ip=validated_ip,
                user_agent=user_agent[:1000] if user_agent else None,  # Truncate long user agents
                referer=referer[:500] if referer else None,
                access_method=access_method,
                session_id=session_id
            )
            
            self.db.add(access_log)
            self.db.commit()
            
            logger.debug(f"Logged access to invoice {invoice_id} from IP {access_ip}")
            
        except Exception as e:
            logger.error(f"Failed to log invoice access: {e}")
            # Don't raise exception for logging failures
    
    def get_invoice_access_logs(
        self,
        tenant_id: uuid.UUID,
        invoice_id: Optional[uuid.UUID] = None,
        days_back: int = 30,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[InvoiceAccessLog], int]:
        """
        Get access logs for invoices
        
        Args:
            tenant_id: Tenant ID for filtering
            invoice_id: Specific invoice ID (optional)
            days_back: Number of days to look back
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            Tuple of (access_logs, total_count)
        """
        try:
            # Base query with invoice join for tenant filtering
            query = self.db.query(InvoiceAccessLog).join(Invoice).filter(
                Invoice.tenant_id == tenant_id,
                Invoice.is_active == True,
                InvoiceAccessLog.created_at >= datetime.utcnow() - timedelta(days=days_back)
            )
            
            # Filter by specific invoice if provided
            if invoice_id:
                query = query.filter(InvoiceAccessLog.invoice_id == invoice_id)
            
            # Get total count
            total = query.count()
            
            # Apply pagination and ordering
            access_logs = query.order_by(
                desc(InvoiceAccessLog.created_at)
            ).offset(skip).limit(limit).all()
            
            return access_logs, total
            
        except Exception as e:
            logger.error(f"Failed to get access logs for tenant {tenant_id}: {e}")
            raise
    
    def get_invoice_access_statistics(
        self,
        tenant_id: uuid.UUID,
        invoice_id: Optional[uuid.UUID] = None,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Get access statistics for invoices
        
        Args:
            tenant_id: Tenant ID for filtering
            invoice_id: Specific invoice ID (optional)
            days_back: Number of days to analyze
            
        Returns:
            Dictionary with access statistics
        """
        try:
            # Base query
            base_query = self.db.query(InvoiceAccessLog).join(Invoice).filter(
                Invoice.tenant_id == tenant_id,
                Invoice.is_active == True,
                InvoiceAccessLog.created_at >= datetime.utcnow() - timedelta(days=days_back)
            )
            
            if invoice_id:
                base_query = base_query.filter(InvoiceAccessLog.invoice_id == invoice_id)
            
            # Total accesses
            total_accesses = base_query.count()
            
            # Unique IPs
            unique_ips = base_query.with_entities(
                InvoiceAccessLog.access_ip
            ).distinct().count()
            
            # Accesses by day
            daily_accesses = base_query.with_entities(
                func.date(InvoiceAccessLog.created_at).label('access_date'),
                func.count(InvoiceAccessLog.id).label('access_count')
            ).group_by(
                func.date(InvoiceAccessLog.created_at)
            ).order_by('access_date').all()
            
            # Top accessing IPs
            top_ips = base_query.with_entities(
                InvoiceAccessLog.access_ip,
                func.count(InvoiceAccessLog.id).label('access_count')
            ).filter(
                InvoiceAccessLog.access_ip.isnot(None)
            ).group_by(
                InvoiceAccessLog.access_ip
            ).order_by(
                desc('access_count')
            ).limit(10).all()
            
            # Most accessed invoices (if not filtering by specific invoice)
            most_accessed = []
            if not invoice_id:
                most_accessed = base_query.join(Invoice).with_entities(
                    Invoice.invoice_number,
                    Invoice.id,
                    func.count(InvoiceAccessLog.id).label('access_count')
                ).group_by(
                    Invoice.id, Invoice.invoice_number
                ).order_by(
                    desc('access_count')
                ).limit(10).all()
            
            return {
                'total_accesses': total_accesses,
                'unique_ips': unique_ips,
                'daily_accesses': [
                    {
                        'date': access.access_date.isoformat(),
                        'count': access.access_count
                    }
                    for access in daily_accesses
                ],
                'top_ips': [
                    {
                        'ip': str(ip.access_ip),
                        'count': ip.access_count
                    }
                    for ip in top_ips
                ],
                'most_accessed_invoices': [
                    {
                        'invoice_number': invoice.invoice_number,
                        'invoice_id': str(invoice.id),
                        'access_count': invoice.access_count
                    }
                    for invoice in most_accessed
                ],
                'period_days': days_back
            }
            
        except Exception as e:
            logger.error(f"Failed to get access statistics for tenant {tenant_id}: {e}")
            raise
    
    def update_invoice_sharing_settings(
        self,
        tenant_id: uuid.UUID,
        invoice_id: uuid.UUID,
        is_shareable: bool,
        regenerate_token: bool = False
    ) -> Invoice:
        """
        Update invoice sharing settings
        
        Args:
            tenant_id: Tenant ID
            invoice_id: Invoice ID
            is_shareable: Whether invoice should be shareable
            regenerate_token: Whether to regenerate QR token
            
        Returns:
            Updated invoice
        """
        try:
            # Get invoice
            invoice = self.db.query(Invoice).filter(
                Invoice.id == invoice_id,
                Invoice.tenant_id == tenant_id,
                Invoice.is_active == True
            ).first()
            
            if not invoice:
                raise NotFoundError("Invoice not found")
            
            # Update sharing settings
            invoice.is_shareable = is_shareable
            
            # Generate or regenerate QR token if shareable
            if is_shareable and (not invoice.qr_code_token or regenerate_token):
                invoice.generate_qr_token()
            elif not is_shareable:
                # Optionally clear token when not shareable
                # invoice.qr_code_token = None
                pass
            
            self.db.commit()
            self.db.refresh(invoice)
            
            logger.info(f"Updated sharing settings for invoice {invoice.invoice_number}")
            return invoice
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update sharing settings for invoice {invoice_id}: {e}")
            raise
    
    def validate_qr_token_access(
        self,
        qr_token: str,
        access_ip: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate QR token access without returning invoice data
        
        Args:
            qr_token: QR code token
            access_ip: IP address for rate limiting
            
        Returns:
            Validation result
        """
        try:
            # Check if token exists and is valid
            invoice = self.db.query(Invoice).filter(
                Invoice.qr_code_token == qr_token,
                Invoice.is_shareable == True,
                Invoice.is_active == True
            ).first()
            
            if not invoice:
                return {
                    'valid': False,
                    'error': 'Invalid or expired QR code'
                }
            
            # Check rate limiting if IP provided
            if access_ip:
                # Count recent accesses from this IP
                recent_accesses = self.db.query(InvoiceAccessLog).filter(
                    InvoiceAccessLog.access_ip == access_ip,
                    InvoiceAccessLog.created_at >= datetime.utcnow() - timedelta(hours=1)
                ).count()
                
                # Rate limit: max 100 accesses per hour per IP
                if recent_accesses > 100:
                    return {
                        'valid': False,
                        'error': 'Rate limit exceeded. Please try again later.'
                    }
            
            return {
                'valid': True,
                'invoice_number': invoice.invoice_number,
                'invoice_type': invoice.invoice_type.value,
                'customer_name': invoice.customer.name
            }
            
        except Exception as e:
            logger.error(f"Failed to validate QR token {qr_token}: {e}")
            return {
                'valid': False,
                'error': 'Validation failed'
            }
    
    def get_shareable_invoices(
        self,
        tenant_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Invoice], int]:
        """
        Get all shareable invoices for a tenant
        
        Args:
            tenant_id: Tenant ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            Tuple of (invoices, total_count)
        """
        try:
            query = self.db.query(Invoice).filter(
                Invoice.tenant_id == tenant_id,
                Invoice.is_shareable == True,
                Invoice.is_active == True,
                Invoice.qr_code_token.isnot(None)
            )
            
            total = query.count()
            
            invoices = query.order_by(
                desc(Invoice.created_at)
            ).offset(skip).limit(limit).all()
            
            return invoices, total
            
        except Exception as e:
            logger.error(f"Failed to get shareable invoices for tenant {tenant_id}: {e}")
            raise