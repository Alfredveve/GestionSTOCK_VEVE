"""
Payment Service

Handles all payment-related business logic:
- Payment registration
- Invoice status updates
- Payment validation
"""

from decimal import Decimal
from typing import Optional, Dict, Any
from django.db import transaction
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from datetime import date

from .base import BaseService, ServiceException
from ..models import Payment, Invoice


class PaymentService(BaseService):
    """
    Service for managing payments.
    
    Handles:
    - Payment registration with validation
    - Automatic invoice status updates
    - Partial and full payment processing
    """
    
    @transaction.atomic
    def register_payment(
        self,
        invoice: Invoice,
        amount: Decimal,
        payment_method: str,
        user: User,
        payment_date: Optional[date] = None,
        reference: str = "",
        notes: str = ""
    ) -> Payment:
        """
        Register a payment for an invoice.
        
        Args:
            invoice: Invoice being paid
            amount: Payment amount
            payment_method: Payment method ('cash', 'card', 'check', 'transfer', 'mobile')
            user: User registering the payment
            payment_date: Date of payment (defaults to today)
            reference: Payment reference (check number, transaction ID, etc.)
            notes: Additional notes
            
        Returns:
            Created Payment instance
            
        Raises:
            ValidationError: If validation fails
            ServiceException: If business rules are violated
        """
        # Validate inputs
        self.validate_required(invoice, "Facture")
        amount = self.validate_positive_decimal(amount, "Montant")
        
        # Business Rule: Cannot pay an empty invoice
        if not invoice.invoiceitem_set.exists():
            raise ServiceException(
                f"Impossible d'enregistrer un paiement : La facture {invoice.invoice_number} ne contient aucun article."
            )
        
        # Validate payment method
        valid_methods = ['cash', 'card', 'check', 'transfer', 'mobile']
        if payment_method not in valid_methods:
            raise ValidationError(f"Méthode de paiement invalide: {payment_method}")
        
        # Validate amount doesn't exceed remaining balance
        remaining = invoice.get_remaining_amount()
        if amount > remaining:
            raise ServiceException(
                f"Le montant du paiement ({amount}) dépasse le solde restant ({remaining})."
            )
        
        # Create payment
        payment = Payment(
            invoice=invoice,
            amount=amount,
            payment_method=payment_method,
            payment_date=payment_date or date.today(),
            reference=reference,
            notes=notes,
            created_by=user
        )
        
        payment.full_clean()
        payment.save()
        
        # Update invoice status
        self._update_invoice_status(invoice)
        
        self.log_info(
            f"Payment registered for invoice {invoice.invoice_number}",
            payment_id=payment.id,
            amount=float(amount),
            method=payment_method
        )
        
        return payment
    
    def _update_invoice_status(self, invoice: Invoice):
        """
        Update invoice status based on payments.
        
        Args:
            invoice: Invoice to update
        """
        total_paid = invoice.get_amount_paid()
        total_amount = invoice.total_amount
        
        if total_paid >= total_amount:
            # Fully paid
            invoice.status = 'paid'
        elif total_paid > 0:
            # Partially paid
            invoice.status = 'partially_paid'
        else:
            # Not paid (keep current status if draft or sent)
            if invoice.status not in ['draft', 'sent']:
                invoice.status = 'sent'
        
        invoice.save()
    
    @transaction.atomic
    def process_full_payment(
        self,
        invoice: Invoice,
        payment_method: str,
        user: User,
        payment_date: Optional[date] = None,
        reference: str = "",
        notes: str = ""
    ) -> Payment:
        """
        Process a full payment for an invoice.
        
        Args:
            invoice: Invoice to pay
            payment_method: Payment method
            user: User processing the payment
            payment_date: Date of payment
            reference: Payment reference
            notes: Additional notes
            
        Returns:
            Created Payment instance
        """
        remaining = invoice.get_remaining_amount()
        
        return self.register_payment(
            invoice=invoice,
            amount=remaining,
            payment_method=payment_method,
            user=user,
            payment_date=payment_date,
            reference=reference,
            notes=notes or "Paiement complet"
        )
    
    @transaction.atomic
    def cancel_payment(
        self,
        payment: Payment,
        user: User
    ):
        """
        Cancel a payment and update invoice status.
        
        Args:
            payment: Payment to cancel
            user: User cancelling the payment
        """
        invoice = payment.invoice
        
        # Delete the payment
        payment.delete()
        
        # Update invoice status
        self._update_invoice_status(invoice)
        
        self.log_info(
            f"Payment cancelled for invoice {invoice.invoice_number}",
            payment_id=payment.id,
            user_id=user.id
        )
    
    def validate_payment_amount(
        self,
        invoice: Invoice,
        amount: Decimal
    ) -> bool:
        """
        Validate that a payment amount is acceptable.
        
        Args:
            invoice: Invoice being paid
            amount: Payment amount to validate
            
        Returns:
            True if valid, False otherwise
        """
        try:
            amount = self.validate_positive_decimal(amount, "Montant")
            remaining = invoice.get_remaining_amount()
            return amount <= remaining
        except ValidationError:
            return False
    
    def get_payment_summary(self, invoice: Invoice) -> Dict[str, Any]:
        """
        Get a summary of payments for an invoice.
        
        Args:
            invoice: Invoice to summarize
            
        Returns:
            Dict with payment summary information
        """
        payments = invoice.payment_set.all().order_by('-payment_date')
        total_paid = invoice.get_amount_paid()
        remaining = invoice.get_remaining_amount()
        
        return {
            'total_amount': invoice.total_amount,
            'total_paid': total_paid,
            'remaining': remaining,
            'payment_count': payments.count(),
            'payments': payments,
            'is_fully_paid': remaining <= 0,
            'is_partially_paid': total_paid > 0 and remaining > 0,
        }
