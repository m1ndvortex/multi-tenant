"""
Pydantic schemas for user management API
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, validator, Field
from datetime import datetime
from enum import Enum
import uuid

from ..models.user import UserRole, UserStatus


class UserBase(BaseModel):
    """Base user schema with common fields"""
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    language: Optional[str] = Field("fa", max_length=10)
    timezone: Optional[str] = Field("Asia/Tehran", max_length=50)


class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = Field(UserRole.USER)
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        # Check for at least one letter and one number
        has_letter = any(c.isalpha() for c in v)
        has_number = any(c.isdigit() for c in v)
        
        if not (has_letter and has_number):
            raise ValueError('Password must contain at least one letter and one number')
        
        return v
    
    @validator('phone')
    def validate_phone(cls, v):
        """Validate phone number format"""
        if v is None:
            return v
        
        # Remove spaces and common separators
        cleaned = v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        
        # Check if it's a valid Iranian phone number or international format
        if cleaned.startswith('+98'):
            # Iranian international format
            if len(cleaned) != 13 or not cleaned[3:].isdigit():
                raise ValueError('Invalid Iranian international phone number format')
        elif cleaned.startswith('09'):
            # Iranian mobile format
            if len(cleaned) != 11 or not cleaned.isdigit():
                raise ValueError('Invalid Iranian mobile phone number format')
        elif cleaned.startswith('0'):
            # Iranian landline format
            if len(cleaned) < 8 or len(cleaned) > 11 or not cleaned.isdigit():
                raise ValueError('Invalid Iranian phone number format')
        else:
            # International format
            if not cleaned.startswith('+') or len(cleaned) < 10:
                raise ValueError('Invalid international phone number format')
        
        return v


class UserUpdate(BaseModel):
    """Schema for updating user information"""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    language: Optional[str] = Field(None, max_length=10)
    timezone: Optional[str] = Field(None, max_length=50)
    password: Optional[str] = Field(None, min_length=8, max_length=128)
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength if provided"""
        if v is None:
            return v
        
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        # Check for at least one letter and one number
        has_letter = any(c.isalpha() for c in v)
        has_number = any(c.isdigit() for c in v)
        
        if not (has_letter and has_number):
            raise ValueError('Password must contain at least one letter and one number')
        
        return v
    
    @validator('phone')
    def validate_phone(cls, v):
        """Validate phone number format if provided"""
        if v is None:
            return v
        
        # Same validation as UserCreate
        cleaned = v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        
        if cleaned.startswith('+98'):
            if len(cleaned) != 13 or not cleaned[3:].isdigit():
                raise ValueError('Invalid Iranian international phone number format')
        elif cleaned.startswith('09'):
            if len(cleaned) != 11 or not cleaned.isdigit():
                raise ValueError('Invalid Iranian mobile phone number format')
        elif cleaned.startswith('0'):
            if len(cleaned) < 8 or len(cleaned) > 11 or not cleaned.isdigit():
                raise ValueError('Invalid Iranian phone number format')
        else:
            if not cleaned.startswith('+') or len(cleaned) < 10:
                raise ValueError('Invalid international phone number format')
        
        return v


class UserResponse(BaseModel):
    """Schema for user response data"""
    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    full_name: str
    phone: Optional[str]
    role: UserRole
    status: UserStatus
    language: str
    timezone: str
    is_email_verified: bool
    last_login_at: Optional[datetime]
    last_activity_at: Optional[datetime]
    login_count: int
    created_at: datetime
    updated_at: datetime
    is_online: bool
    
    class Config:
        from_attributes = True
        
    @validator('full_name', pre=True, always=True)
    def set_full_name(cls, v, values):
        """Set full name from first and last name"""
        first_name = values.get('first_name', '')
        last_name = values.get('last_name', '')
        return f"{first_name} {last_name}".strip()


class UserListResponse(BaseModel):
    """Schema for paginated user list response"""
    users: List[UserResponse]
    total: int
    skip: int
    limit: int
    max_users: int
    subscription_type: str


