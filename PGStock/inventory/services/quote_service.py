"""
Quote Service

Handles all quote-related business logic:
- Quote creation with validation
- Quote updates
- Quote conversion to invoice or order
- Quote expiration management
"""

from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.db import transaction
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from datetime import date, timedelta

from .base import BaseService, ServiceException


class QuoteService(BaseService):
    """
    Service for managing quotes (devis).
    
    Handles:
    - Quote creation with validation
    - Quote updates
    - Conversion to invoice or order
    - Expiration management
    """
    
    @transaction.atomic
    def create_quote(
        self,
        client,
        user: User,
        items_data: List[Dict[str, Any]],
        valid_until: Optional[date] = None,
        notes: str = ""
    ):
        """
        Create a new quote with items.
        
        Args:
            client: Client for the quote
            user: User creating the quote
            items_data: List of dicts with keys: product, quantity, unit_price, discount
            valid_until: Expiration date (defaults to 30 days from now)
            notes: Additional notes
            
        Returns:
            Created Quote instance
            
        Raises:
            ValidationError: If validation fails
            ServiceException: If business rules are violated
        """
        from inventory.models import Quote, QuoteItem
        
        # Validate inputs
        self.validate_required(client, "Client")
        
        if not items_data:
            raise ServiceException("Impossible de créer un devis sans articles.")
        
        # Default expiration: 30 days from now
        if valid_until is None:
            valid_until = date.today() + timedelta(days=30)
        
        # Create quote
        quote = Quote(
            client=client,
            created_by=user,
            date_issued=date.today(),
            valid_until=valid_until,
            notes=notes,
            status='draft'
        )
        
        # Generate number before validation
        if not quote.quote_number:
            quote.quote_number = quote.generate_quote_number()
            
        quote.full_clean()
        quote.save()
        
        # Create quote items
        for item_data in items_data:
            self._create_quote_item(quote, item_data)
        
        # Calculate totals
        self.calculate_totals(quote)
        
        self.log_info(
            f"Quote created: {quote.quote_number}",
            quote_id=quote.id,
            client=client.name,
            total=float(quote.total_amount)
        )
        
        return quote
    
    def _create_quote_item(self, quote, item_data: Dict[str, Any]):
        """Create a quote item"""
        from inventory.models import QuoteItem
        
        product = item_data.get('product')
        quantity = item_data.get('quantity', 1)
        unit_price = item_data.get('unit_price')
        discount = item_data.get('discount', 0)
        
        self.validate_required(product, "Produit")
        quantity = self.validate_positive_decimal(quantity, "Quantité")
        
        # Use product price if not provided
        if unit_price is None:
            unit_price = product.selling_price
        
        unit_price = self.validate_positive_decimal(unit_price, "Prix unitaire")
        
        # Create item
        item = QuoteItem(
            quote=quote,
            product=product,
            quantity=int(quantity),
            unit_price=unit_price,
            discount=discount
        )
        
        # Calculate total before validation
        if not item.total:
            item.total = item.get_total()
            
        item.full_clean()
        item.save()
        
        return item
    
    @transaction.atomic
    def update_quote(
        self,
        quote,
        items_data: List[Dict[str, Any]],
        user: User,
        **kwargs
    ):
        """
        Update an existing quote.
        
        Args:
            quote: Quote to update
            items_data: New items data
            user: User performing the update
            **kwargs: Additional fields to update
            
        Returns:
            Updated Quote instance
        """
        # Check if quote can be updated
        if quote.status == 'accepted':
            raise ServiceException(
                "Impossible de modifier un devis accepté. Créez un nouveau devis."
            )
        
        # Update quote fields
        for key, value in kwargs.items():
            if hasattr(quote, key):
                setattr(quote, key, value)
        
        # Delete old items and create new ones
        quote.quoteitem_set.all().delete()
        for item_data in items_data:
            self._create_quote_item(quote, item_data)
        
        # Recalculate totals
        self.calculate_totals(quote)
        
        quote.save()
        
        self.log_info(
            f"Quote updated: {quote.quote_number}",
            quote_id=quote.id,
            user_id=user.id
        )
        
        return quote
    
    def calculate_totals(self, quote):
        """
        Calculate quote totals (subtotal, total).
        
        Args:
            quote: Quote to calculate totals for
        """
        items = quote.quoteitem_set.all()
        from decimal import Decimal, ROUND_HALF_UP
        
        # Calculate subtotal
        quote.subtotal = sum(item.get_total() for item in items)
        quote.subtotal = Decimal(str(quote.subtotal)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # Calculate total (No Tax)
        quote.total_amount = quote.subtotal
        
        quote.save()
    
    @transaction.atomic
    def convert_to_invoice(
        self,
        quote,
        user: User,
        point_of_sale,
        status: str = 'draft'
    ):
        """
        Convert a quote to an invoice.
        
        Args:
            quote: Quote to convert
            user: User performing the conversion
            point_of_sale: Point of sale for the invoice
            status: Initial invoice status
            
        Returns:
            Created Invoice instance
        """
        from .invoice_service import InvoiceService
        
        # Check if quote is valid
        if quote.status == 'rejected':
            raise ServiceException("Impossible de convertir un devis rejeté en facture.")
        
        if quote.valid_until < date.today():
            raise ServiceException("Impossible de convertir un devis expiré en facture.")
        
        # Prepare items data
        items_data = []
        for item in quote.quoteitem_set.all():
            items_data.append({
                'product': item.product,
                'quantity': item.quantity,
                'unit_price': item.unit_price,
                'discount': item.discount
            })
        
        # Create invoice using InvoiceService
        invoice_service = InvoiceService()
        invoice = invoice_service.create_invoice(
            client=quote.client,
            point_of_sale=point_of_sale,
            user=user,
            items_data=items_data,
            status=status,
            notes=f"Converti du devis {quote.quote_number}\n{quote.notes}"
        )
        
        # Update quote status
        quote.status = 'accepted'
        quote.save()
        
        self.log_info(
            f"Quote converted to invoice: {quote.quote_number} -> {invoice.invoice_number}",
            quote_id=quote.id,
            invoice_id=invoice.id
        )
        
        return invoice
    
    @transaction.atomic
    def convert_to_order(
        self,
        quote,
        user: User,
        point_of_sale,
        order_type: str = 'retail'
    ):
        """
        Convert a quote to an order.
        
        Args:
            quote: Quote to convert
            user: User performing the conversion
            point_of_sale: Point of sale for the order
            order_type: 'retail' or 'wholesale'
            
        Returns:
            Created Order instance
        """
        from .order_service import OrderService
        
        # Check if quote is valid
        if quote.status == 'rejected':
            raise ServiceException("Impossible de convertir un devis rejeté en commande.")
        
        if quote.valid_until < date.today():
            raise ServiceException("Impossible de convertir un devis expiré en commande.")
        
        # Prepare items data
        items_data = []
        for item in quote.quoteitem_set.all():
            items_data.append({
                'product': item.product,
                'quantity': item.quantity,
                'unit_price': item.unit_price,
                'discount': item.discount
            })
        
        # Create order using OrderService
        order_service = OrderService()
        order = order_service.create_order(
            client=quote.client,
            point_of_sale=point_of_sale,
            user=user,
            items_data=items_data,
            order_type=order_type,
            notes=f"Converti du devis {quote.quote_number}\n{quote.notes}"
        )
        
        # Update quote status
        quote.status = 'accepted'
        quote.save()
        
        self.log_info(
            f"Quote converted to order: {quote.quote_number} -> {order.order_number}",
            quote_id=quote.id,
            order_id=order.id
        )
        
        return order
    
    def expire_quote(self, quote):
        """
        Mark a quote as expired.
        
        Args:
            quote: Quote to expire
            
        Returns:
            Updated Quote
        """
        if quote.status == 'draft' and quote.valid_until < date.today():
            quote.status = 'expired'
            quote.save()
            
            self.log_info(
                f"Quote expired: {quote.quote_number}",
                quote_id=quote.id
            )
        
        return quote
    
    def expire_old_quotes(self):
        """
        Expire all old quotes that are past their valid_until date.
        
        Returns:
            Number of quotes expired
        """
        from inventory.models import Quote
        
        expired_quotes = Quote.objects.filter(
            status='draft',
            valid_until__lt=date.today()
        )
        
        count = expired_quotes.count()
        expired_quotes.update(status='expired')
        
        self.log_info(f"Expired {count} old quotes")
        
        return count
