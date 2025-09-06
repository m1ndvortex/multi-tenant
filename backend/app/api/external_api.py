"""
External API endpoints for third-party integrations
These endpoints use API key authentication instead of JWT
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.api_key_auth import require_api_key_read, require_api_key_write, get_api_key_context
from ..models.customer import Customer
from ..models.product import Product
from ..models.invoice import Invoice, InvoiceStatus
from ..models.api_key import ApiKey
from ..models.tenant import Tenant
from ..schemas.customer import CustomerResponse, CustomerCreate
from ..schemas.product import ProductResponse, ProductCreate
from ..schemas.invoice import InvoiceResponse, InvoiceCreate
from ..services.webhook_service import WebhookService

router = APIRouter(prefix="/v1", tags=["External API"])


# Customer endpoints
@router.get("/customers", response_model=List[CustomerResponse])
async def list_customers(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term"),
    api_context: dict = Depends(get_api_key_context),
    db: Session = Depends(get_db)
):
    """
    List customers for the authenticated tenant
    
    **Requires API key with read scope**
    
    - **page**: Page number (default: 1)
    - **limit**: Items per page (max: 100)
    - **search**: Optional search term for customer name or email
    """
    tenant_id = api_context["tenant_id"]
    
    query = db.query(Customer).filter(
        Customer.tenant_id == tenant_id,
        Customer.is_active == True
    )
    
    if search:
        query = query.filter(
            Customer.name.ilike(f"%{search}%") |
            Customer.email.ilike(f"%{search}%")
        )
    
    # Calculate offset
    offset = (page - 1) * limit
    
    customers = query.offset(offset).limit(limit).all()
    
    return [
        CustomerResponse(
            id=str(customer.id),
            name=customer.name,
            email=customer.email,
            phone=customer.phone,
            address=customer.address,
            total_debt=float(customer.total_debt or 0),
            tags=customer.tags or [],
            created_at=customer.created_at,
            updated_at=customer.updated_at
        )
        for customer in customers
    ]


@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    api_context: dict = Depends(get_api_key_context),
    db: Session = Depends(get_db)
):
    """
    Create a new customer
    
    **Requires API key with write scope**
    """
    tenant_id = api_context["tenant_id"]
    
    # Check if customer with same email exists
    if customer_data.email:
        existing = db.query(Customer).filter(
            Customer.tenant_id == tenant_id,
            Customer.email == customer_data.email,
            Customer.is_active == True
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer with this email already exists"
            )
    
    # Create customer
    customer = Customer(
        tenant_id=tenant_id,
        name=customer_data.name,
        email=customer_data.email,
        phone=customer_data.phone,
        address=customer_data.address,
        tags=customer_data.tags or []
    )
    
    db.add(customer)
    db.commit()
    db.refresh(customer)
    
    # Send webhook notification
    webhook_service = WebhookService(db)
    await webhook_service.send_webhook(
        event_type="customer.created",
        payload={
            "id": str(customer.id),
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "created_at": customer.created_at.isoformat()
        },
        tenant_id=tenant_id
    )
    
    return CustomerResponse(
        id=str(customer.id),
        name=customer.name,
        email=customer.email,
        phone=customer.phone,
        address=customer.address,
        total_debt=float(customer.total_debt or 0),
        tags=customer.tags or [],
        created_at=customer.created_at,
        updated_at=customer.updated_at
    )


@router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    api_context: dict = Depends(get_api_key_context),
    db: Session = Depends(get_db)
):
    """
    Get a specific customer by ID
    
    **Requires API key with read scope**
    """
    tenant_id = api_context["tenant_id"]
    
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.tenant_id == tenant_id,
        Customer.is_active == True
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    return CustomerResponse(
        id=str(customer.id),
        name=customer.name,
        email=customer.email,
        phone=customer.phone,
        address=customer.address,
        total_debt=float(customer.total_debt or 0),
        tags=customer.tags or [],
        created_at=customer.created_at,
        updated_at=customer.updated_at
    )


# Product endpoints
@router.get("/products", response_model=List[ProductResponse])
async def list_products(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search term"),
    api_context: dict = Depends(get_api_key_context),
    db: Session = Depends(get_db)
):
    """
    List products for the authenticated tenant
    
    **Requires API key with read scope**
    """
    tenant_id = api_context["tenant_id"]
    
    query = db.query(Product).filter(
        Product.tenant_id == tenant_id,
        Product.is_active == True
    )
    
    if category:
        query = query.filter(Product.category == category)
    
    if search:
        query = query.filter(
            Product.name.ilike(f"%{search}%") |
            Product.description.ilike(f"%{search}%")
        )
    
    # Calculate offset
    offset = (page - 1) * limit
    
    products = query.offset(offset).limit(limit).all()
    
    return [
        ProductResponse(
            id=str(product.id),
            name=product.name,
            description=product.description,
            category=product.category,
            price=float(product.price),
            cost=float(product.cost or 0),
            stock_quantity=product.stock_quantity,
            images=product.images or [],
            created_at=product.created_at,
            updated_at=product.updated_at
        )
        for product in products
    ]


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    api_context: dict = Depends(get_api_key_context),
    db: Session = Depends(get_db)
):
    """
    Create a new product
    
    **Requires API key with write scope**
    """
    tenant_id = api_context["tenant_id"]
    
    # Create product
    product = Product(
        tenant_id=tenant_id,
        name=product_data.name,
        description=product_data.description,
        category=product_data.category,
        price=product_data.price,
        cost=product_data.cost,
        stock_quantity=product_data.stock_quantity or 0
    )
    
    db.add(product)
    db.commit()
    db.refresh(product)
    
    # Send webhook notification
    webhook_service = WebhookService(db)
    await webhook_service.send_webhook(
        event_type="product.created",
        payload={
            "id": str(product.id),
            "name": product.name,
            "category": product.category,
            "price": float(product.price),
            "stock_quantity": product.stock_quantity,
            "created_at": product.created_at.isoformat()
        },
        tenant_id=tenant_id
    )
    
    return ProductResponse(
        id=str(product.id),
        name=product.name,
        description=product.description,
        category=product.category,
        price=float(product.price),
        cost=float(product.cost or 0),
        stock_quantity=product.stock_quantity,
        images=product.images or [],
        created_at=product.created_at,
        updated_at=product.updated_at
    )


# Invoice endpoints
@router.get("/invoices", response_model=List[InvoiceResponse])
async def list_invoices(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    api_context: dict = Depends(get_api_key_context),
    db: Session = Depends(get_db)
):
    """
    List invoices for the authenticated tenant
    
    **Requires API key with read scope**
    """
    tenant_id = api_context["tenant_id"]
    
    query = db.query(Invoice).filter(
        Invoice.tenant_id == tenant_id,
        Invoice.is_active == True
    )
    
    if status:
        query = query.filter(Invoice.status == status)
    
    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)
    
    # Calculate offset
    offset = (page - 1) * limit
    
    invoices = query.offset(offset).limit(limit).all()
    
    return [
        InvoiceResponse(
            id=str(invoice.id),
            invoice_number=invoice.invoice_number,
            customer_id=str(invoice.customer_id),
            invoice_type=invoice.invoice_type.value,
            total_amount=float(invoice.total_amount),
            status=invoice.status.value,
            due_date=invoice.due_date,
            created_at=invoice.created_at,
            updated_at=invoice.updated_at
        )
        for invoice in invoices
    ]


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    api_context: dict = Depends(get_api_key_context),
    db: Session = Depends(get_db)
):
    """
    Get a specific invoice by ID
    
    **Requires API key with read scope**
    """
    tenant_id = api_context["tenant_id"]
    
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.tenant_id == tenant_id,
        Invoice.is_active == True
    ).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    return InvoiceResponse(
        id=str(invoice.id),
        invoice_number=invoice.invoice_number,
        customer_id=str(invoice.customer_id),
        invoice_type=invoice.invoice_type.value,
        total_amount=float(invoice.total_amount),
        status=invoice.status.value,
        due_date=invoice.due_date,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at
    )


# API Information endpoints
@router.get("/")
async def api_info():
    """
    Get API information and available endpoints
    """
    return {
        "name": "HesaabPlus External API",
        "version": "1.0.0",
        "description": "External API for HesaabPlus business management platform",
        "authentication": "API Key (X-API-Key header)",
        "rate_limits": {
            "default": {
                "per_minute": 60,
                "per_hour": 1000,
                "per_day": 10000
            }
        },
        "endpoints": {
            "customers": "/v1/customers",
            "products": "/v1/products",
            "invoices": "/v1/invoices"
        },
        "documentation": "/docs",
        "webhook_events": [
            "customer.created",
            "customer.updated",
            "product.created",
            "product.updated",
            "invoice.created",
            "invoice.updated",
            "invoice.paid"
        ]
    }


@router.get("/health")
async def external_api_health():
    """External API health check"""
    return {
        "status": "healthy",
        "service": "external_api",
        "version": "1.0.0"
    }