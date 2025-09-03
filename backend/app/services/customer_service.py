"""
Customer service layer for business logic
"""

from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc, text
from decimal import Decimal
from datetime import datetime, timedelta
import uuid
import csv
import json
import io

from app.models.customer import Customer, CustomerStatus, CustomerType
from app.models.customer_interaction import CustomerInteraction, InteractionType
from app.models.invoice import Invoice
from app.models.installment import Installment
from app.schemas.customer import (
    CustomerCreate, CustomerUpdate, CustomerSearchRequest,
    CustomerInteractionCreate, CustomerExportRequest,
    CustomerStatsResponse, CustomerLifetimeValueResponse,
    CustomerDebtSummaryResponse
)
from app.core.exceptions import NotFoundError, ValidationError, PermissionError


class CustomerService:
    """Service class for customer management operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_customer(self, customer_data: CustomerCreate, tenant_id: uuid.UUID) -> Customer:
        """Create a new customer"""
        # Check if customer with same email already exists for this tenant
        if customer_data.email:
            existing = self.db.query(Customer).filter(
                and_(
                    Customer.tenant_id == tenant_id,
                    Customer.email == customer_data.email,
                    Customer.is_active == True
                )
            ).first()
            
            if existing:
                raise ValidationError(f"Customer with email {customer_data.email} already exists")
        
        # Create customer
        customer = Customer(
            tenant_id=tenant_id,
            **customer_data.dict()
        )
        
        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)
        
        # Log creation interaction
        self._log_interaction(
            customer_id=customer.id,
            tenant_id=tenant_id,
            interaction_type=InteractionType.NOTE,
            subject="Customer Created",
            description=f"Customer profile created: {customer.name}",
            user_id=None  # System generated
        )
        
        return customer
    
    def get_customer(self, customer_id: uuid.UUID, tenant_id: uuid.UUID) -> Optional[Customer]:
        """Get customer by ID with tenant isolation"""
        return self.db.query(Customer).filter(
            and_(
                Customer.id == customer_id,
                Customer.tenant_id == tenant_id,
                Customer.is_active == True
            )
        ).first()
    
    def get_customer_with_details(self, customer_id: uuid.UUID, tenant_id: uuid.UUID) -> Optional[Customer]:
        """Get customer with all related data loaded"""
        return self.db.query(Customer).options(
            joinedload(Customer.interactions),
            joinedload(Customer.invoices)
        ).filter(
            and_(
                Customer.id == customer_id,
                Customer.tenant_id == tenant_id,
                Customer.is_active == True
            )
        ).first()
    
    def update_customer(self, customer_id: uuid.UUID, customer_data: CustomerUpdate, tenant_id: uuid.UUID, user_id: uuid.UUID = None) -> Optional[Customer]:
        """Update customer information"""
        customer = self.get_customer(customer_id, tenant_id)
        if not customer:
            raise NotFoundError("Customer not found")
        
        # Check email uniqueness if email is being updated
        if customer_data.email and customer_data.email != customer.email:
            existing = self.db.query(Customer).filter(
                and_(
                    Customer.tenant_id == tenant_id,
                    Customer.email == customer_data.email,
                    Customer.id != customer_id,
                    Customer.is_active == True
                )
            ).first()
            
            if existing:
                raise ValidationError(f"Customer with email {customer_data.email} already exists")
        
        # Track changes for logging
        changes = []
        update_data = customer_data.dict(exclude_unset=True)
        
        for field, new_value in update_data.items():
            old_value = getattr(customer, field)
            if old_value != new_value:
                changes.append(f"{field}: {old_value} → {new_value}")
                setattr(customer, field, new_value)
        
        if changes:
            self.db.commit()
            self.db.refresh(customer)
            
            # Log update interaction
            self._log_interaction(
                customer_id=customer.id,
                tenant_id=tenant_id,
                interaction_type=InteractionType.NOTE,
                subject="Customer Updated",
                description=f"Customer information updated: {', '.join(changes)}",
                user_id=user_id
            )
        
        return customer
    
    def delete_customer(self, customer_id: uuid.UUID, tenant_id: uuid.UUID, user_id: uuid.UUID = None) -> bool:
        """Soft delete customer"""
        customer = self.get_customer(customer_id, tenant_id)
        if not customer:
            raise NotFoundError("Customer not found")
        
        # Check if customer has outstanding invoices
        outstanding_invoices = self.db.query(Invoice).filter(
            and_(
                Invoice.customer_id == customer_id,
                Invoice.tenant_id == tenant_id,
                Invoice.status.in_(["draft", "sent", "overdue"])
            )
        ).count()
        
        if outstanding_invoices > 0:
            raise ValidationError("Cannot delete customer with outstanding invoices")
        
        # Soft delete
        customer.is_active = False
        customer.status = CustomerStatus.INACTIVE
        
        self.db.commit()
        
        # Log deletion interaction
        self._log_interaction(
            customer_id=customer.id,
            tenant_id=tenant_id,
            interaction_type=InteractionType.NOTE,
            subject="Customer Deleted",
            description=f"Customer profile deactivated: {customer.name}",
            user_id=user_id
        )
        
        return True
    
    def search_customers(self, search_request: CustomerSearchRequest, tenant_id: uuid.UUID) -> Tuple[List[Customer], int]:
        """Search customers with filters and pagination"""
        query = self.db.query(Customer).filter(
            and_(
                Customer.tenant_id == tenant_id,
                Customer.is_active == True
            )
        )
        
        # Apply filters
        if search_request.query:
            search_term = f"%{search_request.query}%"
            query = query.filter(
                or_(
                    Customer.name.ilike(search_term),
                    Customer.email.ilike(search_term),
                    Customer.phone.ilike(search_term),
                    Customer.mobile.ilike(search_term),
                    Customer.business_name.ilike(search_term)
                )
            )
        
        if search_request.status:
            query = query.filter(Customer.status == search_request.status)
        
        if search_request.customer_type:
            query = query.filter(Customer.customer_type == search_request.customer_type)
        
        if search_request.tags:
            for tag in search_request.tags:
                query = query.filter(Customer.tags.contains([tag]))
        
        if search_request.has_debt is not None:
            if search_request.has_debt:
                query = query.filter(
                    or_(
                        Customer.total_debt > 0,
                        Customer.total_gold_debt > 0
                    )
                )
            else:
                query = query.filter(
                    and_(
                        Customer.total_debt == 0,
                        Customer.total_gold_debt == 0
                    )
                )
        
        if search_request.city:
            query = query.filter(Customer.city.ilike(f"%{search_request.city}%"))
        
        if search_request.created_after:
            query = query.filter(Customer.created_at >= search_request.created_after)
        
        if search_request.created_before:
            query = query.filter(Customer.created_at <= search_request.created_before)
        
        if search_request.last_purchase_after:
            query = query.filter(Customer.last_purchase_at >= search_request.last_purchase_after)
        
        # Get total count before pagination
        total = query.count()
        
        # Apply sorting
        sort_field = getattr(Customer, search_request.sort_by, Customer.created_at)
        if search_request.sort_order == "asc":
            query = query.order_by(asc(sort_field))
        else:
            query = query.order_by(desc(sort_field))
        
        # Apply pagination
        offset = (search_request.page - 1) * search_request.per_page
        customers = query.offset(offset).limit(search_request.per_page).all()
        
        return customers, total
    
    def get_customer_stats(self, tenant_id: uuid.UUID) -> CustomerStatsResponse:
        """Get customer statistics for dashboard"""
        # Basic counts
        total_customers = self.db.query(Customer).filter(
            and_(Customer.tenant_id == tenant_id, Customer.is_active == True)
        ).count()
        
        active_customers = self.db.query(Customer).filter(
            and_(
                Customer.tenant_id == tenant_id,
                Customer.is_active == True,
                Customer.status == CustomerStatus.ACTIVE
            )
        ).count()
        
        vip_customers = self.db.query(Customer).filter(
            and_(
                Customer.tenant_id == tenant_id,
                Customer.is_active == True,
                Customer.customer_type == CustomerType.VIP
            )
        ).count()
        
        customers_with_debt = self.db.query(Customer).filter(
            and_(
                Customer.tenant_id == tenant_id,
                Customer.is_active == True,
                or_(
                    Customer.total_debt > 0,
                    Customer.total_gold_debt > 0
                )
            )
        ).count()
        
        # Financial aggregations
        debt_result = self.db.query(
            func.sum(Customer.total_debt),
            func.sum(Customer.total_gold_debt),
            func.avg(Customer.total_purchases)
        ).filter(
            and_(Customer.tenant_id == tenant_id, Customer.is_active == True)
        ).first()
        
        total_debt_amount = debt_result[0] or Decimal('0')
        total_gold_debt_amount = debt_result[1] or Decimal('0')
        average_customer_value = debt_result[2] or Decimal('0')
        
        # New customers this month
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_customers_this_month = self.db.query(Customer).filter(
            and_(
                Customer.tenant_id == tenant_id,
                Customer.is_active == True,
                Customer.created_at >= month_start
            )
        ).count()
        
        return CustomerStatsResponse(
            total_customers=total_customers,
            active_customers=active_customers,
            vip_customers=vip_customers,
            customers_with_debt=customers_with_debt,
            total_debt_amount=total_debt_amount,
            total_gold_debt_amount=total_gold_debt_amount,
            average_customer_value=average_customer_value,
            new_customers_this_month=new_customers_this_month
        )
    
    def get_customer_lifetime_values(self, tenant_id: uuid.UUID, limit: int = 50) -> List[CustomerLifetimeValueResponse]:
        """Get customer lifetime values"""
        # Complex query to get customer lifetime values
        query = self.db.query(
            Customer.id,
            Customer.name,
            Customer.total_purchases,
            Customer.total_debt,
            Customer.total_gold_debt,
            Customer.last_purchase_at,
            func.count(Invoice.id).label('total_orders'),
            func.avg(Invoice.total_amount).label('average_order_value'),
            func.min(Invoice.created_at).label('first_purchase_date')
        ).outerjoin(
            Invoice, and_(
                Invoice.customer_id == Customer.id,
                Invoice.status == "paid"
            )
        ).filter(
            and_(Customer.tenant_id == tenant_id, Customer.is_active == True)
        ).group_by(
            Customer.id, Customer.name, Customer.total_purchases,
            Customer.total_debt, Customer.total_gold_debt, Customer.last_purchase_at
        ).order_by(desc(Customer.total_purchases)).limit(limit)
        
        results = []
        for row in query.all():
            results.append(CustomerLifetimeValueResponse(
                customer_id=str(row.id),
                customer_name=row.name,
                lifetime_value=row.total_purchases or Decimal('0'),
                total_orders=row.total_orders or 0,
                average_order_value=row.average_order_value or Decimal('0'),
                first_purchase_date=row.first_purchase_date,
                last_purchase_date=row.last_purchase_at,
                outstanding_debt=row.total_debt or Decimal('0'),
                outstanding_gold_debt=row.total_gold_debt or Decimal('0')
            ))
        
        return results
    
    def get_customer_debt_summary(self, tenant_id: uuid.UUID) -> List[CustomerDebtSummaryResponse]:
        """Get customers with outstanding debt"""
        customers_with_debt = self.db.query(Customer).filter(
            and_(
                Customer.tenant_id == tenant_id,
                Customer.is_active == True,
                or_(
                    Customer.total_debt > 0,
                    Customer.total_gold_debt > 0
                )
            )
        ).order_by(desc(Customer.total_debt)).all()
        
        results = []
        for customer in customers_with_debt:
            # Get overdue amount and next payment due
            overdue_amount = Decimal('0')
            next_payment_due = None
            installment_count = 0
            
            # Query installments for this customer
            installments = self.db.query(Installment).join(Invoice).filter(
                and_(
                    Invoice.customer_id == customer.id,
                    Invoice.tenant_id == tenant_id,
                    Installment.status.in_(["pending", "overdue"])
                )
            ).order_by(Installment.due_date).all()
            
            installment_count = len(installments)
            
            for installment in installments:
                if installment.status == "overdue":
                    overdue_amount += installment.amount_due or Decimal('0')
                
                if not next_payment_due and installment.status == "pending":
                    next_payment_due = installment.due_date
            
            results.append(CustomerDebtSummaryResponse(
                customer_id=str(customer.id),
                customer_name=customer.name,
                currency_debt=customer.total_debt,
                gold_debt=customer.total_gold_debt,
                overdue_amount=overdue_amount,
                next_payment_due=next_payment_due,
                installment_count=installment_count
            ))
        
        return results
    
    def get_all_tags(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Get all customer tags with usage counts"""
        # Get all customers with tags
        customers_with_tags = self.db.query(Customer.tags).filter(
            and_(
                Customer.tenant_id == tenant_id,
                Customer.is_active == True,
                Customer.tags.isnot(None)
            )
        ).all()
        
        # Count tag usage
        tag_counts = {}
        all_tags = set()
        
        for (tags,) in customers_with_tags:
            if tags:
                for tag in tags:
                    all_tags.add(tag)
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        return {
            "tags": sorted(list(all_tags)),
            "tag_counts": tag_counts
        }
    
    def export_customers(self, export_request: CustomerExportRequest, tenant_id: uuid.UUID) -> str:
        """Export customer data to CSV or JSON"""
        # Build query based on filters
        query = self.db.query(Customer).filter(
            and_(Customer.tenant_id == tenant_id, Customer.is_active == True)
        )
        
        if export_request.customer_ids:
            customer_uuids = [uuid.UUID(cid) for cid in export_request.customer_ids]
            query = query.filter(Customer.id.in_(customer_uuids))
        
        if export_request.filters:
            customers, _ = self.search_customers(export_request.filters, tenant_id)
            customer_ids = [c.id for c in customers]
            query = query.filter(Customer.id.in_(customer_ids))
        
        customers = query.all()
        
        # Prepare data
        export_data = []
        for customer in customers:
            customer_data = {
                "id": str(customer.id),
                "name": customer.name,
                "email": customer.email,
                "phone": customer.phone,
                "mobile": customer.mobile,
                "address": customer.address,
                "city": customer.city,
                "state": customer.state,
                "postal_code": customer.postal_code,
                "country": customer.country,
                "customer_type": customer.customer_type.value,
                "status": customer.status.value,
                "tags": ",".join(customer.tags) if customer.tags else "",
                "created_at": customer.created_at.isoformat(),
                "last_purchase_at": customer.last_purchase_at.isoformat() if customer.last_purchase_at else "",
            }
            
            if export_request.include_financial_data:
                customer_data.update({
                    "credit_limit": str(customer.credit_limit),
                    "total_debt": str(customer.total_debt),
                    "total_gold_debt": str(customer.total_gold_debt),
                    "total_purchases": str(customer.total_purchases),
                })
            
            if export_request.include_interactions:
                interactions = self.db.query(CustomerInteraction).filter(
                    CustomerInteraction.customer_id == customer.id
                ).order_by(desc(CustomerInteraction.created_at)).limit(10).all()
                
                interaction_summary = []
                for interaction in interactions:
                    interaction_summary.append(f"{interaction.interaction_type.value}: {interaction.subject}")
                
                customer_data["recent_interactions"] = " | ".join(interaction_summary)
            
            export_data.append(customer_data)
        
        # Generate export file
        if export_request.format.lower() == "json":
            return json.dumps(export_data, indent=2, default=str)
        else:  # CSV
            if not export_data:
                return ""
            
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=export_data[0].keys())
            writer.writeheader()
            writer.writerows(export_data)
            return output.getvalue()
    
    # Customer Interaction Methods
    
    def create_interaction(self, interaction_data: CustomerInteractionCreate, tenant_id: uuid.UUID, user_id: uuid.UUID = None) -> CustomerInteraction:
        """Create a new customer interaction"""
        # Verify customer exists
        customer = self.get_customer(uuid.UUID(interaction_data.customer_id), tenant_id)
        if not customer:
            raise NotFoundError("Customer not found")
        
        interaction = CustomerInteraction(
            tenant_id=tenant_id,
            user_id=user_id,
            **interaction_data.dict()
        )
        
        self.db.add(interaction)
        
        # Update customer last contact
        customer.update_contact()
        
        self.db.commit()
        self.db.refresh(interaction)
        
        return interaction
    
    def get_customer_interactions(self, customer_id: uuid.UUID, tenant_id: uuid.UUID, page: int = 1, per_page: int = 20) -> Tuple[List[CustomerInteraction], int]:
        """Get customer interactions with pagination"""
        query = self.db.query(CustomerInteraction).filter(
            and_(
                CustomerInteraction.customer_id == customer_id,
                CustomerInteraction.tenant_id == tenant_id
            )
        ).order_by(desc(CustomerInteraction.created_at))
        
        total = query.count()
        offset = (page - 1) * per_page
        interactions = query.offset(offset).limit(per_page).all()
        
        return interactions, total
    
    def _log_interaction(self, customer_id: uuid.UUID, tenant_id: uuid.UUID, interaction_type: InteractionType, subject: str, description: str = None, user_id: uuid.UUID = None):
        """Internal method to log system interactions"""
        interaction = CustomerInteraction(
            tenant_id=tenant_id,
            customer_id=customer_id,
            user_id=user_id,
            interaction_type=interaction_type,
            subject=subject,
            description=description
        )
        
        self.db.add(interaction)
        # Note: Don't commit here as this is called within other transactions