class UserActivityLog(BaseModel):
    """Schema for user activity log entries"""
    id: uuid.UUID
    user_id: uuid.UUID
    action: str
    details: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class RolePermissions(BaseModel):
    """Schema for role permissions information"""
    role: UserRole
    description: str
    permissions: Dict[str, List[str]]


class UserSessionInfo(BaseModel):
    """Schema for active user session information"""
    user_id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    last_activity_at: Optional[datetime]
    is_online: bool


class UserInvitation(BaseModel):
    """Schema for user invitation"""
    email: EmailStr
    role: UserRole = Field(UserRole.USER)
    message: Optional[str] = Field(None, max_length=500)
    
    @validator('message')
    def validate_message(cls, v):
        """Validate invitation message"""
        if v is not None and len(v.strip()) == 0:
            return None
        return v


class PasswordChangeRequest(BaseModel):
    """Schema for password change request"""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
    
    @validator('new_password')
    def validate_new_password(cls, v):
        """Validate new password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        # Check for at least one letter and one number
        has_letter = any(c.isalpha() for c in v)
        has_number = any(c.isdigit() for c in v)
        
        if not (has_letter and has_number):
            raise ValueError('Password must contain at least one letter and one number')
        
        return v


class UserPreferences(BaseModel):
    """Schema for user preferences"""
    language: str = Field("fa", max_length=10)
    timezone: str = Field("Asia/Tehran", max_length=50)
    email_notifications: bool = Field(True)
    sms_notifications: bool = Field(True)
    dashboard_layout: Optional[str] = Field(None, max_length=50)
    theme: Optional[str] = Field("light", max_length=20)
    
    @validator('language')
    def validate_language(cls, v):
        """Validate language code"""
        allowed_languages = ['fa', 'en', 'ar']
        if v not in allowed_languages:
            raise ValueError(f'Language must be one of: {", ".join(allowed_languages)}')
        return v
    
    @validator('timezone')
    def validate_timezone(cls, v):
        """Validate timezone"""
        # Common timezones for the region
        allowed_timezones = [
            'Asia/Tehran', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Riyadh',
            'UTC', 'Europe/London', 'Europe/Berlin', 'America/New_York'
        ]
        if v not in allowed_timezones:
            raise ValueError(f'Timezone must be one of: {", ".join(allowed_timezones)}')
        return v
    
    @validator('theme')
    def validate_theme(cls, v):
        """Validate theme"""
        if v is None:
            return v
        allowed_themes = ['light', 'dark', 'auto']
        if v not in allowed_themes:
            raise ValueError(f'Theme must be one of: {", ".join(allowed_themes)}')
        return v


class UserStats(BaseModel):
    """Schema for user statistics"""
    total_users: int
    active_users: int
    inactive_users: int
    users_by_role: Dict[str, int]
    recent_logins: int
    online_users: int
    subscription_limit: int
    subscription_type: str


class BulkUserAction(BaseModel):
    """Schema for bulk user actions"""
    user_ids: List[uuid.UUID] = Field(..., min_items=1, max_items=50)
    action: str = Field(..., pattern="^(activate|deactivate|delete|change_role)$")
    new_role: Optional[UserRole] = None
    
    @validator('new_role')
    def validate_new_role(cls, v, values):
        """Validate new role is provided when action is change_role"""
        if values.get('action') == 'change_role' and v is None:
            raise ValueError('new_role is required when action is change_role')
        return v


class UserExport(BaseModel):
    """Schema for user data export"""
    format: str = Field("csv", pattern="^(csv|json|xlsx)$")
    include_inactive: bool = Field(False)
    include_activity_logs: bool = Field(False)
    date_range: Optional[Dict[str, datetime]] = None
    
    @validator('date_range')
    def validate_date_range(cls, v):
        """Validate date range"""
        if v is None:
            return v
        
        if 'start' not in v or 'end' not in v:
            raise ValueError('date_range must contain start and end dates')
        
        if v['start'] >= v['end']:
            raise ValueError('start date must be before end date')
        
        return v