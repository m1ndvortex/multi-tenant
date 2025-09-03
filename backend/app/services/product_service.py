"""
Product and inventory management service
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc
from typing import List, Optional, Dict, Any, Tuple
from decimal import Decimal
import uuid
import logging

from app.models.product import Product, ProductCategory, ProductStatus, StockStatus
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductSearchRequest,
    ProductCategoryCreate, ProductCategoryUpdate,
    StockAdjustmentRequest, StockReservationRequest,
    ProductStatsResponse, LowStockAlert
)
from app.core.exceptions import ValidationError, NotFoundError, BusinessLogicError

logger = logging.getLogger(__name__)


class ProductService:
    """Service for product and inventory management"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # Product CRUD Operations
    
    def create_product(self, tenant_id: uuid.UUID, product_data: ProductCreate) -> Product:
        """Create a new product"""
        try:
            # Check if SKU is unique within tenant (if provided)
            if product_data.sku:
                existing_product = self.db.query(Product).filter(
                    Product.tenant_id == tenant_id,
                    Product.sku == product_data.sku,
                    Product.is_active == True
                ).first()
                
                if existing_product:
                    raise ValidationError(f"Product with SKU '{product_data.sku}' already exists")
            
            # Check if barcode is unique within tenant (if provided)
            if product_data.barcode:
                existing_product = self.db.query(Product).filter(
                    Product.tenant_id == tenant_id,
                    Product.barcode == product_data.barcode,
                    Product.is_active == True
                ).first()
                
                if existing_product:
                    raise ValidationError(f"Product with barcode '{product_data.barcode}' already exists")
            
            # Validate category exists if provided
            if product_data.category_id:
                category = self.db.query(ProductCategory).filter(
                    ProductCategory.tenant_id == tenant_id,
                    ProductCategory.id == product_data.category_id,
                    ProductCategory.is_active == True
                ).first()
                
                if not category:
                    raise ValidationError("Invalid category ID")
            
            # Create product
            product = Product(
                tenant_id=tenant_id,
                **product_data.dict()
            )
            
            self.db.add(product)
            self.db.commit()
            self.db.refresh(product)
            
            logger.info(f"Created product {product.id} for tenant {tenant_id}")
            return product
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create product for tenant {tenant_id}: {e}")
            raise
    
    def get_product(self, tenant_id: uuid.UUID, product_id: uuid.UUID) -> Optional[Product]:
        """Get a product by ID"""
        return self.db.query(Product).filter(
            Product.tenant_id == tenant_id,
            Product.id == product_id,
            Product.is_active == True
        ).first()
    
    def update_product(self, tenant_id: uuid.UUID, product_id: uuid.UUID, 
                      product_data: ProductUpdate) -> Optional[Product]:
        """Update a product"""
        try:
            product = self.get_product(tenant_id, product_id)
            if not product:
                raise NotFoundError("Product not found")
            
            # Check SKU uniqueness if being updated
            if product_data.sku and product_data.sku != product.sku:
                existing_product = self.db.query(Product).filter(
                    Product.tenant_id == tenant_id,
                    Product.sku == product_data.sku,
                    Product.is_active == True,
                    Product.id != product_id
                ).first()
                
                if existing_product:
                    raise ValidationError(f"Product with SKU '{product_data.sku}' already exists")
            
            # Check barcode uniqueness if being updated
            if product_data.barcode and product_data.barcode != product.barcode:
                existing_product = self.db.query(Product).filter(
                    Product.tenant_id == tenant_id,
                    Product.barcode == product_data.barcode,
                    Product.is_active == True,
                    Product.id != product_id
                ).first()
                
                if existing_product:
                    raise ValidationError(f"Product with barcode '{product_data.barcode}' already exists")
            
            # Validate category if being updated
            if product_data.category_id:
                category = self.db.query(ProductCategory).filter(
                    ProductCategory.tenant_id == tenant_id,
                    ProductCategory.id == product_data.category_id,
                    ProductCategory.is_active == True
                ).first()
                
                if not category:
                    raise ValidationError("Invalid category ID")
            
            # Update product fields
            update_data = product_data.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(product, field, value)
            
            self.db.commit()
            self.db.refresh(product)
            
            logger.info(f"Updated product {product_id} for tenant {tenant_id}")
            return product
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update product {product_id} for tenant {tenant_id}: {e}")
            raise
    
    def delete_product(self, tenant_id: uuid.UUID, product_id: uuid.UUID) -> bool:
        """Soft delete a product"""
        try:
            product = self.get_product(tenant_id, product_id)
            if not product:
                raise NotFoundError("Product not found")
            
            product.is_active = False
            self.db.commit()
            
            logger.info(f"Deleted product {product_id} for tenant {tenant_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to delete product {product_id} for tenant {tenant_id}: {e}")
            raise
    
    def search_products(self, tenant_id: uuid.UUID, 
                       search_request: ProductSearchRequest) -> Tuple[List[Product], int]:
        """Search products with filters and pagination"""
        try:
            query = self.db.query(Product).filter(
                Product.tenant_id == tenant_id,
                Product.is_active == True
            )
            
            # Apply filters
            if search_request.query:
                search_term = f"%{search_request.query}%"
                query = query.filter(
                    or_(
                        Product.name.ilike(search_term),
                        Product.description.ilike(search_term),
                        Product.sku.ilike(search_term),
                        Product.barcode.ilike(search_term),
                        Product.manufacturer.ilike(search_term),
                        Product.brand.ilike(search_term),
                        Product.model.ilike(search_term)
                    )
                )
            
            if search_request.category_id:
                query = query.filter(Product.category_id == search_request.category_id)
            
            if search_request.tags:
                # Filter products that have any of the specified tags
                for tag in search_request.tags:
                    query = query.filter(Product.tags.contains([tag]))
            
            if search_request.status:
                query = query.filter(Product.status == search_request.status)
            
            if search_request.is_gold_product is not None:
                query = query.filter(Product.is_gold_product == search_request.is_gold_product)
            
            if search_request.is_service is not None:
                query = query.filter(Product.is_service == search_request.is_service)
            
            if search_request.min_price is not None:
                query = query.filter(Product.selling_price >= search_request.min_price)
            
            if search_request.max_price is not None:
                query = query.filter(Product.selling_price <= search_request.max_price)
            
            if search_request.manufacturer:
                query = query.filter(Product.manufacturer.ilike(f"%{search_request.manufacturer}%"))
            
            if search_request.brand:
                query = query.filter(Product.brand.ilike(f"%{search_request.brand}%"))
            
            # Apply stock status filter
            if search_request.stock_status:
                if search_request.stock_status == StockStatus.OUT_OF_STOCK:
                    query = query.filter(
                        and_(
                            Product.track_inventory == True,
                            Product.is_service == False,
                            (Product.stock_quantity - Product.reserved_quantity) <= 0
                        )
                    )
                elif search_request.stock_status == StockStatus.LOW_STOCK:
                    query = query.filter(
                        and_(
                            Product.track_inventory == True,
                            Product.is_service == False,
                            (Product.stock_quantity - Product.reserved_quantity) > 0,
                            (Product.stock_quantity - Product.reserved_quantity) <= Product.min_stock_level
                        )
                    )
                elif search_request.stock_status == StockStatus.IN_STOCK:
                    query = query.filter(
                        or_(
                            Product.track_inventory == False,
                            Product.is_service == True,
                            (Product.stock_quantity - Product.reserved_quantity) > Product.min_stock_level
                        )
                    )
            
            # Get total count before pagination
            total = query.count()
            
            # Apply sorting
            if search_request.sort_by:
                sort_field = getattr(Product, search_request.sort_by, None)
                if sort_field:
                    if search_request.sort_order == "desc":
                        query = query.order_by(desc(sort_field))
                    else:
                        query = query.order_by(asc(sort_field))
                else:
                    query = query.order_by(Product.name)
            else:
                query = query.order_by(Product.name)
            
            # Apply pagination
            offset = (search_request.page - 1) * search_request.page_size
            products = query.offset(offset).limit(search_request.page_size).all()
            
            return products, total
            
        except Exception as e:
            logger.error(f"Failed to search products for tenant {tenant_id}: {e}")
            raise
    
    # Stock Management
    
    def adjust_stock(self, tenant_id: uuid.UUID, product_id: uuid.UUID,
                    adjustment: StockAdjustmentRequest) -> Product:
        """Adjust product stock quantity"""
        try:
            product = self.get_product(tenant_id, product_id)
            if not product:
                raise NotFoundError("Product not found")
            
            if not product.track_inventory:
                raise BusinessLogicError("Cannot adjust stock for products that don't track inventory")
            
            if product.is_service:
                raise BusinessLogicError("Cannot adjust stock for service products")
            
            # Calculate new stock quantity
            new_quantity = product.stock_quantity + adjustment.quantity
            
            if new_quantity < 0:
                raise BusinessLogicError("Stock quantity cannot be negative")
            
            # Check if reserved quantity would exceed new stock
            if product.reserved_quantity > new_quantity:
                raise BusinessLogicError("Cannot reduce stock below reserved quantity")
            
            product.stock_quantity = new_quantity
            self.db.commit()
            self.db.refresh(product)
            
            logger.info(f"Adjusted stock for product {product_id} by {adjustment.quantity}")
            return product
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to adjust stock for product {product_id}: {e}")
            raise
    
    def reserve_stock(self, tenant_id: uuid.UUID, product_id: uuid.UUID,
                     reservation: StockReservationRequest) -> Product:
        """Reserve stock for a product"""
        try:
            product = self.get_product(tenant_id, product_id)
            if not product:
                raise NotFoundError("Product not found")
            
            if not product.track_inventory:
                raise BusinessLogicError("Cannot reserve stock for products that don't track inventory")
            
            if product.is_service:
                raise BusinessLogicError("Cannot reserve stock for service products")
            
            available_quantity = product.stock_quantity - product.reserved_quantity
            
            if available_quantity < reservation.quantity:
                raise BusinessLogicError(f"Insufficient stock. Available: {available_quantity}, Requested: {reservation.quantity}")
            
            product.reserved_quantity += reservation.quantity
            self.db.commit()
            self.db.refresh(product)
            
            logger.info(f"Reserved {reservation.quantity} units for product {product_id}")
            return product
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to reserve stock for product {product_id}: {e}")
            raise
    
    def release_stock(self, tenant_id: uuid.UUID, product_id: uuid.UUID, quantity: int) -> Product:
        """Release reserved stock"""
        try:
            product = self.get_product(tenant_id, product_id)
            if not product:
                raise NotFoundError("Product not found")
            
            if quantity > product.reserved_quantity:
                raise BusinessLogicError(f"Cannot release more than reserved. Reserved: {product.reserved_quantity}, Requested: {quantity}")
            
            product.reserved_quantity -= quantity
            self.db.commit()
            self.db.refresh(product)
            
            logger.info(f"Released {quantity} reserved units for product {product_id}")
            return product
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to release stock for product {product_id}: {e}")
            raise
    
    def fulfill_stock(self, tenant_id: uuid.UUID, product_id: uuid.UUID, quantity: int) -> Product:
        """Fulfill reserved stock (reduce both reserved and stock)"""
        try:
            product = self.get_product(tenant_id, product_id)
            if not product:
                raise NotFoundError("Product not found")
            
            if quantity > product.reserved_quantity:
                raise BusinessLogicError(f"Cannot fulfill more than reserved. Reserved: {product.reserved_quantity}, Requested: {quantity}")
            
            if quantity > product.stock_quantity:
                raise BusinessLogicError(f"Cannot fulfill more than available stock. Stock: {product.stock_quantity}, Requested: {quantity}")
            
            product.reserved_quantity -= quantity
            product.stock_quantity -= quantity
            self.db.commit()
            self.db.refresh(product)
            
            logger.info(f"Fulfilled {quantity} units for product {product_id}")
            return product
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to fulfill stock for product {product_id}: {e}")
            raise
    
    # Product Categories
    
    def create_category(self, tenant_id: uuid.UUID, category_data: ProductCategoryCreate) -> ProductCategory:
        """Create a new product category"""
        try:
            # Check if category name is unique within tenant
            existing_category = self.db.query(ProductCategory).filter(
                ProductCategory.tenant_id == tenant_id,
                ProductCategory.name == category_data.name,
                ProductCategory.is_active == True
            ).first()
            
            if existing_category:
                raise ValidationError(f"Category with name '{category_data.name}' already exists")
            
            # Validate parent category if provided
            if category_data.parent_id:
                parent_category = self.db.query(ProductCategory).filter(
                    ProductCategory.tenant_id == tenant_id,
                    ProductCategory.id == category_data.parent_id,
                    ProductCategory.is_active == True
                ).first()
                
                if not parent_category:
                    raise ValidationError("Invalid parent category ID")
            
            category = ProductCategory(
                tenant_id=tenant_id,
                **category_data.dict()
            )
            
            self.db.add(category)
            self.db.commit()
            self.db.refresh(category)
            
            logger.info(f"Created category {category.id} for tenant {tenant_id}")
            return category
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create category for tenant {tenant_id}: {e}")
            raise
    
    def get_categories(self, tenant_id: uuid.UUID) -> List[ProductCategory]:
        """Get all categories for a tenant"""
        return self.db.query(ProductCategory).filter(
            ProductCategory.tenant_id == tenant_id,
            ProductCategory.is_active == True
        ).order_by(ProductCategory.sort_order, ProductCategory.name).all()
    
    def update_category(self, tenant_id: uuid.UUID, category_id: uuid.UUID,
                       category_data: ProductCategoryUpdate) -> Optional[ProductCategory]:
        """Update a product category"""
        try:
            category = self.db.query(ProductCategory).filter(
                ProductCategory.tenant_id == tenant_id,
                ProductCategory.id == category_id,
                ProductCategory.is_active == True
            ).first()
            
            if not category:
                raise NotFoundError("Category not found")
            
            # Check name uniqueness if being updated
            if category_data.name and category_data.name != category.name:
                existing_category = self.db.query(ProductCategory).filter(
                    ProductCategory.tenant_id == tenant_id,
                    ProductCategory.name == category_data.name,
                    ProductCategory.is_active == True,
                    ProductCategory.id != category_id
                ).first()
                
                if existing_category:
                    raise ValidationError(f"Category with name '{category_data.name}' already exists")
            
            # Validate parent category if being updated
            if category_data.parent_id:
                # Prevent circular references
                if category_data.parent_id == category_id:
                    raise ValidationError("Category cannot be its own parent")
                
                parent_category = self.db.query(ProductCategory).filter(
                    ProductCategory.tenant_id == tenant_id,
                    ProductCategory.id == category_data.parent_id,
                    ProductCategory.is_active == True
                ).first()
                
                if not parent_category:
                    raise ValidationError("Invalid parent category ID")
            
            # Update category fields
            update_data = category_data.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(category, field, value)
            
            self.db.commit()
            self.db.refresh(category)
            
            logger.info(f"Updated category {category_id} for tenant {tenant_id}")
            return category
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update category {category_id} for tenant {tenant_id}: {e}")
            raise
    
    def delete_category(self, tenant_id: uuid.UUID, category_id: uuid.UUID) -> bool:
        """Soft delete a product category"""
        try:
            category = self.db.query(ProductCategory).filter(
                ProductCategory.tenant_id == tenant_id,
                ProductCategory.id == category_id,
                ProductCategory.is_active == True
            ).first()
            
            if not category:
                raise NotFoundError("Category not found")
            
            # Check if category has products
            products_count = self.db.query(Product).filter(
                Product.tenant_id == tenant_id,
                Product.category_id == category_id,
                Product.is_active == True
            ).count()
            
            if products_count > 0:
                raise BusinessLogicError(f"Cannot delete category with {products_count} products")
            
            # Check if category has child categories
            children_count = self.db.query(ProductCategory).filter(
                ProductCategory.tenant_id == tenant_id,
                ProductCategory.parent_id == category_id,
                ProductCategory.is_active == True
            ).count()
            
            if children_count > 0:
                raise BusinessLogicError(f"Cannot delete category with {children_count} child categories")
            
            category.is_active = False
            self.db.commit()
            
            logger.info(f"Deleted category {category_id} for tenant {tenant_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to delete category {category_id} for tenant {tenant_id}: {e}")
            raise
    
    # Analytics and Reporting
    
    def get_product_stats(self, tenant_id: uuid.UUID) -> ProductStatsResponse:
        """Get product statistics for a tenant"""
        try:
            # Basic counts
            total_products = self.db.query(Product).filter(
                Product.tenant_id == tenant_id,
                Product.is_active == True
            ).count()
            
            active_products = self.db.query(Product).filter(
                Product.tenant_id == tenant_id,
                Product.status == ProductStatus.ACTIVE,
                Product.is_active == True
            ).count()
            
            inactive_products = self.db.query(Product).filter(
                Product.tenant_id == tenant_id,
                Product.status == ProductStatus.INACTIVE,
                Product.is_active == True
            ).count()
            
            discontinued_products = self.db.query(Product).filter(
                Product.tenant_id == tenant_id,
                Product.status == ProductStatus.DISCONTINUED,
                Product.is_active == True
            ).count()
            
            gold_products = self.db.query(Product).filter(
                Product.tenant_id == tenant_id,
                Product.is_gold_product == True,
                Product.is_active == True
            ).count()
            
            service_products = self.db.query(Product).filter(
                Product.tenant_id == tenant_id,
                Product.is_service == True,
                Product.is_active == True
            ).count()
            
            # Stock status counts
            low_stock_products = self.db.query(Product).filter(
                Product.tenant_id == tenant_id,
                Product.track_inventory == True,
                Product.is_service == False,
                Product.is_active == True,
                (Product.stock_quantity - Product.reserved_quantity) > 0,
                (Product.stock_quantity - Product.reserved_quantity) <= Product.min_stock_level
            ).count()
            
            out_of_stock_products = self.db.query(Product).filter(
                Product.tenant_id == tenant_id,
                Product.track_inventory == True,
                Product.is_service == False,
                Product.is_active == True,
                (Product.stock_quantity - Product.reserved_quantity) <= 0
            ).count()
            
            # Calculate total inventory value
            inventory_value_result = self.db.query(
                func.sum(Product.stock_quantity * Product.selling_price)
            ).filter(
                Product.tenant_id == tenant_id,
                Product.track_inventory == True,
                Product.is_service == False,
                Product.is_active == True
            ).scalar()
            
            total_inventory_value = inventory_value_result or Decimal('0')
            
            # Categories count
            categories_count = self.db.query(ProductCategory).filter(
                ProductCategory.tenant_id == tenant_id,
                ProductCategory.is_active == True
            ).count()
            
            return ProductStatsResponse(
                total_products=total_products,
                active_products=active_products,
                inactive_products=inactive_products,
                discontinued_products=discontinued_products,
                gold_products=gold_products,
                service_products=service_products,
                low_stock_products=low_stock_products,
                out_of_stock_products=out_of_stock_products,
                total_inventory_value=total_inventory_value,
                categories_count=categories_count
            )
            
        except Exception as e:
            logger.error(f"Failed to get product stats for tenant {tenant_id}: {e}")
            raise
    
    def get_low_stock_alerts(self, tenant_id: uuid.UUID) -> List[LowStockAlert]:
        """Get low stock alerts for a tenant"""
        try:
            products = self.db.query(Product).filter(
                Product.tenant_id == tenant_id,
                Product.track_inventory == True,
                Product.is_service == False,
                Product.is_active == True,
                or_(
                    (Product.stock_quantity - Product.reserved_quantity) <= 0,
                    and_(
                        (Product.stock_quantity - Product.reserved_quantity) > 0,
                        (Product.stock_quantity - Product.reserved_quantity) <= Product.min_stock_level
                    )
                )
            ).all()
            
            alerts = []
            for product in products:
                available_quantity = product.stock_quantity - product.reserved_quantity
                
                if available_quantity <= 0:
                    stock_status = StockStatus.OUT_OF_STOCK
                elif available_quantity <= product.min_stock_level:
                    stock_status = StockStatus.LOW_STOCK
                else:
                    continue  # Should not happen due to filter, but safety check
                
                alerts.append(LowStockAlert(
                    product_id=product.id,
                    product_name=product.name,
                    sku=product.sku,
                    current_stock=product.stock_quantity,
                    min_stock_level=product.min_stock_level,
                    available_quantity=available_quantity,
                    stock_status=stock_status
                ))
            
            return alerts
            
        except Exception as e:
            logger.error(f"Failed to get low stock alerts for tenant {tenant_id}: {e}")
            raise
    
    # Image Management
    
    def add_product_image(self, tenant_id: uuid.UUID, product_id: uuid.UUID, image_url: str) -> Product:
        """Add an image to a product"""
        try:
            product = self.get_product(tenant_id, product_id)
            if not product:
                raise NotFoundError("Product not found")
            
            if not product.images:
                product.images = []
            
            if image_url not in product.images:
                product.images.append(image_url)
                self.db.commit()
                self.db.refresh(product)
            
            logger.info(f"Added image to product {product_id}")
            return product
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to add image to product {product_id}: {e}")
            raise
    
    def remove_product_image(self, tenant_id: uuid.UUID, product_id: uuid.UUID, image_url: str) -> Product:
        """Remove an image from a product"""
        try:
            product = self.get_product(tenant_id, product_id)
            if not product:
                raise NotFoundError("Product not found")
            
            if product.images and image_url in product.images:
                product.images.remove(image_url)
                self.db.commit()
                self.db.refresh(product)
            
            logger.info(f"Removed image from product {product_id}")
            return product
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to remove image from product {product_id}: {e}")
            raise