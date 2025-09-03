"""
Media processing tasks for product images and other media
"""

from celery import current_task
from app.celery_app import celery_app
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.product import Product
import logging
import os
import uuid
from PIL import Image, ImageOps
from typing import Dict, List, Tuple, Optional
import tempfile
import shutil

logger = logging.getLogger(__name__)


class ImageProcessor:
    """Image processing utility class"""
    
    # Image size configurations
    SIZES = {
        'thumbnail': (150, 150),
        'small': (300, 300),
        'medium': (600, 600),
        'large': (1200, 1200)
    }
    
    # Supported formats
    SUPPORTED_FORMATS = ['JPEG', 'PNG', 'WEBP']
    
    # Quality settings
    JPEG_QUALITY = 85
    WEBP_QUALITY = 80
    
    @staticmethod
    def validate_image(file_path: str) -> bool:
        """Validate if file is a valid image"""
        try:
            with Image.open(file_path) as img:
                img.verify()
            return True
        except Exception as e:
            logger.error(f"Image validation failed for {file_path}: {e}")
            return False
    
    @staticmethod
    def get_image_info(file_path: str) -> Dict:
        """Get image information"""
        try:
            with Image.open(file_path) as img:
                return {
                    'format': img.format,
                    'mode': img.mode,
                    'size': img.size,
                    'width': img.width,
                    'height': img.height
                }
        except Exception as e:
            logger.error(f"Failed to get image info for {file_path}: {e}")
            return {}
    
    @staticmethod
    def resize_image(input_path: str, output_path: str, size: Tuple[int, int], 
                    quality: int = 85, format: str = 'JPEG') -> bool:
        """Resize image to specified size"""
        try:
            with Image.open(input_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    if format == 'JPEG':
                        # Create white background for JPEG
                        background = Image.new('RGB', img.size, (255, 255, 255))
                        if img.mode == 'P':
                            img = img.convert('RGBA')
                        background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                        img = background
                    else:
                        img = img.convert('RGBA')
                elif img.mode != 'RGB' and format == 'JPEG':
                    img = img.convert('RGB')
                
                # Resize with high-quality resampling
                img_resized = ImageOps.fit(img, size, Image.Resampling.LANCZOS)
                
                # Save with specified quality
                save_kwargs = {'format': format}
                if format == 'JPEG':
                    save_kwargs['quality'] = quality
                    save_kwargs['optimize'] = True
                elif format == 'WEBP':
                    save_kwargs['quality'] = quality
                    save_kwargs['optimize'] = True
                
                img_resized.save(output_path, **save_kwargs)
                return True
                
        except Exception as e:
            logger.error(f"Failed to resize image {input_path}: {e}")
            return False
    
    @staticmethod
    def optimize_image(input_path: str, output_path: str, max_size: int = 1024, 
                      quality: int = 85) -> bool:
        """Optimize image for web use"""
        try:
            with Image.open(input_path) as img:
                # Get original size
                original_width, original_height = img.size
                
                # Calculate new size if needed
                if max(original_width, original_height) > max_size:
                    if original_width > original_height:
                        new_width = max_size
                        new_height = int((original_height * max_size) / original_width)
                    else:
                        new_height = max_size
                        new_width = int((original_width * max_size) / original_height)
                    
                    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Convert to RGB for JPEG
                if img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Save optimized image
                img.save(output_path, 'JPEG', quality=quality, optimize=True)
                return True
                
        except Exception as e:
            logger.error(f"Failed to optimize image {input_path}: {e}")
            return False


@celery_app.task(bind=True, name="app.tasks.process_product_image")
def process_product_image(self, image_path: str, tenant_id: str, product_id: str = None):
    """Process uploaded product image (resize, optimize, create variants)"""
    try:
        logger.info(f"Processing product image: {image_path} for tenant: {tenant_id}")
        
        # Validate image
        if not ImageProcessor.validate_image(image_path):
            raise ValueError("Invalid image file")
        
        # Get image info
        image_info = ImageProcessor.get_image_info(image_path)
        logger.info(f"Image info: {image_info}")
        
        # Create output directory
        output_dir = os.path.join(settings.upload_path, tenant_id, "products")
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = os.path.splitext(image_path)[1].lower()
        base_filename = str(uuid.uuid4())
        
        processed_images = {}
        
        # Create different sizes
        for size_name, dimensions in ImageProcessor.SIZES.items():
            output_filename = f"{base_filename}_{size_name}.jpg"
            output_path = os.path.join(output_dir, output_filename)
            
            success = ImageProcessor.resize_image(
                image_path, 
                output_path, 
                dimensions, 
                quality=ImageProcessor.JPEG_QUALITY,
                format='JPEG'
            )
            
            if success:
                # Generate URL (this would be actual URL in production)
                image_url = f"/uploads/{tenant_id}/products/{output_filename}"
                processed_images[size_name] = {
                    'url': image_url,
                    'path': output_path,
                    'size': dimensions,
                    'file_size': os.path.getsize(output_path) if os.path.exists(output_path) else 0
                }
                logger.info(f"Created {size_name} variant: {output_path}")
        
        # Create WebP versions for modern browsers
        webp_images = {}
        for size_name, dimensions in ImageProcessor.SIZES.items():
            webp_filename = f"{base_filename}_{size_name}.webp"
            webp_path = os.path.join(output_dir, webp_filename)
            
            success = ImageProcessor.resize_image(
                image_path,
                webp_path,
                dimensions,
                quality=ImageProcessor.WEBP_QUALITY,
                format='WEBP'
            )
            
            if success:
                webp_url = f"/uploads/{tenant_id}/products/{webp_filename}"
                webp_images[size_name] = {
                    'url': webp_url,
                    'path': webp_path,
                    'size': dimensions,
                    'file_size': os.path.getsize(webp_path) if os.path.exists(webp_path) else 0
                }
        
        # Update product with image URLs if product_id provided
        if product_id:
            try:
                db = SessionLocal()
                product = db.query(Product).filter(
                    Product.id == product_id,
                    Product.tenant_id == tenant_id
                ).first()
                
                if product:
                    # Add the medium size image as the main product image
                    main_image_url = processed_images.get('medium', {}).get('url')
                    if main_image_url:
                        if not product.images:
                            product.images = []
                        
                        if main_image_url not in product.images:
                            product.images.append(main_image_url)
                            db.commit()
                            logger.info(f"Added image to product {product_id}")
                
                db.close()
                
            except Exception as e:
                logger.error(f"Failed to update product {product_id} with image: {e}")
        
        # Clean up original file if it's a temporary file
        if image_path.startswith(tempfile.gettempdir()):
            try:
                os.remove(image_path)
            except Exception as e:
                logger.warning(f"Failed to clean up temporary file {image_path}: {e}")
        
        result = {
            "status": "success",
            "original_path": image_path,
            "original_info": image_info,
            "processed_images": processed_images,
            "webp_images": webp_images,
            "tenant_id": tenant_id,
            "product_id": product_id,
            "message": "Product image processed successfully"
        }
        
        logger.info(f"Successfully processed product image for tenant {tenant_id}")
        return result
        
    except Exception as exc:
        logger.error(f"Product image processing failed for {image_path}: {exc}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@celery_app.task(bind=True, name="app.tasks.optimize_existing_images")
def optimize_existing_images(self, tenant_id: str):
    """Optimize all existing product images for a tenant"""
    try:
        logger.info(f"Optimizing existing images for tenant: {tenant_id}")
        
        db = SessionLocal()
        
        # Get all products with images for the tenant
        products = db.query(Product).filter(
            Product.tenant_id == tenant_id,
            Product.is_active == True,
            Product.images.isnot(None)
        ).all()
        
        optimized_count = 0
        failed_count = 0
        
        for product in products:
            if not product.images:
                continue
                
            try:
                # Process each image
                for image_url in product.images:
                    # Convert URL to file path (this is simplified)
                    if image_url.startswith('/uploads/'):
                        image_path = os.path.join(settings.upload_path, image_url[9:])  # Remove '/uploads/'
                        
                        if os.path.exists(image_path):
                            # Create optimized version
                            optimized_path = image_path.replace('.jpg', '_optimized.jpg')
                            
                            if ImageProcessor.optimize_image(image_path, optimized_path):
                                # Replace original with optimized version
                                shutil.move(optimized_path, image_path)
                                optimized_count += 1
                                logger.info(f"Optimized image: {image_path}")
                            else:
                                failed_count += 1
                                logger.error(f"Failed to optimize image: {image_path}")
                        else:
                            logger.warning(f"Image file not found: {image_path}")
                            failed_count += 1
                            
            except Exception as e:
                logger.error(f"Failed to process images for product {product.id}: {e}")
                failed_count += 1
        
        db.close()
        
        result = {
            "status": "success",
            "tenant_id": tenant_id,
            "optimized_count": optimized_count,
            "failed_count": failed_count,
            "message": f"Optimized {optimized_count} images, {failed_count} failed"
        }
        
        logger.info(f"Completed image optimization for tenant {tenant_id}: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Image optimization failed for tenant {tenant_id}: {exc}")
        raise self.retry(exc=exc, countdown=120, max_retries=2)


@celery_app.task(bind=True, name="app.tasks.cleanup_unused_images")
def cleanup_unused_images(self, tenant_id: str):
    """Clean up unused product images for a tenant"""
    try:
        logger.info(f"Cleaning up unused images for tenant: {tenant_id}")
        
        db = SessionLocal()
        
        # Get all image URLs used by products
        products = db.query(Product).filter(
            Product.tenant_id == tenant_id,
            Product.is_active == True
        ).all()
        
        used_images = set()
        for product in products:
            if product.images:
                used_images.update(product.images)
        
        # Get all image files in tenant's directory
        tenant_images_dir = os.path.join(settings.upload_path, tenant_id, "products")
        
        if not os.path.exists(tenant_images_dir):
            logger.info(f"No images directory found for tenant {tenant_id}")
            db.close()
            return {"status": "success", "deleted_count": 0, "message": "No images directory found"}
        
        deleted_count = 0
        total_size_freed = 0
        
        for filename in os.listdir(tenant_images_dir):
            file_path = os.path.join(tenant_images_dir, filename)
            
            if os.path.isfile(file_path):
                # Check if this image is used by any product
                image_url = f"/uploads/{tenant_id}/products/{filename}"
                
                if image_url not in used_images:
                    try:
                        file_size = os.path.getsize(file_path)
                        os.remove(file_path)
                        deleted_count += 1
                        total_size_freed += file_size
                        logger.info(f"Deleted unused image: {file_path}")
                    except Exception as e:
                        logger.error(f"Failed to delete image {file_path}: {e}")
        
        db.close()
        
        result = {
            "status": "success",
            "tenant_id": tenant_id,
            "deleted_count": deleted_count,
            "size_freed_bytes": total_size_freed,
            "size_freed_mb": round(total_size_freed / (1024 * 1024), 2),
            "message": f"Deleted {deleted_count} unused images, freed {round(total_size_freed / (1024 * 1024), 2)} MB"
        }
        
        logger.info(f"Completed image cleanup for tenant {tenant_id}: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Image cleanup failed for tenant {tenant_id}: {exc}")
        raise self.retry(exc=exc, countdown=120, max_retries=2)


@celery_app.task(bind=True, name="app.tasks.generate_report")
def generate_report(self, report_type: str, tenant_id: str, parameters: dict):
    """Generate business reports"""
    try:
        logger.info(f"Generating {report_type} report for tenant: {tenant_id}")
        
        # This will be implemented when reporting is added
        # For now, return a placeholder response
        
        return {
            "status": "success",
            "report_type": report_type,
            "tenant_id": tenant_id,
            "report_file": f"{report_type}_report.pdf",
            "message": "Report generated successfully"
        }
        
    except Exception as exc:
        logger.error(f"Report generation failed for {report_type}: {exc}")
        raise self.retry(exc=exc, countdown=120, max_retries=2)