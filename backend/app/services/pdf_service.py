"""
PDF generation service for invoices with QR codes
"""

from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
from typing import Optional, Dict, Any
from decimal import Decimal
import logging
import os
from datetime import datetime

from app.models.invoice import Invoice, InvoiceType
from app.services.qr_service import QRCodeService

logger = logging.getLogger(__name__)


class PDFService:
    """Service for generating PDF invoices with QR codes"""
    
    def __init__(self, qr_service: Optional[QRCodeService] = None):
        self.qr_service = qr_service or QRCodeService()
        self._setup_fonts()
    
    def _setup_fonts(self):
        """Setup fonts for PDF generation"""
        try:
            # Register Persian/Arabic fonts if available
            # For now, we'll use default fonts
            self.styles = getSampleStyleSheet()
            
            # Create custom styles for Persian text
            self.persian_style = ParagraphStyle(
                'Persian',
                parent=self.styles['Normal'],
                fontName='Helvetica',
                fontSize=12,
                alignment=TA_RIGHT,
                wordWrap='RTL'
            )
            
            self.persian_title = ParagraphStyle(
                'PersianTitle',
                parent=self.styles['Title'],
                fontName='Helvetica-Bold',
                fontSize=16,
                alignment=TA_CENTER,
                wordWrap='RTL'
            )
            
        except Exception as e:
            logger.warning(f"Font setup failed, using defaults: {e}")
    
    def generate_invoice_pdf(
        self, 
        invoice: Invoice, 
        include_qr: bool = True,
        company_info: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """
        Generate PDF for invoice with optional QR code
        
        Args:
            invoice: Invoice model instance
            include_qr: Whether to include QR code
            company_info: Company information for header
            
        Returns:
            PDF as bytes
        """
        try:
            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=20*mm,
                leftMargin=20*mm,
                topMargin=20*mm,
                bottomMargin=20*mm
            )
            
            # Build PDF content
            story = []
            
            # Add header
            story.extend(self._build_header(invoice, company_info))
            story.append(Spacer(1, 20))
            
            # Add invoice details
            story.extend(self._build_invoice_details(invoice))
            story.append(Spacer(1, 20))
            
            # Add customer information
            story.extend(self._build_customer_info(invoice))
            story.append(Spacer(1, 20))
            
            # Add invoice items table
            story.extend(self._build_items_table(invoice))
            story.append(Spacer(1, 20))
            
            # Add totals
            story.extend(self._build_totals(invoice))
            story.append(Spacer(1, 20))
            
            # Add QR code if requested and available
            if include_qr and invoice.qr_code_token:
                story.extend(self._build_qr_section(invoice))
            
            # Add footer
            story.extend(self._build_footer(invoice))
            
            # Build PDF
            doc.build(story)
            buffer.seek(0)
            
            logger.info(f"Generated PDF for invoice {invoice.invoice_number}")
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Failed to generate PDF for invoice {invoice.id}: {e}")
            raise
    
    def _build_header(self, invoice: Invoice, company_info: Optional[Dict[str, Any]]) -> list:
        """Build PDF header section"""
        elements = []
        
        # Company name and info
        if company_info:
            company_name = company_info.get('name', 'شرکت حسابداری')
            elements.append(Paragraph(company_name, self.persian_title))
            
            if company_info.get('address'):
                elements.append(Paragraph(company_info['address'], self.persian_style))
            
            if company_info.get('phone'):
                elements.append(Paragraph(f"تلفن: {company_info['phone']}", self.persian_style))
        
        # Invoice title
        invoice_title = "فاکتور طلا" if invoice.invoice_type == InvoiceType.GOLD else "فاکتور عمومی"
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(invoice_title, self.persian_title))
        
        return elements
    
    def _build_invoice_details(self, invoice: Invoice) -> list:
        """Build invoice details section"""
        elements = []
        
        # Create invoice details table
        data = [
            ['شماره فاکتور:', invoice.invoice_number],
            ['تاریخ:', invoice.invoice_date.strftime('%Y/%m/%d') if invoice.invoice_date else ''],
            ['وضعیت:', self._get_status_persian(invoice.status.value)],
        ]
        
        if invoice.due_date:
            data.append(['تاریخ سررسید:', invoice.due_date.strftime('%Y/%m/%d')])
        
        if invoice.invoice_type == InvoiceType.GOLD and invoice.gold_price_at_creation:
            data.append(['قیمت طلا (ریال/گرم):', f"{invoice.gold_price_at_creation:,.0f}"])
        
        table = Table(data, colWidths=[40*mm, 60*mm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ]))
        
        elements.append(table)
        return elements
    
    def _build_customer_info(self, invoice: Invoice) -> list:
        """Build customer information section"""
        elements = []
        
        elements.append(Paragraph("اطلاعات مشتری:", self.styles['Heading2']))
        
        customer_data = [
            ['نام:', invoice.customer.name],
            ['تلفن:', invoice.customer.phone or ''],
            ['آدرس:', invoice.customer.address or ''],
        ]
        
        table = Table(customer_data, colWidths=[30*mm, 80*mm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ]))
        
        elements.append(table)
        return elements
    
    def _build_items_table(self, invoice: Invoice) -> list:
        """Build invoice items table"""
        elements = []
        
        elements.append(Paragraph("اقلام فاکتور:", self.styles['Heading2']))
        
        # Prepare headers based on invoice type
        if invoice.invoice_type == InvoiceType.GOLD:
            headers = ['ردیف', 'شرح', 'تعداد', 'وزن (گرم)', 'اجرت', 'سود', 'مالیات', 'مبلغ کل']
        else:
            headers = ['ردیف', 'شرح', 'تعداد', 'قیمت واحد', 'تخفیف', 'مالیات', 'مبلغ کل']
        
        # Prepare data
        data = [headers]
        
        for i, item in enumerate(invoice.items, 1):
            if invoice.invoice_type == InvoiceType.GOLD:
                row = [
                    str(i),
                    item.description,
                    f"{item.quantity:,.0f}",
                    f"{item.weight or 0:,.3f}",
                    f"{item.labor_fee or 0:,.0f}",
                    f"{item.profit or 0:,.0f}",
                    f"{item.vat_amount or 0:,.0f}",
                    f"{item.line_total:,.0f}"
                ]
            else:
                row = [
                    str(i),
                    item.description,
                    f"{item.quantity:,.0f}",
                    f"{item.unit_price:,.0f}",
                    f"{item.discount_amount or 0:,.0f}",
                    f"{item.tax_amount or 0:,.0f}",
                    f"{item.line_total:,.0f}"
                ]
            data.append(row)
        
        # Create table
        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),  # Row numbers
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),   # Description
            ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'), # Total amounts
        ]))
        
        elements.append(table)
        return elements
    
    def _build_totals(self, invoice: Invoice) -> list:
        """Build totals section"""
        elements = []
        
        # Prepare totals data
        totals_data = []
        
        if invoice.subtotal != invoice.total_amount:
            totals_data.append(['جمع کل:', f"{invoice.subtotal:,.0f} ریال"])
        
        if invoice.discount_amount and invoice.discount_amount > 0:
            totals_data.append(['تخفیف:', f"{invoice.discount_amount:,.0f} ریال"])
        
        if invoice.tax_amount and invoice.tax_amount > 0:
            totals_data.append(['مالیات:', f"{invoice.tax_amount:,.0f} ریال"])
        
        totals_data.append(['مبلغ نهایی:', f"{invoice.total_amount:,.0f} ریال"])
        
        if invoice.paid_amount and invoice.paid_amount > 0:
            totals_data.append(['پرداخت شده:', f"{invoice.paid_amount:,.0f} ریال"])
            balance = invoice.total_amount - invoice.paid_amount
            if balance > 0:
                totals_data.append(['باقیمانده:', f"{balance:,.0f} ریال"])
        
        # Gold-specific totals
        if invoice.invoice_type == InvoiceType.GOLD:
            if invoice.total_gold_weight:
                totals_data.append(['وزن کل طلا:', f"{invoice.total_gold_weight:,.3f} گرم"])
            
            if invoice.remaining_gold_weight and invoice.remaining_gold_weight > 0:
                totals_data.append(['مانده به گرم:', f"{invoice.remaining_gold_weight:,.3f} گرم"])
        
        # Create totals table
        table = Table(totals_data, colWidths=[40*mm, 50*mm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('BACKGROUND', (-2, -1), (-1, -1), colors.yellow),  # Highlight final total
        ]))
        
        elements.append(table)
        return elements
    
    def _build_qr_section(self, invoice: Invoice) -> list:
        """Build QR code section"""
        elements = []
        
        try:
            # Generate QR code
            qr_bytes = self.qr_service.generate_invoice_qr_code(invoice.qr_code_token, size=6)
            
            # Create temporary image
            qr_buffer = BytesIO(qr_bytes)
            qr_image = Image(qr_buffer, width=60*mm, height=60*mm)
            
            elements.append(Spacer(1, 10))
            elements.append(Paragraph("برای مشاهده آنلاین فاکتور:", self.styles['Heading3']))
            elements.append(qr_image)
            elements.append(Paragraph("کد QR را اسکن کنید", self.persian_style))
            
        except Exception as e:
            logger.error(f"Failed to add QR code to PDF: {e}")
            # Add text fallback
            elements.append(Paragraph("لینک مشاهده آنلاین در دسترس نیست", self.persian_style))
        
        return elements
    
    def _build_footer(self, invoice: Invoice) -> list:
        """Build PDF footer"""
        elements = []
        
        elements.append(Spacer(1, 20))
        
        if invoice.terms_and_conditions:
            elements.append(Paragraph("شرایط و ضوابط:", self.styles['Heading3']))
            elements.append(Paragraph(invoice.terms_and_conditions, self.persian_style))
        
        if invoice.customer_notes:
            elements.append(Spacer(1, 10))
            elements.append(Paragraph("یادداشت:", self.styles['Heading3']))
            elements.append(Paragraph(invoice.customer_notes, self.persian_style))
        
        # Add generation timestamp
        elements.append(Spacer(1, 20))
        timestamp = datetime.now().strftime('%Y/%m/%d %H:%M')
        elements.append(Paragraph(f"تاریخ تولید PDF: {timestamp}", self.styles['Normal']))
        
        return elements
    
    def _get_status_persian(self, status: str) -> str:
        """Convert status to Persian"""
        status_map = {
            'DRAFT': 'پیش‌نویس',
            'SENT': 'ارسال شده',
            'PAID': 'پرداخت شده',
            'PARTIALLY_PAID': 'پرداخت جزئی',
            'OVERDUE': 'سررسید گذشته',
            'CANCELLED': 'لغو شده'
        }
        return status_map.get(status, status)
    
    def generate_invoice_pdf_with_watermark(
        self, 
        invoice: Invoice, 
        watermark_text: str = "نسخه آزمایشی"
    ) -> bytes:
        """Generate PDF with watermark for testing/demo purposes"""
        # This is a simplified version - in production you'd add proper watermarking
        pdf_bytes = self.generate_invoice_pdf(invoice)
        
        # For now, just return the regular PDF
        # TODO: Add watermarking functionality
        return pdf_bytes