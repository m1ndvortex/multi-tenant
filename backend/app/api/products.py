"""
Product and inventory management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import os
import tempfile
import shutil
import logging

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.exceptions import (
    ValidationError, NotFoundError, BusinessLogicError,
    exception_to_http_exception
)
from app.models.user import User
from app.models.product import Product, ProductCategory
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, ProductListResponse,
    ProductSearchRequest, ProductCategoryCreate, ProductCategoryUpdate,
    ProductCategoryResponse, StockAdjustmentRequest, StockReservationRequest,
    ProductStatsResponse, LowStockAlert, ImageUploadResponse,
    ProductImageRequest
)
from app.services.product_service import ProductService
from app.tasks.media_tasks import process_product_image
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/products", tags=["products"])


# Dependency to get product service
def get_product_service(db: Session = Depends(get_db)) -> ProductService:
    return ProductService(db)


# Product CRUD Endpoints

@router.post("/", response_model=ProductResponse)
async def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Create a new product"""
    try:
        product = product_service.create_product(current_user.tenant_id, product_data)
        return ProductResponse.from_orm(product)
    except (ValidationError, BusinessLogicError) as e:
        raise exception_to_http_exception(e)
    except Exception as e:
        logger.error(f"Failed to create product: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/", response_model=ProductListResponse)
