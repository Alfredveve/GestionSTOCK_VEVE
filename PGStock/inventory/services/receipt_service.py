"""
Receipt Service

Handles all receipt (bon de réception) related business logic:
- Receipt creation with stock entry
- Receipt validation
- Receipt cancellation
"""

from decimal import Decimal
from typing import Dict, Any, List
from django.db import transaction
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User

from .base import BaseService, ServiceException
from .stock_service import StockService
from ..models import (
    Receipt, ReceiptItem, Supplier, Product, PointOfSale
)


class ReceiptService(BaseService):
    """
    Service for managing supplier receipts (bons de réception).
    
    Handles:
    - Receipt creation with automatic stock entry
    - Receipt validation
    - Receipt cancellation with stock restoration
    """
    
    def __init__(self):
        super().__init__()
        self.stock_service = StockService()
    
    @transaction.atomic
    def create_receipt(
        self,
        supplier: Supplier,
        point_of_sale: PointOfSale,
        user: User,
        items_data: List[Dict[str, Any]],
        delivery_costs: Decimal = Decimal('0'),
        notes: str = ""
    ) -> Receipt:
        """
        Create a new receipt with automatic stock entry.
        
        Args:
            supplier: Supplier for the receipt
            point_of_sale: Destination point of sale
            user: User creating the receipt
            items_data: List of dicts with keys: product, quantity, unit_cost
            delivery_costs: Delivery/shipping costs
            notes: Additional notes
            
        Returns:
            Created Receipt instance
            
        Raises:
            ValidationError: If validation fails
        """
        # Validate inputs
        self.validate_required(supplier, "Fournisseur")
        self.validate_required(point_of_sale, "Point de vente")
        
        if not items_data:
            raise ServiceException("Action refusée : Le bon de réception doit contenir au moins un article.")
        
        delivery_costs = self.validate_non_negative_decimal(delivery_costs, "Frais de livraison")
        
        # Create receipt
        receipt = Receipt(
            supplier=supplier,
            point_of_sale=point_of_sale,
            created_by=user,
            delivery_costs=delivery_costs,
            notes=notes
        )
        
        # Generate receipt number
        receipt.receipt_number = receipt.generate_receipt_number()
        receipt.save()
        
        # Create receipt items and stock entries
        for item_data in items_data:
            self._create_receipt_item(receipt, item_data, user)
        
        # Calculate totals
        self.calculate_totals(receipt)
        
        self.log_info(
            f"Receipt created: {receipt.receipt_number}",
            receipt_id=receipt.id,
            supplier_id=supplier.id,
            total=float(receipt.total_amount)
        )
        
        return receipt
    
    def _create_receipt_item(
        self,
        receipt: Receipt,
        item_data: Dict[str, Any],
        user: User
    ) -> ReceiptItem:
        """Create a receipt item and update stock"""
        product = item_data.get('product')
        quantity = item_data.get('quantity')
        unit_cost = item_data.get('unit_cost')
        
        # Validate
        self.validate_required(product, "Produit")
        quantity = self.validate_positive_decimal(quantity, "Quantité")
        unit_cost = self.validate_non_negative_decimal(unit_cost, "Coût unitaire")
        
        # Calculate total
        total = quantity * unit_cost
        
        # Create receipt item
        item = ReceiptItem.objects.create(
            receipt=receipt,
            product=product,
            quantity=quantity,
            unit_cost=unit_cost,
            total=total
        )
        
        # Create stock entry
        self.stock_service.process_entry(
            product=product,
            quantity=quantity,
            point_of_sale=receipt.point_of_sale,
            user=user,
            reference=f"Bon de réception {receipt.receipt_number}",
            notes=f"Réception fournisseur {receipt.supplier.name}"
        )
        
        return item
    
    def calculate_totals(self, receipt: Receipt):
        """
        Calculate receipt totals.
        
        Args:
            receipt: Receipt to calculate totals for
        """
        from decimal import ROUND_HALF_UP
        
        items = receipt.receiptitem_set.all()
        
        # Calculate subtotal
        receipt.total_amount = sum(item.total for item in items)
        receipt.total_amount = Decimal(str(receipt.total_amount)).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # Add delivery costs
        if receipt.delivery_costs:
            receipt.total_amount += receipt.delivery_costs
        
        receipt.save()
    
    @transaction.atomic
    def add_receipt_item(
        self,
        receipt: Receipt,
        item_data: Dict[str, Any],
        user: User
    ) -> ReceiptItem:
        """
        Add an item to an existing receipt.
        
        Args:
            receipt: Receipt to add item to
            item_data: Item data
            user: User performing the operation
            
        Returns:
            Created ReceiptItem
        """
        # Create the item (this also creates stock entry)
        item = self._create_receipt_item(receipt, item_data, user)
        
        # Recalculate totals
        self.calculate_totals(receipt)
        
        self.log_info(f"Item added to receipt {receipt.receipt_number}")
        
        return item
    
    @transaction.atomic
    def remove_receipt_item(
        self,
        receipt: Receipt,
        item: ReceiptItem,
        user: User
    ):
        """
        Remove an item from a receipt.
        
        Note: This will create a negative stock adjustment to reverse the entry.
        
        Args:
            receipt: Receipt to remove item from
            item: Item to remove
            user: User performing the operation
        """
        # Create a stock exit to reverse the entry
        self.stock_service.process_exit(
            product=item.product,
            quantity=item.quantity,
            point_of_sale=receipt.point_of_sale,
            user=user,
            reference=f"Correction {receipt.receipt_number}",
            notes=f"Suppression article du bon de réception {receipt.receipt_number}"
        )
        
        # Delete the item
        item.delete()
        
        # Recalculate totals
        self.calculate_totals(receipt)
        
        self.log_info(f"Item removed from receipt {receipt.receipt_number}")
    
    @transaction.atomic
    def cancel_receipt(
        self,
        receipt: Receipt,
        user: User
    ) -> Receipt:
        """
        Cancel a receipt and reverse all stock entries.
        
        Args:
            receipt: Receipt to cancel
            user: User performing the operation
            
        Returns:
            Updated Receipt
        """
        # Reverse stock for all items
        items = receipt.receiptitem_set.all()
        for item in items:
            self.stock_service.process_exit(
                product=item.product,
                quantity=item.quantity,
                point_of_sale=receipt.point_of_sale,
                user=user,
                reference=f"Annulation {receipt.receipt_number}",
                notes=f"Annulation du bon de réception {receipt.receipt_number}"
            )
        
        # Mark as cancelled (if you have a status field)
        # receipt.status = 'cancelled'
        # receipt.save()
        
        self.log_info(f"Receipt {receipt.receipt_number} cancelled")
        
        return receipt
