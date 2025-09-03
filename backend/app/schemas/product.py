"""
Product and inventory management schemas
"""

from pydantic import BaseModel, Field, validator, root_validator
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime
from enum import Enum
import uuid


class ProductStatus(str, Enum):
    """Product status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCONTINUED = "discontinued"


class StockStatus(str, Enum):
    """Stock status enumeration"""
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"


class ProductCategoryBase(BaseModel):
    """Base product category schema"""
    name: str = Field(..., min_length=1, max_length=255, description="Category name")
    description: Optional[str] = Field(None, description="Category description")
    parent_id: Optional[uuid.UUID] = Field(None, description="Parent category ID")
    sort_order: int = Field(default=0, description="Sort order for display")


class ProductCategoryCreate(ProductCategoryBase):
    """Schema for creating product category"""
    pass


class ProductCategoryUpdate(BaseModel):
    """Schema for updating product category"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    sort_order: Optional[int] = None


class ProductCategoryResponse(ProductCategoryBase):
    """Schema for product category response"""
    id: uuid.UUID
    tenant_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    """Base product schema"""
    name: str = Field(..., min_length=1, max_length=255, description="Product name")
    description: Optional[str] = Field(None, description="Product description")
    sku: Optional[str] = Field(None, max_length=100, description="Stock Keeping Unit")
    barcode: Optional[str] = Field(None, max_length=100, description="Product barcode")
    category_id: Optional[uuid.UUID] = Field(None, description="Product category ID")
    tags: Optional[List[str]] = Field(default_factory=list, description="Product tags")
    
    # Pricing
    cost_price: Optional[Decimal] = Field(None, ge=0, description="Product cost price")
    selling_price: Decimal = Field(..., ge=0, description="Product selling price")
    min_price: Optional[Decimal] = Field(None, ge=0, description="Minimum selling price")
    max_price: Optional[Decimal] = Field(None, ge=0, description="Maximum selling price")
    
    # Gold-specific fields
    is_gold_product: bool = Field(default=False, description="Whether this is a gold product")
    gold_purity: Optional[Decimal] = Field(None, ge=0, le=24, description="Gold purity (e.g., 18.000)")
    weight_per_unit: Optional[Decimal] = Field(None, ge=0, description="Weight per unit in grams")
    
    # Inventory
    track_inventory: bool = Field(default=True, description="Whether to track inventory")
    stock_quantity: int = Field(default=0, ge=0, description="Current stock quantity")
    reserved_quantity: int = Field(default=0, ge=0, description="Reserved stock quantity")
    min_stock_level: int = Field(default=0, ge=0, description="Minimum stock level")
    max_stock_level: Optional[int] = Field(None, ge=0, description="Maximum stock level")
    
    # Status
    status: ProductStatus = Field(default=ProductStatus.ACTIVE, description="Product status")
    is_service: bool = Field(default=False, description="Whether this is a service")
    
    # Physical properties
    length: Optional[Decimal] = Field(None, ge=0, description="Product length")
    width: Optional[Decimal] = Field(None, ge=0, description="Product width")
    height: Optional[Decimal] = Field(None, ge=0, description="Product height")
    weight: Optional[Decimal] = Field(None, ge=0, description="Product weight")
    
    # Additional info
    manufacturer: Optional[str] = Field(None, max_length=255, description="Manufacturer")
    brand: Optional[str] = Field(None, max_length=255, description="Brand")
    model: Optional[str] = Field(None, max_length=255, description="Model")
    notes: Optional[str] = Field(None, description="Internal notes")

    @validator('tags')
    def validate_tags(cls, v):
        """Validate tags list"""
        if v is None:
            return []
        # Remove duplicates and empty strings
        return list(set(tag.strip() for tag in v if tag and tag.strip()))

    @root_validator
    def validate_pricing(cls, values):
        """Validate pricing constraints"""
        selling_price = values.get('selling_price')
        min_price = values.get('min_price')
        max_price = values.get('max_price')
        cost_price = values.get('cost_price')
        
        if min_price and selling_price and min_price > selling_price:
            raise ValueError('Minimum price cannot be greater than selling price')
        
        if max_price and selling_price and max_price < selling_price:
            raise ValueError('Maximum price cannot be less than selling price')
        
        if min_price and max_price and min_price > max_price:
            raise ValueError('Minimum price cannot be greater than maximum price')
        
        if cost_price and selling_price and cost_price > selling_price:
            # This is just a warning, not an error
            pass
        
        return values

    @root_validator
    def validate_gold_fields(cls, values):
        """Validate gold-specific fields"""
        is_gold_product = values.get('is_gold_product', False)
        gold_purity = values.get('gold_purity')
        weight_per_unit = values.get('weight_per_unit')
        
        if is_gold_product:
            if not gold_purity:
                raise ValueError('Gold purity is required for gold products')
            if not weight_per_unit:
                raise ValueError('Weight per unit is required for gold products')
        
        return values

    @root_validator
    def validate_inventory(cls, values):
        """Validate inventory fields"""
        track_inventory = values.get('track_inventory', True)
        is_service = values.get('is_service', False)
        stock_quantity = values.get('stock_quantity', 0)
        reserved_quantity = values.get('reserved_quantity', 0)
        min_stock_level = values.get('min_stock_level', 0)
        max_stock_level = values.get('max_stock_level')
        
        if is_service:
            # Services don't track inventory
            values['track_inventory'] = False
            values['stock_quantity'] = 0
            values['reserved_quantity'] = 0
        
        if reserved_quantity > stock_quantity:
            raise ValueError('Reserved quantity cannot exceed stock quantity')
        
        if max_stock_level and min_stock_level > max_stock_level:
            raise ValueError('Minimum stock level cannot exceed maximum stock level')
        
        return values