async def search_products(
    query: Optional[str] = Query(None, description="Search query"),
    category_id: Optional[uuid.UUID] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status"),
    is_gold_product: Optional[bool] = Query(None, description="Filter gold products"),
    is_service: Optional[bool] = Query(None, description="Filter services"),
    stock_status: Optional[str] = Query(None, description="Filter by stock status"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
    manufacturer: Optional[str] = Query(None, description="Filter by manufacturer"),
    brand: Optional[str] = Query(None, description="Filter by brand"),
    sort_by: Optional[str] = Query("name", description="Sort field"),
    sort_order: Optional[str] = Query("asc", pattern="^(asc|desc)$", description="Sort order"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Search products with filters and pagination"""
    try:
        search_request = ProductSearchRequest(
            query=query,
            category_id=category_id,
            status=status,
            is_gold_product=is_gold_product,
            is_service=is_service,
            stock_status=stock_status,
            min_price=min_price,
            max_price=max_price,
            manufacturer=manufacturer,
            brand=brand,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            page_size=page_size
        )
        
        products, total = product_service.search_products(current_user.tenant_id, search_request)
        
        # Calculate pagination info
        total_pages = (total + page_size - 1) // page_size
        
        return ProductListResponse(
            products=[ProductResponse.from_orm(product) for product in products],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    except Exception as e:
        logger.error(f"Failed to search products: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Category Management Endpoints (must be before /{product_id} route)

@router.post("/categories", response_model=ProductCategoryResponse)
async def create_category(
    category_data: ProductCategoryCreate,
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Create a new product category"""
    try:
        category = product_service.create_category(current_user.tenant_id, category_data)
        return ProductCategoryResponse.from_orm(category)
    except ValidationError as e:
        raise exception_to_http_exception(e)
    except Exception as e:
        logger.error(f"Failed to create category: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/categories", response_model=List[ProductCategoryResponse])
async def get_categories(
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Get all product categories"""
    try:
        categories = product_service.get_categories(current_user.tenant_id)
        return [ProductCategoryResponse.from_orm(category) for category in categories]
    except Exception as e:
        logger.error(f"Failed to get categories: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/categories/{category_id}", response_model=ProductCategoryResponse)
async def update_category(
    category_id: uuid.UUID,
    category_data: ProductCategoryUpdate,
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Update a product category"""
    try:
        category = product_service.update_category(current_user.tenant_id, category_id, category_data)
        if not category:
            raise NotFoundError("Category not found")
        
        return ProductCategoryResponse.from_orm(category)
    except (ValidationError, NotFoundError) as e:
        raise exception_to_http_exception(e)
    except Exception as e:
        logger.error(f"Failed to update category {category_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Delete a product category"""
    try:
        success = product_service.delete_category(current_user.tenant_id, category_id)
        if not success:
            raise NotFoundError("Category not found")
        
        return {"message": "Category deleted successfully"}
    except (NotFoundError, BusinessLogicError) as e:
        raise exception_to_http_exception(e)
    except Exception as e:
        logger.error(f"Failed to delete category {category_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Analytics and Reporting Endpoints (must be before /{product_id} route)

@router.get("/analytics/stats", response_model=ProductStatsResponse)
async def get_product_stats(
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Get product statistics"""
    try:
        stats = product_service.get_product_stats(current_user.tenant_id)
        return stats
    except Exception as e:
        logger.error(f"Failed to get product stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analytics/low-stock", response_model=List[LowStockAlert])
async def get_low_stock_alerts(
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Get low stock alerts"""
    try:
        alerts = product_service.get_low_stock_alerts(current_user.tenant_id)
        return alerts
    except Exception as e:
        logger.error(f"Failed to get low stock alerts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Bulk Operations (must be before /{product_id} route)

@router.post("/bulk/update")
async def bulk_update_products(
    product_ids: List[uuid.UUID],
    update_data: ProductUpdate,
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Bulk update multiple products"""
    try:
        updated_products = []
        failed_updates = []
        
        for product_id in product_ids:
            try:
                product = product_service.update_product(current_user.tenant_id, product_id, update_data)
                if product:
                    updated_products.append(ProductResponse.from_orm(product))
                else:
                    failed_updates.append({"product_id": str(product_id), "error": "Product not found"})
            except Exception as e:
                failed_updates.append({"product_id": str(product_id), "error": str(e)})
        
        return {
            "message": f"Updated {len(updated_products)} products",
            "updated_products": updated_products,
            "failed_updates": failed_updates
        }
        
    except Exception as e:
        logger.error(f"Failed to bulk update products: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/bulk/delete")
async def bulk_delete_products(
    request: dict,
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Bulk delete multiple products"""
    try:
        product_ids = request.get("product_ids", [])
        if not product_ids:
            raise HTTPException(status_code=400, detail="No product IDs provided")
        
        deleted_products = []
        failed_deletes = []
        
        for product_id in product_ids:
            try:
                success = product_service.delete_product(current_user.tenant_id, product_id)
                if success:
                    deleted_products.append(str(product_id))
                else:
                    failed_deletes.append({"product_id": str(product_id), "error": "Product not found"})
            except Exception as e:
                failed_deletes.append({"product_id": str(product_id), "error": str(e)})
        
        return {
            "message": f"Deleted {len(deleted_products)} products",
            "deleted_products": deleted_products,
            "failed_deletes": failed_deletes
        }
        
    except Exception as e:
        logger.error(f"Failed to bulk delete products: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Get a product by ID"""
    try:
        product = product_service.get_product(current_user.tenant_id, product_id)
        if not product:
            raise NotFoundError("Product not found")
        
        return ProductResponse.from_orm(product)
    except NotFoundError as e:
        raise exception_to_http_exception(e)
    except Exception as e:
        logger.error(f"Failed to get product {product_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: uuid.UUID,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Update a product"""
    try:
        product = product_service.update_product(current_user.tenant_id, product_id, product_data)
        if not product:
            raise NotFoundError("Product not found")
        
        return ProductResponse.from_orm(product)
    except (ValidationError, NotFoundError, BusinessLogicError) as e:
        raise exception_to_http_exception(e)
    except Exception as e:
        logger.error(f"Failed to update product {product_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{product_id}")
async def delete_product(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Delete a product"""
    try:
        success = product_service.delete_product(current_user.tenant_id, product_id)
        if not success:
            raise NotFoundError("Product not found")
        
        return {"message": "Product deleted successfully"}
    except NotFoundError as e:
        raise exception_to_http_exception(e)
    except Exception as e:
        logger.error(f"Failed to delete product {product_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Stock Management Endpoints

@router.post("/{product_id}/stock/adjust", response_model=ProductResponse)
async def adjust_stock(
    product_id: uuid.UUID,
    adjustment: StockAdjustmentRequest,
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Adjust product stock quantity"""
    try:
        product = product_service.adjust_stock(current_user.tenant_id, product_id, adjustment)
        return ProductResponse.from_orm(product)
    except (NotFoundError, BusinessLogicError) as e:
        raise exception_to_http_exception(e)
    except Exception as e:
        logger.error(f"Failed to adjust stock for product {product_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{product_id}/stock/reserve", response_model=ProductResponse)
async def reserve_stock(
    product_id: uuid.UUID,
    reservation: StockReservationRequest,
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Reserve stock for a product"""
    try:
        product = product_service.reserve_stock(current_user.tenant_id, product_id, reservation)
        return ProductResponse.from_orm(product)
    except (NotFoundError, BusinessLogicError) as e:
        raise exception_to_http_exception(e)
    except Exception as e:
        logger.error(f"Failed to reserve stock for product {product_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{product_id}/stock/release")
async def release_stock(
    product_id: uuid.UUID,
    quantity: int = Query(..., gt=0, description="Quantity to release"),
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Release reserved stock"""
    try:
        product = product_service.release_stock(current_user.tenant_id, product_id, quantity)
        return ProductResponse.from_orm(product)
    except (NotFoundError, BusinessLogicError) as e:
        raise exception_to_http_exception(e)
    except Exception as e:
        logger.error(f"Failed to release stock for product {product_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{product_id}/stock/fulfill")
async def fulfill_stock(
    product_id: uuid.UUID,
    quantity: int = Query(..., gt=0, description="Quantity to fulfill"),
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Fulfill reserved stock (reduce both reserved and stock)"""
    try:
        product = product_service.fulfill_stock(current_user.tenant_id, product_id, quantity)
        return ProductResponse.from_orm(product)
    except (NotFoundError, BusinessLogicError) as e:
        raise exception_to_http_exception(e)
    except Exception as e:
        logger.error(f"Failed to fulfill stock for product {product_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Image Management Endpoints

@router.post("/{product_id}/images/upload", response_model=ImageUploadResponse)
async def upload_product_image(
    product_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Upload an image for a product"""
    try:
        # Validate product exists
        product = product_service.get_product(current_user.tenant_id, product_id)
        if not product:
            raise NotFoundError("Product not found")
        
        # Validate file type
        if file.content_type not in settings.allowed_image_types:
            raise ValidationError(f"Unsupported file type: {file.content_type}")
        
        # Validate file size
        if file.size and file.size > settings.max_file_size:
            raise ValidationError(f"File too large. Maximum size: {settings.max_file_size} bytes")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name
        
        # Process image asynchronously
        task = process_product_image.delay(
            temp_path, 
            str(current_user.tenant_id), 
            str(product_id)
        )
        
        return ImageUploadResponse(
            image_url=f"/uploads/{current_user.tenant_id}/products/processing_{task.id}",
            original_filename=file.filename,
            file_size=file.size or 0,
            content_type=file.content_type,
            processing_status="processing"
        )
        
    except (ValidationError, NotFoundError) as e:
        raise exception_to_http_exception(e)
    except Exception as e:
        logger.error(f"Failed to upload image for product {product_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{product_id}/images", response_model=ProductResponse)
async def add_product_images(
    product_id: uuid.UUID,
    image_request: ProductImageRequest,
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Add image URLs to a product"""
    try:
        product = product_service.get_product(current_user.tenant_id, product_id)
        if not product:
            raise NotFoundError("Product not found")
        
        # Add each image URL
        for image_url in image_request.image_urls:
            product = product_service.add_product_image(current_user.tenant_id, product_id, image_url)
        
        return ProductResponse.from_orm(product)
    except (ValidationError, NotFoundError) as e:
        raise exception_to_http_exception(e)
    except Exception as e:
        logger.error(f"Failed to add images to product {product_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{product_id}/images")
async def remove_product_image(
    product_id: uuid.UUID,
    image_url: str = Query(..., description="Image URL to remove"),
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Remove an image from a product"""
    try:
        product = product_service.remove_product_image(current_user.tenant_id, product_id, image_url)
        return ProductResponse.from_orm(product)
    except (ValidationError, NotFoundError) as e:
        raise exception_to_http_exception(e)
    except Exception as e:
        logger.error(f"Failed to remove image from product {product_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Analytics and Reporting Endpoints

@router.get("/analytics/stats", response_model=ProductStatsResponse)
async def get_product_stats(
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Get product statistics"""
    try:
        stats = product_service.get_product_stats(current_user.tenant_id)
        return stats
    except Exception as e:
        logger.error(f"Failed to get product stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analytics/low-stock", response_model=List[LowStockAlert])
async def get_low_stock_alerts(
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Get low stock alerts"""
    try:
        alerts = product_service.get_low_stock_alerts(current_user.tenant_id)
        return alerts
    except Exception as e:
        logger.error(f"Failed to get low stock alerts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Bulk Operations

@router.post("/bulk/update")
async def bulk_update_products(
    product_ids: List[uuid.UUID],
    updates: ProductUpdate,
    current_user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service)
):
    """Bulk update multiple products"""
    try:
        updated_products = []
        failed_updates = []
        
        for product_id in product_ids:
            try:
                product = product_service.update_product(current_user.tenant_id, product_id, update_data)
                if product:
                    updated_products.append(ProductResponse.from_orm(product))
                else:
                    failed_updates.append({"product_id": str(product_id), "error": "Product not found"})
            except Exception as e:
                failed_updates.append({"product_id": str(product_id), "error": str(e)})
        
        return {
            "message": f"Updated {len(updated_products)} products",
            "updated_products": updated_products,
            "failed_updates": failed_updates
        }
        
    except Exception as e:
        logger.error(f"Failed to bulk update products: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
