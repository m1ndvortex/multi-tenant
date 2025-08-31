"""
Application configuration settings
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, Optional
import os


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Application
    app_name: str = "HesaabPlus API"
    app_version: str = "2.0.0"
    debug: bool = Field(default=False, env="DEBUG")
    
    # Database
    database_url: str = Field(env="DATABASE_URL")
    database_echo: bool = Field(default=False, env="DATABASE_ECHO")
    
    # Redis
    redis_url: str = Field(env="REDIS_URL")
    
    # Security
    jwt_secret_key: str = Field(env="JWT_SECRET_KEY")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    
    # CORS
    cors_origins: List[str] = [
        "http://localhost:3000",  # Super Admin Frontend
        "http://localhost:3001",  # Tenant Frontend
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]
    
    # Cloud Storage - Cloudflare R2
    cloudflare_r2_access_key: Optional[str] = Field(default=None, env="CLOUDFLARE_R2_ACCESS_KEY")
    cloudflare_r2_secret_key: Optional[str] = Field(default=None, env="CLOUDFLARE_R2_SECRET_KEY")
    cloudflare_r2_bucket: Optional[str] = Field(default=None, env="CLOUDFLARE_R2_BUCKET")
    cloudflare_r2_endpoint: Optional[str] = Field(default=None, env="CLOUDFLARE_R2_ENDPOINT")
    
    # Cloud Storage - Backblaze B2
    backblaze_b2_access_key: Optional[str] = Field(default=None, env="BACKBLAZE_B2_ACCESS_KEY")
    backblaze_b2_secret_key: Optional[str] = Field(default=None, env="BACKBLAZE_B2_SECRET_KEY")
    backblaze_b2_bucket: Optional[str] = Field(default=None, env="BACKBLAZE_B2_BUCKET")
    
    # Email Configuration
    email_smtp_host: Optional[str] = Field(default=None, env="EMAIL_SMTP_HOST")
    email_smtp_port: int = Field(default=587, env="EMAIL_SMTP_PORT")
    email_username: Optional[str] = Field(default=None, env="EMAIL_USERNAME")
    email_password: Optional[str] = Field(default=None, env="EMAIL_PASSWORD")
    email_from_name: str = "HesaabPlus"
    email_from_email: Optional[str] = Field(default=None, env="EMAIL_FROM_EMAIL")
    
    # SMS Configuration
    sms_api_key: Optional[str] = Field(default=None, env="SMS_API_KEY")
    sms_api_url: Optional[str] = Field(default=None, env="SMS_API_URL")
    
    # File Upload
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    allowed_image_types: List[str] = ["image/jpeg", "image/png", "image/webp"]
    upload_path: str = "/app/uploads"
    
    # Celery
    celery_broker_url: str = Field(default="redis://redis:6379/0", env="REDIS_URL")
    celery_result_backend: str = Field(default="redis://redis:6379/0", env="REDIS_URL")
    
    # Pagination
    default_page_size: int = 20
    max_page_size: int = 100
    
    # Multi-tenancy
    super_admin_email: str = Field(default="admin@hesaabplus.com", env="SUPER_ADMIN_EMAIL")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()