class ProductCreate(ProductBase):
    """Schema for creating product"""
    pass


class ProductUpdate(BaseModel):
    """Schema for updating product"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    category_id: Optional[uuid.UUID] = None
    tags: Optional[List[str]] = None
    
    # Pricing
    cost_price: Optional[Decimal] = Field(None, ge=0)
    selling_price: Optional[Decimal] = Field(None, ge=0)
    min_price: Optional[Decimal] = Field(None, ge=0)
    max_price: Optional[Decimal] = Field(None, ge=0)
    
    # Gold-specific fields
    is_gold_product: Optional[bool] = None
    gold_purity: Optional[Decimal] = Field(None, ge=0, le=24)
    weight_per_unit: Optional[Decimal] = Field(None, ge=0)
    
    # Inventory
    track_inventory: Optional[bool] = None
    min_stock_level: Optional[int] = Field(None, ge=0)
    max_stock_level: Optional[int] = Field(None, ge=0)
    
    # Status
    status: Optional[ProductStatus] = None
    is_service: Optional[bool] = None
    
    # Physical properties
    length: Optional[Decimal] = Field(None, ge=0)
    width: Optional[Decimal] = Field(None, ge=0)
    height: Optional[Decimal] = Field(None, ge=0)
    weight: Optional[Decimal] = Field(None, ge=0)
    
    # Additional info
    manufacturer: Optional[str] = Field(None, max_length=255)
    brand: Optional[str] = Field(None, max_length=255)
    model: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class ProductResponse(ProductBase):
    """Schema for product response"""
    id: uuid.UUID
    tenant_id: uuid.UUID
    images: List[str] = Field(default_factory=list, description="Product image URLs")
    created_at: datetime
    updated_at: datetime
    is_active: bool
    
    # Computed fields
    available_quantity: int = Field(description="Available quantity (stock - reserved)")
    stock_status: StockStatus = Field(description="Current stock status")
    profit_margin: Optional[Decimal] = Field(description="Profit margin percentage")
    
    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    """Schema for product list response with pagination"""
    products: List[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProductSearchRequest(BaseModel):
    """Schema for product search request"""
    query: Optional[str] = Field(None, description="Search query")
    category_id: Optional[uuid.UUID] = Field(None, description="Filter by category")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    status: Optional[ProductStatus] = Field(None, description="Filter by status")
    is_gold_product: Optional[bool] = Field(None, description="Filter gold products")
    is_service: Optional[bool] = Field(None, description="Filter services")
    stock_status: Optional[StockStatus] = Field(None, description="Filter by stock status")
    min_price: Optional[Decimal] = Field(None, ge=0, description="Minimum price filter")
    max_price: Optional[Decimal] = Field(None, ge=0, description="Maximum price filter")
    manufacturer: Optional[str] = Field(None, description="Filter by manufacturer")
    brand: Optional[str] = Field(None, description="Filter by brand")
    
    # Sorting
    sort_by: Optional[str] = Field(default="name", description="Sort field")
    sort_order: Optional[str] = Field(default="asc", regex="^(asc|desc)$", description="Sort order")
    
    # Pagination
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Page size")


class StockAdjustmentRequest(BaseModel):
    """Schema for stock adjustment request"""
    quantity: int = Field(..., description="Quantity to adjust (positive or negative)")
    reason: Optional[str] = Field(None, description="Reason for adjustment")
    reference_type: Optional[str] = Field(None, description="Reference type (sale, purchase, etc.)")
    reference_id: Optional[uuid.UUID] = Field(None, description="Reference ID")


class StockReservationRequest(BaseModel):
    """Schema for stock reservation request"""
    quantity: int = Field(..., gt=0, description="Quantity to reserve")
    reason: Optional[str] = Field(None, description="Reason for reservation")
    reference_type: Optional[str] = Field(None, description="Reference type")
    reference_id: Optional[uuid.UUID] = Field(None, description="Reference ID")


class ImageUploadResponse(BaseModel):
    """Schema for image upload response"""
    image_url: str = Field(..., description="Uploaded image URL")
    original_filename: str = Field(..., description="Original filename")
    file_size: int = Field(..., description="File size in bytes")
    content_type: str = Field(..., description="File content type")
    processing_status: str = Field(default="pending", description="Processing status")


class ProductImageRequest(BaseModel):
    """Schema for adding/removing product images"""
    image_urls: List[str] = Field(..., description="List of image URLs")


class BulkProductUpdateRequest(BaseModel):
    """Schema for bulk product updates"""
    product_ids: List[uuid.UUID] = Field(..., description="List of product IDs")
    updates: ProductUpdate = Field(..., description="Updates to apply")


class ProductStatsResponse(BaseModel):
    """Schema for product statistics response"""
    total_products: int
    active_products: int
    inactive_products: int
    discontinued_products: int
    gold_products: int
    service_products: int
    low_stock_products: int
    out_of_stock_products: int
    total_inventory_value: Decimal
    categories_count: int


class LowStockAlert(BaseModel):
    """Schema for low stock alert"""
    product_id: uuid.UUID
    product_name: str
    sku: Optional[str]
    current_stock: int
    min_stock_level: int
    available_quantity: int
    stock_status: StockStatus