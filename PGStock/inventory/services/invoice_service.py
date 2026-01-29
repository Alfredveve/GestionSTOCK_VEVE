"""
Invoice Service

Handles all invoice-related business logic:
- Invoice creation with automatic stock deduction
- Invoice updates with smart stock management
- Invoice cancellation with stock restoration
- Invoice item management
- Total calculations
"""

from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict, Any, List
from django.db import transaction, IntegrityError
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User

from .base import BaseService, ServiceException
from .stock_service import StockService
from ..models import (
    Invoice, InvoiceItem, Client, Product, PointOfSale, Quote
)


class InvoiceService(BaseService):
    """
    Service for managing invoices.
    
    Handles the complete invoice lifecycle:
    - Creation with validation
    - Stock deduction when paid/sent
    - Stock restoration when cancelled
    - Total calculations
    """
    
    def __init__(self):
        super().__init__()
        self.stock_service = StockService()
    
    @transaction.atomic
    def create_invoice(
        self,
        client: Client,
        point_of_sale: PointOfSale,
        user: User,
        items_data: List[Dict[str, Any]],
        status: str = 'draft',
        invoice_type: str = 'retail',
        date_issued: Optional[Any] = None,
        date_due: Optional[Any] = None,
        notes: str = ""
    ) -> Invoice:
        """
        Create a new invoice with items.
        
        Args:
            client: Client for the invoice
            point_of_sale: Point of sale
            user: User creating the invoice
            items_data: List of dicts with keys: product, quantity, unit_price, discount, is_wholesale
            status: Initial status ('draft', 'sent', 'paid')
            invoice_type: 'standard' or 'wholesale'
            notes: Additional notes
            
        Returns:
            Created Invoice instance
            
        Raises:
            ValidationError: If validation fails
            ServiceException: If business rules are violated
        """
        # Validate inputs
        self.validate_required(client, "Client")
        self.validate_required(point_of_sale, "Point de vente")
        
        # Business rule: Must have items if not draft
        if status != 'draft':
            self._validate_has_items_data(items_data)
        
        # Generate invoice number BEFORE creating the object with retry logic
        max_retries = 3
        invoice = None
        
        for attempt in range(max_retries):
            try:
                # Generate a unique invoice number
                invoice_number = self._generate_unique_invoice_number()
                
                # Create invoice WITH the number
                invoice = Invoice.objects.create(
                    invoice_number=invoice_number,
                    client=client,
                    point_of_sale=point_of_sale,
                    created_by=user,
                    status=status,
                    invoice_type=invoice_type,
                    date_issued=date_issued or datetime.now().date(),
                    date_due=date_due or datetime.now().date(),
                    notes=notes
                )
                break  # Success, exit loop
                
            except IntegrityError as e:
                if 'UNIQUE constraint' in str(e) and attempt < max_retries - 1:
                    # Number collision, retry
                    self.log_warning(
                        f"Invoice number collision, retrying... (attempt {attempt + 1})"
                    )
                    continue
                else:
                    # Definitive failure
                    raise ServiceException(
                        f"Impossible de générer un numéro de facture unique après {max_retries} tentatives."
                    )
        
        if invoice is None:
            raise ServiceException("Échec de la création de la facture.")
        
        # Create invoice items
        for item_data in items_data:
            self._create_invoice_item(invoice, item_data)
        
        # Calculate totals
        self.calculate_totals(invoice)
        
        # Deduct stock if status is paid or sent
        if status in ['paid', 'sent']:
            self.deduct_stock(invoice, user)
        
        self.log_info(
            f"Invoice created: {invoice.invoice_number}",
            invoice_id=invoice.id,
            client_id=client.id,
            total=float(invoice.total_amount)
        )
        
        return invoice
    
    def _create_invoice_item(
        self,
        invoice: Invoice,
        item_data: Dict[str, Any]
    ) -> InvoiceItem:
        """Create an invoice item"""
        product = item_data.get('product')
        quantity = item_data.get('quantity')
        unit_price = item_data.get('unit_price')
        discount = item_data.get('discount', Decimal('0'))
        is_wholesale = item_data.get('is_wholesale', False)
        
        # Validate
        self.validate_required(product, "Produit")
        quantity = self.validate_positive_decimal(quantity, "Quantité")
        unit_price = self.validate_non_negative_decimal(unit_price, "Prix unitaire")
        discount = self.validate_non_negative_decimal(discount, "Remise")
        
        # Calculate total
        subtotal = quantity * unit_price
        total = subtotal - discount
        
        # Create item
        item = InvoiceItem.objects.create(
            invoice=invoice,
            product=product,
            quantity=quantity,
            unit_price=unit_price,
            discount=discount,
            total=total,
            is_wholesale=is_wholesale
        )
        
        return item
    
    @transaction.atomic
    def update_invoice(
        self,
        invoice: Invoice,
        items_data: List[Dict[str, Any]],
        user: User,
        **kwargs
    ) -> Invoice:
        """
        Update an existing invoice.
        
        Handles smart stock management:
        - If stock was deducted, restore it first, then deduct again with new values
        - If status changes to paid/sent, deduct stock
        - If status changes to cancelled/draft, restore stock
        
        Args:
            invoice: Invoice to update
            items_data: New items data
            user: User performing the update
            **kwargs: Additional fields to update (status, notes, etc.)
            
        Returns:
            Updated Invoice instance
        """
        new_status = kwargs.get('status', invoice.status)
        old_status = invoice.status
        old_stock_deducted = invoice.stock_deducted

        # Business rule: Validation of status change
        if old_status == 'draft' and new_status in ['sent', 'paid']:
            self._validate_has_items(invoice)
        
        # Update invoice fields
        for field, value in kwargs.items():
            if hasattr(invoice, field):
                setattr(invoice, field, value)
        
        invoice.save()
        
        # Delete existing items and create new ones
        invoice.invoiceitem_set.all().delete()
        for item_data in items_data:
            self._create_invoice_item(invoice, item_data)
        
        # Recalculate totals
        self.calculate_totals(invoice)
        
        # Handle stock updates
        new_status = invoice.status
        
        # If stock was already deducted and invoice is still paid/sent
        if old_stock_deducted and new_status in ['paid', 'sent']:
            # Restore old stock, then deduct new stock
            self.restore_stock(invoice, user)
            self.deduct_stock(invoice, user)
            self.log_info(f"Invoice {invoice.invoice_number} updated: stock restored and re-deducted")
        
        # If status changed to paid/sent and stock wasn't deducted
        elif new_status in ['paid', 'sent'] and not old_stock_deducted:
            self.deduct_stock(invoice, user)
            self.log_info(f"Invoice {invoice.invoice_number} status changed to {new_status}: stock deducted")
        
        # If status changed to cancelled/draft and stock was deducted
        elif new_status in ['cancelled', 'draft'] and old_stock_deducted:
            self.restore_stock(invoice, user)
            self.log_info(f"Invoice {invoice.invoice_number} cancelled: stock restored")
        
        return invoice
    
    @transaction.atomic
    def add_invoice_item(
        self,
        invoice: Invoice,
        item_data: Dict[str, Any],
        user: User
    ) -> InvoiceItem:
        """
        Add an item to an existing invoice.
        
        If stock has already been deducted for this invoice,
        deduct stock for the new item immediately.
        
        Args:
            invoice: Invoice to add item to
            item_data: Item data
            user: User performing the operation
            
        Returns:
            Created InvoiceItem
        """
        # Create the item
        item = self._create_invoice_item(invoice, item_data)
        
        # Recalculate totals
        self.calculate_totals(invoice)
        
        # If stock was already deducted, deduct for this new item
        if invoice.stock_deducted:
            self._deduct_stock_for_item(invoice, item, user)
            self.log_info(f"Item added to invoice {invoice.invoice_number}: stock deducted")
        
        return item
    
    @transaction.atomic
    def remove_invoice_item(
        self,
        invoice: Invoice,
        item: InvoiceItem,
        user: User
    ):
        """
        Remove an item from an invoice.
        
        If stock has been deducted, restore stock for this item.
        
        Args:
            invoice: Invoice to remove item from
            item: Item to remove
            user: User performing the operation
        """
        # If stock was deducted, restore it for this item
        if invoice.stock_deducted:
            self._restore_stock_for_item(invoice, item, user)
            self.log_info(f"Item removed from invoice {invoice.invoice_number}: stock restored")
        
        # Delete the item
        item.delete()
        
        # Recalculate totals
        self.calculate_totals(invoice)
    
    def calculate_totals(self, invoice: Invoice):
        """
        Calculate invoice totals (subtotal, total).
        
        Args:
            invoice: Invoice to calculate totals for
        """
        items = invoice.invoiceitem_set.all()
        
        # Calculate subtotal
        invoice.subtotal = sum(item.get_total() for item in items)
        invoice.subtotal = Decimal(str(invoice.subtotal)).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # Calculate total (No Tax)
        invoice.total_amount = (invoice.subtotal - invoice.discount_amount).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # Calculate total profit
        invoice.total_profit = sum(item.margin for item in items) - invoice.discount_amount
        invoice.total_profit = Decimal(str(invoice.total_profit)).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        invoice.save()
    
    @transaction.atomic
    def deduct_stock(self, invoice: Invoice, user: User):
        """
        Deduct stock for all items in an invoice.
        
        Args:
            invoice: Invoice to deduct stock for
            user: User performing the operation
            
        Raises:
            ServiceException: If stock is insufficient
        """
        # Avoid double deduction
        if invoice.stock_deducted:
            return
        
        # Validate point of sale
        if not invoice.point_of_sale:
            raise ServiceException(
                "Impossible de déduire le stock : aucun point de vente associé à cette facture."
            )
        
        # Deduct stock for each item
        items = invoice.invoiceitem_set.all()
        for item in items:
            self._deduct_stock_for_item(invoice, item, user)
        
        # Mark as deducted
        invoice.stock_deducted = True
        invoice.save(update_fields=['stock_deducted'])
    
    def _deduct_stock_for_item(
        self,
        invoice: Invoice,
        item: InvoiceItem,
        user: User
    ):
        """Deduct stock for a single invoice item"""
        # Calculate actual quantity in units
        actual_quantity = item.quantity
        if item.is_wholesale:
            actual_quantity = item.quantity * item.product.units_per_box
        
        # Create stock movement
        self.stock_service.process_exit(
            product=item.product,
            quantity=actual_quantity,
            point_of_sale=invoice.point_of_sale,
            user=user,
            reference=f"Facture {invoice.invoice_number}",
            notes=f"Sortie automatique ({'Gros' if item.is_wholesale else 'Détail'}) pour facture {invoice.invoice_number}"
        )
    
    @transaction.atomic
    def restore_stock(self, invoice: Invoice, user: User):
        """
        Restore stock for all items in an invoice (when cancelled).
        
        Args:
            invoice: Invoice to restore stock for
            user: User performing the operation
        """
        # If stock wasn't deducted, nothing to do
        if not invoice.stock_deducted:
            return
        
        # Validate point of sale
        if not invoice.point_of_sale:
            raise ServiceException(
                "Impossible de restaurer le stock : aucun point de vente associé à cette facture."
            )
        
        # Restore stock for each item
        items = invoice.invoiceitem_set.all()
        for item in items:
            self._restore_stock_for_item(invoice, item, user)
        
        # Mark as not deducted
        invoice.stock_deducted = False
        invoice.save(update_fields=['stock_deducted'])
    
    def _restore_stock_for_item(
        self,
        invoice: Invoice,
        item: InvoiceItem,
        user: User
    ):
        """Restore stock for a single invoice item"""
        # Calculate actual quantity in units
        actual_quantity = item.quantity
        if item.is_wholesale:
            actual_quantity = item.quantity * item.product.units_per_box
        
        # Create return movement
        self.stock_service.process_return(
            product=item.product,
            quantity=actual_quantity,
            point_of_sale=invoice.point_of_sale,
            user=user,
            reference=f"Annulation Facture {invoice.invoice_number}",
            notes=f"Retour automatique ({'Gros' if item.is_wholesale else 'Détail'}) suite à annulation facture {invoice.invoice_number}"
        )
    
    @transaction.atomic
    def cancel_invoice(self, invoice: Invoice, user: User) -> Invoice:
        """
        Cancel an invoice and restore stock.
        
        Args:
            invoice: Invoice to cancel
            user: User performing the operation
            
        Returns:
            Updated Invoice
        """
        # Restore stock if it was deducted
        if invoice.stock_deducted:
            self.restore_stock(invoice, user)
        
        # Update status
        invoice.status = 'cancelled'
        invoice.save()
        
        self.log_info(f"Invoice {invoice.invoice_number} cancelled")
        
        return invoice
    
    def _generate_unique_invoice_number(self) -> str:
        """
        Generate a unique invoice number.
        
        Note: This method should be called within an atomic transaction.
        Uses select_for_update to prevent race conditions when multiple
        invoices are created simultaneously.
        
        Returns:
            Unique invoice number in format INV-YYYY-NNNNN
        """
        from datetime import datetime
        
        year = datetime.now().year
        
        # Use select_for_update to lock the row and prevent race conditions
        # Note: This assumes we're already in an atomic transaction
        last_invoice = Invoice.objects.filter(
            invoice_number__startswith=f'INV-{year}'
        ).select_for_update().order_by('-invoice_number').first()
        
        if last_invoice:
            try:
                last_num = int(last_invoice.invoice_number.split('-')[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                # Fallback if number parsing fails
                new_num = 1
        else:
            new_num = 1
        
        return f'INV-{year}-{new_num:05d}'
    
    @transaction.atomic
    def convert_quote_to_invoice(
        self,
        quote: Quote,
        user: User,
        point_of_sale: Optional[PointOfSale] = None
    ) -> Invoice:
        """
        Convert a quote to an invoice.
        
        Args:
            quote: Quote to convert
            user: User performing the conversion
            point_of_sale: Point of sale for the invoice (optional)
            
        Returns:
            Created Invoice
        """
        # Validate quote status
        if quote.status == 'converted':
            raise ServiceException("Ce devis a déjà été converti en facture.")
        
        # Prepare items data
        items_data = []
        for quote_item in quote.quoteitem_set.all():
            items_data.append({
                'product': quote_item.product,
                'quantity': quote_item.quantity,
                'unit_price': quote_item.unit_price,
                'discount': quote_item.discount,
                'is_wholesale': quote_item.is_wholesale
            })
        
        # Business Rule: Cannot convert empty quote
        if not items_data:
            raise ServiceException("Action refusée : Le devis ne contient aucun article.")

        # Create invoice
        invoice = self.create_invoice(
            client=quote.client,
            point_of_sale=point_of_sale or user.profile.point_of_sale,
            user=user,
            items_data=items_data,
            status='draft',
            invoice_type=quote.quote_type,
            date_issued=quote.date_issued,
            date_due=quote.valid_until,
            notes=f"Converti du devis {quote.quote_number}"
        )
        
        # Update quote status
        self.log_info(f"Setting quote {quote.quote_number} status to 'converted' (current: {quote.status})")
        quote.status = 'converted'
        quote.save()
        
        # Verify status after save (from DB)
        quote.refresh_from_db()
        self.log_info(f"Quote {quote.quote_number} status after save: {quote.status}")
        
        self.log_info(
            f"Quote {quote.quote_number} converted to invoice {invoice.invoice_number}"
        )
        
        return invoice

    def _validate_has_items(self, invoice: Invoice):
        """
        Helper to check if an invoice has items.
        
        Raises ServiceException if empty.
        """
        if not invoice.invoiceitem_set.exists():
            raise ServiceException(
                f"Action refusée : La facture {invoice.invoice_number} ne contient aucun article."
            )

    def _validate_has_items_data(self, items_data: List[Dict[str, Any]]):
        """
        Helper to check if items_data list is empty.
        
        Raises ServiceException if empty.
        """
        if not items_data:
            raise ServiceException("Action refusée : Vous devez ajouter au moins un article.")
