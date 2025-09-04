"""
Bank reconciliation service with transaction matching algorithms
"""

import csv
import io
import json
import re
from typing import List, Dict, Tuple, Optional, Any
from decimal import Decimal, InvalidOperation
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, text
import pandas as pd
from uuid import UUID
import logging

from app.models.accounting import (
    BankAccount, BankStatement, BankTransaction, BankReconciliation,
    BankReconciliationItem, Transaction, Account
)
from app.schemas.bank_reconciliation import (
    BankStatementImportRequest, BankTransactionCreate, 
    TransactionMatchSuggestion, BankReconciliationCreate,
    AutoMatchResult
)
from app.core.exceptions import ValidationError, NotFoundError

logger = logging.getLogger(__name__)


class BankReconciliationService:
    """Service for bank reconciliation operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def import_bank_statement(
        self, 
        tenant_id: UUID, 
        file_content: bytes, 
        import_request: BankStatementImportRequest
    ) -> Dict[str, Any]:
        """
        Import bank statement from CSV or Excel file
        """
        try:
            # Validate bank account exists and belongs to tenant
            bank_account = self.db.query(BankAccount).filter(
                and_(
                    BankAccount.id == import_request.bank_account_id,
                    BankAccount.tenant_id == tenant_id
                )
            ).first()
            
            if not bank_account:
                raise NotFoundError("Bank account not found")     
       
            # Parse file content based on format
            if import_request.file_format.lower() in ['csv']:
                df = self._parse_csv_file(file_content, import_request)
            elif import_request.file_format.lower() in ['excel', 'xlsx']:
                df = self._parse_excel_file(file_content, import_request)
            else:
                raise ValidationError(f"Unsupported file format: {import_request.file_format}")
            
            # Create bank statement record
            statement = BankStatement(
                bank_account_id=import_request.bank_account_id,
                statement_date=datetime.now(),
                opening_balance=Decimal('0'),
                closing_balance=Decimal('0'),
                file_format=import_request.file_format,
                total_transactions=len(df)
            )
            
            self.db.add(statement)
            self.db.flush()  # Get statement ID
            
            # Process transactions
            processed_count = 0
            failed_count = 0
            errors = []
            
            for index, row in df.iterrows():
                try:
                    transaction = self._create_bank_transaction_from_row(
                        row, 
                        bank_account.id, 
                        statement.id, 
                        tenant_id,
                        import_request.column_mapping
                    )
                    
                    if transaction:
                        self.db.add(transaction)
                        processed_count += 1
                    
                except Exception as e:
                    failed_count += 1
                    errors.append(f"Row {index + 1}: {str(e)}")
                    logger.error(f"Failed to process transaction row {index + 1}: {e}")
            
            # Update statement totals
            statement.processed_transactions = processed_count
            statement.failed_transactions = failed_count
            
            if errors:
                statement.processing_errors = "\n".join(errors[:10])  # Limit error log 
           
            # Calculate opening and closing balances from transactions
            if processed_count > 0:
                transactions = self.db.query(BankTransaction).filter(
                    BankTransaction.statement_id == statement.id
                ).order_by(BankTransaction.transaction_date).all()
                
                if transactions:
                    # Assume first transaction has balance_after as opening + first transaction
                    first_transaction = transactions[0]
                    if first_transaction.balance_after is not None:
                        statement.opening_balance = (
                            first_transaction.balance_after - 
                            (first_transaction.credit_amount - first_transaction.debit_amount)
                        )
                    
                    # Last transaction balance is closing balance
                    last_transaction = transactions[-1]
                    if last_transaction.balance_after is not None:
                        statement.closing_balance = last_transaction.balance_after
            
            self.db.commit()
            
            return {
                "success": True,
                "statement_id": statement.id,
                "total_transactions": len(df),
                "processed_transactions": processed_count,
                "failed_transactions": failed_count,
                "errors": errors[:5],  # Return first 5 errors
                "warnings": []
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Bank statement import failed: {e}")
            raise ValidationError(f"Import failed: {str(e)}")
    
    def _parse_csv_file(self, file_content: bytes, import_request: BankStatementImportRequest) -> pd.DataFrame:
        """Parse CSV file content"""
        try:
            # Try different encodings
            for encoding in ['utf-8', 'utf-8-sig', 'latin1', 'cp1256']:
                try:
                    content_str = file_content.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise ValidationError("Unable to decode file with supported encodings")        
    
            # Parse CSV
            df = pd.read_csv(
                io.StringIO(content_str),
                header=0 if import_request.has_header else None,
                encoding=None
            )
            
            return df
            
        except Exception as e:
            raise ValidationError(f"Failed to parse CSV file: {str(e)}")
    
    def _parse_excel_file(self, file_content: bytes, import_request: BankStatementImportRequest) -> pd.DataFrame:
        """Parse Excel file content"""
        try:
            df = pd.read_excel(
                io.BytesIO(file_content),
                header=0 if import_request.has_header else None
            )
            
            return df
            
        except Exception as e:
            raise ValidationError(f"Failed to parse Excel file: {str(e)}")
    
    def _create_bank_transaction_from_row(
        self, 
        row: pd.Series, 
        bank_account_id: UUID, 
        statement_id: UUID, 
        tenant_id: UUID,
        column_mapping: Dict[str, Any]
    ) -> Optional[BankTransaction]:
        """Create bank transaction from CSV/Excel row"""
        try:
            # Extract data based on column mapping
            transaction_date = self._parse_date(row, column_mapping.get('date_column'))
            description = str(row.iloc[column_mapping.get('description_column', 0)]).strip()
            
            # Parse amounts
            debit_amount = self._parse_amount(row, column_mapping.get('debit_column'))
            credit_amount = self._parse_amount(row, column_mapping.get('credit_column'))
            
            # If single amount column, determine debit/credit based on sign or separate indicator
            if 'amount_column' in column_mapping:
                amount = self._parse_amount(row, column_mapping['amount_column'])
                if amount > 0:
                    credit_amount = amount
                    debit_amount = Decimal('0')
                else:
                    debit_amount = abs(amount)
                    credit_amount = Decimal('0')     
       
            # Skip if no amount
            if debit_amount == 0 and credit_amount == 0:
                return None
            
            # Extract optional fields
            reference_number = None
            if 'reference_column' in column_mapping:
                reference_number = str(row.iloc[column_mapping['reference_column']]).strip()
            
            balance_after = None
            if 'balance_column' in column_mapping:
                balance_after = self._parse_amount(row, column_mapping['balance_column'])
            
            counterparty = None
            if 'counterparty_column' in column_mapping:
                counterparty = str(row.iloc[column_mapping['counterparty_column']]).strip()
            
            transaction = BankTransaction(
                tenant_id=tenant_id,
                bank_account_id=bank_account_id,
                statement_id=statement_id,
                transaction_date=transaction_date,
                description=description,
                reference_number=reference_number,
                debit_amount=debit_amount,
                credit_amount=credit_amount,
                balance_after=balance_after,
                counterparty=counterparty
            )
            
            return transaction
            
        except Exception as e:
            raise ValidationError(f"Failed to parse transaction row: {str(e)}")
    
    def _parse_date(self, row: pd.Series, column_index: Optional[int]) -> datetime:
        """Parse date from row"""
        if column_index is None:
            return datetime.now()
        
        try:
            date_value = row.iloc[column_index]
            
            if pd.isna(date_value):
                return datetime.now()
            
            if isinstance(date_value, datetime):
                return date_value    
        
            # Try to parse string date
            date_str = str(date_value).strip()
            
            # Common date formats
            date_formats = [
                '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y',
                '%Y/%m/%d', '%d.%m.%Y', '%Y.%m.%d'
            ]
            
            for fmt in date_formats:
                try:
                    return datetime.strptime(date_str, fmt)
                except ValueError:
                    continue
            
            # Try pandas date parser
            return pd.to_datetime(date_str)
            
        except Exception:
            return datetime.now()
    
    def _parse_amount(self, row: pd.Series, column_index: Optional[int]) -> Decimal:
        """Parse amount from row"""
        if column_index is None:
            return Decimal('0')
        
        try:
            amount_value = row.iloc[column_index]
            
            if pd.isna(amount_value):
                return Decimal('0')
            
            # Clean amount string
            amount_str = str(amount_value).strip()
            
            # Remove common currency symbols and separators
            amount_str = re.sub(r'[^\d\.\-\+]', '', amount_str)
            
            if not amount_str:
                return Decimal('0')
            
            return Decimal(amount_str)
            
        except (InvalidOperation, ValueError):
            return Decimal('0')
    
    def find_transaction_matches(
        self, 
        tenant_id: UUID, 
        bank_account_id: UUID,
        amount_tolerance: float = 0.01,
        date_tolerance_days: int = 3
    ) -> List[TransactionMatchSuggestion]:
        """
        Find potential matches between bank transactions and book transactions
        """
        try:
            # Get unmatched bank transactions
            bank_transactions = self.db.query(BankTransaction).filter(
                and_(
                    BankTransaction.tenant_id == tenant_id,
                    BankTransaction.bank_account_id == bank_account_id,
                    BankTransaction.is_matched == False
                )
            ).all()
            
            # Get unmatched book transactions (payments and receipts)
            book_transactions = self.db.query(Transaction).filter(
                and_(
                    Transaction.tenant_id == tenant_id,
                    Transaction.transaction_type.in_(['payment', 'receipt']),
                    ~Transaction.id.in_(
                        self.db.query(BankTransaction.matched_transaction_id).filter(
                            BankTransaction.matched_transaction_id.isnot(None)
                        )
                    )
                )
            ).all()
            
            suggestions = []
            
            for bank_tx in bank_transactions:
                bank_amount = bank_tx.absolute_amount
                
                for book_tx in book_transactions:
                    # Calculate match score
                    match_score, reasons = self._calculate_match_score(
                        bank_tx, book_tx, amount_tolerance, date_tolerance_days
                    )
                    
                    if match_score >= 0.5:  # Minimum threshold
                        suggestion = TransactionMatchSuggestion(
                            bank_transaction_id=bank_tx.id,
                            book_transaction_id=book_tx.id,
                            confidence_score=Decimal(str(match_score)),
                            match_reasons=reasons,
                            amount_difference=abs(bank_amount - book_tx.amount),
                            date_difference_days=abs((bank_tx.transaction_date.date() - book_tx.transaction_date.date()).days)
                        )
                        suggestions.append(suggestion)
            
            # Sort by confidence score descending
            suggestions.sort(key=lambda x: x.confidence_score, reverse=True)
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Failed to find transaction matches: {e}")
            return []  
  
    def _calculate_match_score(
        self, 
        bank_tx: BankTransaction, 
        book_tx: Transaction,
        amount_tolerance: float,
        date_tolerance_days: int
    ) -> Tuple[float, List[str]]:
        """Calculate match score between bank and book transactions"""
        score = 0.0
        reasons = []
        
        # Amount matching (40% weight)
        bank_amount = bank_tx.absolute_amount
        amount_diff = abs(bank_amount - book_tx.amount)
        amount_diff_pct = float(amount_diff / book_tx.amount) if book_tx.amount > 0 else 1.0
        
        if amount_diff <= Decimal(str(amount_tolerance)):
            score += 0.4
            reasons.append("Exact amount match")
        elif amount_diff_pct <= 0.05:  # 5% tolerance
            score += 0.3
            reasons.append("Close amount match (within 5%)")
        elif amount_diff_pct <= 0.10:  # 10% tolerance
            score += 0.2
            reasons.append("Approximate amount match (within 10%)")
        
        # Date matching (30% weight)
        date_diff = abs((bank_tx.transaction_date.date() - book_tx.transaction_date.date()).days)
        
        if date_diff == 0:
            score += 0.3
            reasons.append("Same date")
        elif date_diff <= 1:
            score += 0.25
            reasons.append("Next day")
        elif date_diff <= date_tolerance_days:
            score += 0.2
            reasons.append(f"Within {date_tolerance_days} days")
        elif date_diff <= 7:
            score += 0.1
            reasons.append("Within a week")
        
        # Reference number matching (20% weight)
        if bank_tx.reference_number and book_tx.reference_number:
            if bank_tx.reference_number.lower() == book_tx.reference_number.lower():
                score += 0.2
                reasons.append("Reference number match")
            elif bank_tx.reference_number.lower() in book_tx.reference_number.lower() or \
                 book_tx.reference_number.lower() in bank_tx.reference_number.lower():
                score += 0.1
                reasons.append("Partial reference match")   
     
        # Description/counterparty matching (10% weight)
        if bank_tx.counterparty and hasattr(book_tx, 'customer') and book_tx.customer:
            if bank_tx.counterparty.lower() in book_tx.customer.name.lower() or \
               book_tx.customer.name.lower() in bank_tx.counterparty.lower():
                score += 0.1
                reasons.append("Counterparty name match")
        
        # Transaction type consistency check
        if bank_tx.credit_amount > 0 and book_tx.transaction_type == 'receipt':
            score += 0.05
            reasons.append("Transaction type consistent (receipt)")
        elif bank_tx.debit_amount > 0 and book_tx.transaction_type == 'payment':
            score += 0.05
            reasons.append("Transaction type consistent (payment)")
        
        return min(score, 1.0), reasons
    
    def match_transactions(
        self, 
        tenant_id: UUID, 
        bank_transaction_id: UUID, 
        book_transaction_id: UUID,
        user_id: UUID,
        notes: Optional[str] = None
    ) -> bool:
        """
        Manually match bank transaction with book transaction
        """
        try:
            # Get bank transaction
            bank_tx = self.db.query(BankTransaction).filter(
                and_(
                    BankTransaction.id == bank_transaction_id,
                    BankTransaction.tenant_id == tenant_id,
                    BankTransaction.is_matched == False
                )
            ).first()
            
            if not bank_tx:
                raise NotFoundError("Bank transaction not found or already matched")
            
            # Get book transaction
            book_tx = self.db.query(Transaction).filter(
                and_(
                    Transaction.id == book_transaction_id,
                    Transaction.tenant_id == tenant_id
                )
            ).first()
            
            if not book_tx:
                raise NotFoundError("Book transaction not found")      
      
            # Check if book transaction is already matched
            existing_match = self.db.query(BankTransaction).filter(
                BankTransaction.matched_transaction_id == book_transaction_id
            ).first()
            
            if existing_match:
                raise ValidationError("Book transaction is already matched")
            
            # Perform matching
            bank_tx.is_matched = True
            bank_tx.matched_transaction_id = book_transaction_id
            bank_tx.matched_date = datetime.utcnow()
            bank_tx.matched_by = user_id
            bank_tx.match_confidence = Decimal('1.0')  # Manual match = 100% confidence
            
            if notes:
                bank_tx.notes = notes
            
            self.db.commit()
            
            logger.info(f"Matched bank transaction {bank_transaction_id} with book transaction {book_transaction_id}")
            
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to match transactions: {e}")
            raise
    
    def unmatch_transaction(
        self, 
        tenant_id: UUID, 
        bank_transaction_id: UUID,
        user_id: UUID
    ) -> bool:
        """
        Remove matching from bank transaction
        """
        try:
            bank_tx = self.db.query(BankTransaction).filter(
                and_(
                    BankTransaction.id == bank_transaction_id,
                    BankTransaction.tenant_id == tenant_id,
                    BankTransaction.is_matched == True
                )
            ).first()
            
            if not bank_tx:
                raise NotFoundError("Matched bank transaction not found")  
          
            # Remove matching
            bank_tx.is_matched = False
            bank_tx.matched_transaction_id = None
            bank_tx.matched_date = None
            bank_tx.matched_by = None
            bank_tx.match_confidence = None
            
            self.db.commit()
            
            logger.info(f"Unmatched bank transaction {bank_transaction_id}")
            
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to unmatch transaction: {e}")
            raise
    
    def auto_match_transactions(
        self, 
        tenant_id: UUID, 
        bank_account_id: UUID,
        min_confidence: float = 0.90
    ) -> AutoMatchResult:
        """
        Automatically match transactions with high confidence
        """
        start_time = datetime.now()
        
        try:
            # Find all potential matches
            suggestions = self.find_transaction_matches(tenant_id, bank_account_id)
            
            # Filter high confidence matches
            high_confidence_matches = [s for s in suggestions if float(s.confidence_score) >= min_confidence]
            medium_confidence_matches = [s for s in suggestions if 0.7 <= float(s.confidence_score) < min_confidence]
            low_confidence_matches = [s for s in suggestions if float(s.confidence_score) < 0.7]
            
            matched_count = 0
            
            # Auto-match high confidence suggestions
            for suggestion in high_confidence_matches:
                try:
                    # Check if transactions are still available for matching
                    bank_tx = self.db.query(BankTransaction).filter(
                        and_(
                            BankTransaction.id == suggestion.bank_transaction_id,
                            BankTransaction.is_matched == False
                        )
                    ).first()      
              
                    book_tx_available = not self.db.query(BankTransaction).filter(
                        BankTransaction.matched_transaction_id == suggestion.book_transaction_id
                    ).first()
                    
                    if bank_tx and book_tx_available:
                        # Perform automatic matching
                        bank_tx.is_matched = True
                        bank_tx.matched_transaction_id = suggestion.book_transaction_id
                        bank_tx.matched_date = datetime.utcnow()
                        bank_tx.match_confidence = suggestion.confidence_score
                        bank_tx.notes = f"Auto-matched with {suggestion.confidence_score:.2%} confidence"
                        
                        matched_count += 1
                        
                except Exception as e:
                    logger.error(f"Failed to auto-match suggestion: {e}")
                    continue
            
            self.db.commit()
            
            # Calculate statistics
            total_bank_transactions = self.db.query(BankTransaction).filter(
                and_(
                    BankTransaction.tenant_id == tenant_id,
                    BankTransaction.bank_account_id == bank_account_id
                )
            ).count()
            
            total_book_transactions = self.db.query(Transaction).filter(
                and_(
                    Transaction.tenant_id == tenant_id,
                    Transaction.transaction_type.in_(['payment', 'receipt'])
                )
            ).count()
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            match_rate = Decimal(str(matched_count / max(total_bank_transactions, 1)))
            
            result = AutoMatchResult(
                total_bank_transactions=total_bank_transactions,
                total_book_transactions=total_book_transactions,
                matched_transactions=matched_count,
                match_rate=match_rate,
                high_confidence_matches=len(high_confidence_matches),
                medium_confidence_matches=len(medium_confidence_matches),
                low_confidence_matches=len(low_confidence_matches),
                unmatched_transactions=total_bank_transactions - matched_count,
                processing_time_seconds=processing_time,
                matches=high_confidence_matches[:10]  # Return first 10 matches
            )    
        
            logger.info(f"Auto-matching completed: {matched_count} transactions matched in {processing_time:.2f}s")
            
            return result
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Auto-matching failed: {e}")
            raise
    
    def create_reconciliation(
        self, 
        tenant_id: UUID, 
        reconciliation_data: BankReconciliationCreate,
        user_id: UUID
    ) -> BankReconciliation:
        """
        Create new bank reconciliation
        """
        try:
            # Validate bank account
            bank_account = self.db.query(BankAccount).filter(
                and_(
                    BankAccount.id == reconciliation_data.bank_account_id,
                    BankAccount.tenant_id == tenant_id
                )
            ).first()
            
            if not bank_account:
                raise NotFoundError("Bank account not found")
            
            # Create reconciliation
            reconciliation = BankReconciliation(
                tenant_id=tenant_id,
                bank_account_id=reconciliation_data.bank_account_id,
                reconciliation_date=reconciliation_data.reconciliation_date,
                statement_date=reconciliation_data.statement_date,
                book_balance=reconciliation_data.book_balance,
                bank_balance=reconciliation_data.bank_balance,
                outstanding_deposits=reconciliation_data.outstanding_deposits,
                outstanding_checks=reconciliation_data.outstanding_checks,
                bank_charges=reconciliation_data.bank_charges,
                interest_earned=reconciliation_data.interest_earned,
                other_adjustments=reconciliation_data.other_adjustments,
                notes=reconciliation_data.notes,
                created_by=user_id
            )
            
            # Calculate adjusted balances
            reconciliation.calculate_adjusted_balances()
            
            self.db.add(reconciliation)
            self.db.flush()    
        
            # Add reconciliation items
            for item_data in reconciliation_data.items:
                item = BankReconciliationItem(
                    reconciliation_id=reconciliation.id,
                    item_type=item_data.item_type,
                    description=item_data.description,
                    amount=item_data.amount,
                    reference_number=item_data.reference_number,
                    reference_date=item_data.reference_date,
                    transaction_id=item_data.transaction_id,
                    bank_transaction_id=item_data.bank_transaction_id
                )
                self.db.add(item)
            
            self.db.commit()
            self.db.refresh(reconciliation)
            
            return reconciliation
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create reconciliation: {e}")
            raise
    
    def finalize_reconciliation(
        self, 
        tenant_id: UUID, 
        reconciliation_id: UUID,
        user_id: UUID
    ) -> bool:
        """
        Finalize bank reconciliation
        """
        try:
            reconciliation = self.db.query(BankReconciliation).filter(
                and_(
                    BankReconciliation.id == reconciliation_id,
                    BankReconciliation.tenant_id == tenant_id,
                    BankReconciliation.is_finalized == False
                )
            ).first()
            
            if not reconciliation:
                raise NotFoundError("Reconciliation not found or already finalized")
            
            if not reconciliation.is_balanced:
                raise ValidationError("Cannot finalize unbalanced reconciliation")
            
            # Finalize reconciliation
            reconciliation.finalize(user_id)
            
            self.db.commit()
            
            logger.info(f"Reconciliation {reconciliation_id} finalized by user {user_id}")
            
            return True   
         
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to finalize reconciliation: {e}")
            raise
    
    def get_reconciliation_discrepancies(
        self, 
        tenant_id: UUID, 
        bank_account_id: UUID
    ) -> Dict[str, Any]:
        """
        Get reconciliation discrepancies for bank account
        """
        try:
            # Get unmatched bank transactions
            unmatched_bank_transactions = self.db.query(BankTransaction).filter(
                and_(
                    BankTransaction.tenant_id == tenant_id,
                    BankTransaction.bank_account_id == bank_account_id,
                    BankTransaction.is_matched == False
                )
            ).count()
            
            # Get unmatched book transactions
            matched_transaction_ids = self.db.query(BankTransaction.matched_transaction_id).filter(
                and_(
                    BankTransaction.tenant_id == tenant_id,
                    BankTransaction.matched_transaction_id.isnot(None)
                )
            ).subquery()
            
            unmatched_book_transactions = self.db.query(Transaction).filter(
                and_(
                    Transaction.tenant_id == tenant_id,
                    Transaction.transaction_type.in_(['payment', 'receipt']),
                    ~Transaction.id.in_(matched_transaction_ids)
                )
            ).count()
            
            # Get outstanding reconciliation items
            outstanding_items = self.db.query(BankReconciliationItem).join(
                BankReconciliation
            ).filter(
                and_(
                    BankReconciliation.tenant_id == tenant_id,
                    BankReconciliation.bank_account_id == bank_account_id,
                    BankReconciliationItem.is_cleared == False
                )
            ).count()
            
            return {
                "unmatched_bank_transactions": unmatched_bank_transactions,
                "unmatched_book_transactions": unmatched_book_transactions,
                "outstanding_items": outstanding_items
            }
            
        except Exception as e:
            logger.error(f"Failed to get reconciliation discrepancies: {e}")
            return {
                "unmatched_bank_transactions": 0,
                "unmatched_book_transactions": 0,
                "outstanding_items": 0
            }