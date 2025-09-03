"""
Product and inventory models with multi-tenant support
"""

from sqlalchemy import Column, String, DateTime, Boolean, Enum, Text, Numeric, Integer, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from decimal import Decimal
from datetime import datetime
from .base import BaseModel, TenantMixin


class ProductStatus(enum.Enum):
    """Product status enumeration"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    DISCONTINUED = "DISCONTINUED"


class StockStatus(enum.Enum):
    """Stock status enumeration"""
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"


class ProductCategory(BaseModel, TenantMixin):
    """
    Product category model for organizing products
    """
    __tablename__ = "product_categories"
    
    name = Column(
        String(255), 
        nullable=False,
        comment="Category name"
    )
    
    description = Column(
        Text, 
        nullable=True,
        comment="Category description"
    )
    
    parent_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("product_categories.id"),
        nullable=True,
        comment="Parent category ID for hierarchical structure"
    )
    
    sort_order = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Sort order for display"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    parent = relationship("ProductCategory", remote_side="ProductCategory.id")
    children = relationship("ProductCategory", back_populates="parent")
    products = relationship("Product", back_populates="category")
    
    def __repr__(self):
        return f"<ProductCategory(id={self.id}, name='{self.name}')>"


class Product(BaseModel, TenantMixin):
    """
    Product model with multi-tenant support and inventory tracking
    """
    __tablename__ = "products"
    
    # Basic Information
    name = Column(
        String(255), 
        nullable=False,
        comment="Product name"
    )
    
    description = Column(
        Text, 
        nullable=True,
        comment="Product description"
    )
    
    sku = Column(
        String(100), 
        nullable=True,
        comment="Stock Keeping Unit (SKU)"
    )
    
    barcode = Column(
        String(100), 
        nullable=True,
        comment="Product barcode"
    )
    
    # Category and Classification
    category_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("product_categories.id"),
        nullable=True,
        comment="Product category ID"
    )
    
    tags = Column(
        JSONB, 
        default=list,
        nullable=True,
        comment="Product tags for search and filtering"
    )
    
    # Pricing
    cost_price = Column(
        Numeric(15, 2), 
        nullable=True,
        comment="Product cost price"
    )
    
    selling_price = Column(
        Numeric(15, 2), 
        nullable=False,
        comment="Product selling price"
    )
    
    min_price = Column(
        Numeric(15, 2), 
        nullable=True,
        comment="Minimum allowed selling price"
    )
    
    max_price = Column(
        Numeric(15, 2), 
        nullable=True,
        comment="Maximum allowed selling price"
    )
    
    # Gold-specific fields
    is_gold_product = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether this is a gold product"
    )
    
    gold_purity = Column(
        Numeric(5, 3), 
        nullable=True,
        comment="Gold purity (e.g., 18.000 for 18k)"
    )
    
    weight_per_unit = Column(
        Numeric(10, 3), 
        nullable=True,
        comment="Weight per unit in grams (for gold products)"
    )
    
    # Inventory Management
    track_inventory = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether to track inventory for this product"
    )
    
    stock_quantity = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Current stock quantity"
    )
    
    reserved_quantity = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Reserved stock quantity"
    )
    
    min_stock_level = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Minimum stock level for alerts"
    )
    
    max_stock_level = Column(
        Integer, 
        nullable=True,
        comment="Maximum stock level"
    )
    
    # Status and Availability
    status = Column(
        Enum(ProductStatus), 
        default=ProductStatus.ACTIVE,
        nullable=False,
        comment="Product status"
    )
    
    is_service = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether this is a service (no inventory tracking)"
    )
    
    # Media and Images
    images = Column(
        JSONB, 
        default=list,
        nullable=True,
        comment="Product images URLs"
    )
    
    # Dimensions and Physical Properties
    length = Column(
        Numeric(10, 2), 
        nullable=True,
        comment="Product length"
    )
    
    width = Column(
        Numeric(10, 2), 
        nullable=True,
        comment="Product width"
    )
    
    height = Column(
        Numeric(10, 2), 
        nullable=True,
        comment="Product height"
    )
    
    weight = Column(
        Numeric(10, 3), 
        nullable=True,
        comment="Product weight"
    )
    
    # Additional Information
    manufacturer = Column(
        String(255), 
        nullable=True,
        comment="Product manufacturer"
    )
    
    brand = Column(
        String(255), 
        nullable=True,
        comment="Product brand"
    )
    
    model = Column(
        String(255), 
        nullable=True,
        comment="Product model"
    )
    
    notes = Column(
        Text, 
        nullable=True,
        comment="Internal notes about product"
    )
    
    # Relationships
    tenant = relationship("Tenant", back_populates="products")
    category = relationship("ProductCategory", back_populates="products")
    invoice_items = relationship("InvoiceItem", back_populates="product")
    
    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', sku='{self.sku}')>"
    
    @property
    def available_quantity(self) -> int:
        """Get available quantity (stock - reserved)"""
        return max(0, self.stock_quantity - self.reserved_quantity)
    
    @property
    def stock_status(self) -> StockStatus:
        """Get current stock status"""
        if not self.track_inventory or self.is_service:
            return StockStatus.IN_STOCK
        
        available = self.available_quantity
        
        if available <= 0:
            return StockStatus.OUT_OF_STOCK
        elif available <= self.min_stock_level:
            return StockStatus.LOW_STOCK
        else:
            return StockStatus.IN_STOCK
    
    @property
    def profit_margin(self) -> Decimal:
        """Calculate profit margin percentage"""
        if not self.cost_price or self.cost_price <= 0:
            return Decimal('0')
        
        profit = self.selling_price - self.cost_price
        return (profit / self.cost_price) * 100
    
    @property
    def is_low_stock(self) -> bool:
        """Check if product is low on stock"""
        return self.stock_status == StockStatus.LOW_STOCK
    
    @property
    def is_out_of_stock(self) -> bool:
        """Check if product is out of stock"""
        return self.stock_status == StockStatus.OUT_OF_STOCK
    
    def add_tag(self, tag: str):
        """Add a tag to product"""
        if not self.tags:
            self.tags = []
        
        if tag not in self.tags:
            self.tags.append(tag)
    
    def remove_tag(self, tag: str):
        """Remove a tag from product"""
        if self.tags and tag in self.tags:
            self.tags.remove(tag)
    
    def has_tag(self, tag: str) -> bool:
        """Check if product has a specific tag"""
        return self.tags and tag in self.tags
    
    def add_image(self, image_url: str):
        """Add an image URL to product"""
        if not self.images:
            self.images = []
        
        if image_url not in self.images:
            self.images.append(image_url)
    
    def remove_image(self, image_url: str):
        """Remove an image URL from product"""
        if self.images and image_url in self.images:
            self.images.remove(image_url)
    
    def adjust_stock(self, quantity: int, reason: str = None):
        """Adjust stock quantity"""
        self.stock_quantity += quantity
        self.stock_quantity = max(0, self.stock_quantity)
        
        # Could log stock movement to separate table
        # StockMovement.create(product_id=self.id, quantity=quantity, reason=reason)
    
    def reserve_stock(self, quantity: int) -> bool:
        """Reserve stock for an order"""
        if self.available_quantity >= quantity:
            self.reserved_quantity += quantity
            return True
        return False
    
    def release_stock(self, quantity: int):
        """Release reserved stock"""
        self.reserved_quantity = max(0, self.reserved_quantity - quantity)
    
    def fulfill_stock(self, quantity: int):
        """Fulfill reserved stock (reduce both reserved and stock)"""
        self.reserved_quantity = max(0, self.reserved_quantity - quantity)
        self.stock_quantity = max(0, self.stock_quantity - quantity)
    
    def calculate_gold_value(self, gold_price_per_gram: Decimal) -> Decimal:
        """Calculate gold value based on current gold price"""
        if not self.is_gold_product or not self.weight_per_unit:
            return Decimal('0')
        
        return self.weight_per_unit * gold_price_per_gram
    
    def activate(self):
        """Activate product"""
        self.status = ProductStatus.ACTIVE
    
    def deactivate(self):
        """Deactivate product"""
        self.status = ProductStatus.INACTIVE
    
    def discontinue(self):
        """Discontinue product"""
        self.status = ProductStatus.DISCONTINUED


# Create indexes for performance optimization
Index('idx_product_tenant_name', Product.tenant_id, Product.name)
Index('idx_product_tenant_sku', Product.tenant_id, Product.sku)
Index('idx_product_tenant_barcode', Product.tenant_id, Product.barcode)
Index('idx_product_tenant_category', Product.tenant_id, Product.category_id)
Index('idx_product_tenant_status', Product.tenant_id, Product.status)
Index('idx_product_stock_quantity', Product.stock_quantity)
Index('idx_product_is_gold', Product.is_gold_product)
# Index('idx_product_tags', Product.tags, postgresql_using='gin')
Index('idx_product_selling_price', Product.selling_price)

Index('idx_category_tenant_name', ProductCategory.tenant_id, ProductCategory.name)
Index('idx_category_parent', ProductCategory.parent_id)