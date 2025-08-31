"""
Gold price management models
"""

from sqlalchemy import Column, String, DateTime, Boolean, Enum, Text, Numeric, Integer, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from decimal import Decimal
from datetime import datetime, date
from .base import BaseModel, TenantMixin


class GoldPriceSource(enum.Enum):
    """Gold price source enumeration"""
    MANUAL = "manual"
    API = "api"
    IMPORT = "import"


class GoldPrice(BaseModel, TenantMixin):
    """
    Gold price tracking for tenant businesses
    """
    __tablename__ = "gold_prices"
    
    # Price Information
    price_date = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        comment="Date of the gold price"
    )
    
    price_per_gram = Column(
        Numeric(15, 2), 
        nullable=False,
        comment="Gold price per gram in tenant's currency"
    )
    
    # Gold Specifications
    gold_purity = Column(
        Numeric(5, 3), 
        default=18.000,
        nullable=False,
        comment="Gold purity (e.g., 18.000 for 18k, 24.000 for pure gold)"
    )
    
    # Source Information
    source = Column(
        Enum(GoldPriceSource), 
        default=GoldPriceSource.MANUAL,
        nullable=False,
        comment="Source of the price data"
    )
    
    source_reference = Column(
        String(255), 
        nullable=True,
        comment="Reference to external source (API endpoint, file, etc.)"
    )
    
    # Market Information
    market_name = Column(
        String(255), 
        nullable=True,
        comment="Name of the gold market or exchange"
    )
    
    currency = Column(
        String(10), 
        default="IRR",
        nullable=False,
        comment="Currency code for the price"
    )
    
    # Additional Price Information
    buy_price = Column(
        Numeric(15, 2), 
        nullable=True,
        comment="Buying price per gram"
    )
    
    sell_price = Column(
        Numeric(15, 2), 
        nullable=True,
        comment="Selling price per gram"
    )
    
    # Status and Validation
    is_active = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether this price is active"
    )
    
    is_current = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether this is the current active price"
    )
    
    # User Information
    created_by = Column(
        UUID(as_uuid=True), 
        nullable=True,
        comment="User who created this price entry"
    )
    
    # Additional Information
    notes = Column(
        Text, 
        nullable=True,
        comment="Notes about this price entry"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    
    def __repr__(self):
        return f"<GoldPrice(id={self.id}, date={self.price_date}, price={self.price_per_gram}, purity={self.gold_purity})>"
    
    @classmethod
    def get_current_price(cls, db, tenant_id: UUID, gold_purity: Decimal = None):
        """Get current gold price for tenant"""
        query = db.query(cls).filter(
            cls.tenant_id == tenant_id,
            cls.is_active == True,
            cls.is_current == True
        )
        
        if gold_purity:
            query = query.filter(cls.gold_purity == gold_purity)
        
        return query.first()
    
    @classmethod
    def get_price_on_date(cls, db, tenant_id: UUID, target_date: date, gold_purity: Decimal = None):
        """Get gold price on a specific date"""
        query = db.query(cls).filter(
            cls.tenant_id == tenant_id,
            cls.is_active == True,
            func.date(cls.price_date) <= target_date
        )
        
        if gold_purity:
            query = query.filter(cls.gold_purity == gold_purity)
        
        return query.order_by(cls.price_date.desc()).first()
    
    @classmethod
    def get_price_history(cls, db, tenant_id: UUID, days: int = 30, gold_purity: Decimal = None):
        """Get price history for specified number of days"""
        from datetime import timedelta
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        query = db.query(cls).filter(
            cls.tenant_id == tenant_id,
            cls.is_active == True,
            cls.price_date >= start_date
        )
        
        if gold_purity:
            query = query.filter(cls.gold_purity == gold_purity)
        
        return query.order_by(cls.price_date.desc()).all()
    
    def set_as_current(self, db):
        """Set this price as the current active price"""
        # First, unset all other current prices for this tenant and purity
        db.query(GoldPrice).filter(
            GoldPrice.tenant_id == self.tenant_id,
            GoldPrice.gold_purity == self.gold_purity,
            GoldPrice.id != self.id
        ).update({"is_current": False})
        
        # Set this price as current
        self.is_current = True
        db.commit()
    
    def calculate_value_for_weight(self, weight_grams: Decimal) -> Decimal:
        """Calculate total value for given weight"""
        return weight_grams * self.price_per_gram
    
    def calculate_weight_for_value(self, value: Decimal) -> Decimal:
        """Calculate weight in grams for given value"""
        if self.price_per_gram > 0:
            return value / self.price_per_gram
        return Decimal('0')
    
    @property
    def price_spread(self) -> Decimal:
        """Calculate spread between buy and sell prices"""
        if self.buy_price and self.sell_price:
            return self.sell_price - self.buy_price
        return Decimal('0')
    
    @property
    def price_spread_percentage(self) -> Decimal:
        """Calculate spread percentage"""
        if self.buy_price and self.sell_price and self.buy_price > 0:
            spread = self.price_spread
            return (spread / self.buy_price) * 100
        return Decimal('0')


class GoldPriceHistory(BaseModel, TenantMixin):
    """
    Historical gold price data for analytics and reporting
    """
    __tablename__ = "gold_price_history"
    
    # Date Information
    price_date = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Historical price date"
    )
    
    # Price Information
    opening_price = Column(
        Numeric(15, 2), 
        nullable=True,
        comment="Opening price for the day"
    )
    
    closing_price = Column(
        Numeric(15, 2), 
        nullable=False,
        comment="Closing price for the day"
    )
    
    high_price = Column(
        Numeric(15, 2), 
        nullable=True,
        comment="Highest price for the day"
    )
    
    low_price = Column(
        Numeric(15, 2), 
        nullable=True,
        comment="Lowest price for the day"
    )
    
    # Gold Specifications
    gold_purity = Column(
        Numeric(5, 3), 
        default=18.000,
        nullable=False,
        comment="Gold purity"
    )
    
    # Market Information
    currency = Column(
        String(10), 
        default="IRR",
        nullable=False,
        comment="Currency code"
    )
    
    # Volume and Activity
    transaction_count = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Number of transactions on this date"
    )
    
    total_weight_sold = Column(
        Numeric(15, 3), 
        default=0,
        nullable=False,
        comment="Total weight sold on this date"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    
    def __repr__(self):
        return f"<GoldPriceHistory(id={self.id}, date={self.price_date}, closing={self.closing_price})>"
    
    @property
    def price_change(self) -> Decimal:
        """Calculate price change from opening to closing"""
        if self.opening_price and self.closing_price:
            return self.closing_price - self.opening_price
        return Decimal('0')
    
    @property
    def price_change_percentage(self) -> Decimal:
        """Calculate price change percentage"""
        if self.opening_price and self.opening_price > 0:
            change = self.price_change
            return (change / self.opening_price) * 100
        return Decimal('0')
    
    @property
    def price_volatility(self) -> Decimal:
        """Calculate price volatility (high - low)"""
        if self.high_price and self.low_price:
            return self.high_price - self.low_price
        return Decimal('0')


# Create indexes for performance optimization
Index('idx_gold_price_tenant_date', GoldPrice.tenant_id, GoldPrice.price_date)
Index('idx_gold_price_tenant_purity', GoldPrice.tenant_id, GoldPrice.gold_purity)
Index('idx_gold_price_tenant_current', GoldPrice.tenant_id, GoldPrice.is_current)
Index('idx_gold_price_tenant_active', GoldPrice.tenant_id, GoldPrice.is_active)
Index('idx_gold_price_source', GoldPrice.source)

Index('idx_gold_price_history_tenant_date', GoldPriceHistory.tenant_id, GoldPriceHistory.price_date)
Index('idx_gold_price_history_tenant_purity', GoldPriceHistory.tenant_id, GoldPriceHistory.gold_purity)
Index('idx_gold_price_history_date_purity', GoldPriceHistory.price_date, GoldPriceHistory.gold_purity)