"""
Order Service

Handles all order-related business logic:
- Order creation with validation
- Order updates with smart stock management
- Order status changes with automatic stock deduction/restoration
- Order cancellation
"""

from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.db import transaction
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User

from .base import BaseService, ServiceException
from .stock_service import StockService


class OrderService(BaseService):
    """
    Service for managing orders (sales).
    
    Handles:
    - Order creation with validation
    - Automatic stock deduction when validated
    - Stock restoration when cancelled
    - Order lifecycle management
    """
    
    def __init__(self):
        super().__init__()
        self.stock_service = StockService()
    
    @transaction.atomic
    def create_order(
        self,
        client,
        point_of_sale,
        user: User,
        items_data: List[Dict[str, Any]],
        order_type: str = 'retail',
        status: str = 'pending',
        payment_method: Optional[str] = None,
        notes: str = ""
    ):
        """
        Create a new order with items.
        
        Args:
            client: Client for the order
            point_of_sale: Point of sale
            user: User creating the order
            items_data: List of dicts with keys: product, quantity, unit_price, discount
            order_type: 'retail' or 'wholesale'
            status: Initial status
            payment_method: Payment method if applicable
            notes: Additional notes
            
        Returns:
            Created Order instance
            
        Raises:
            ValidationError: If validation fails
            ServiceException: If business rules are violated
        """
        # Import here to avoid circular imports
        from sales.models import Order, OrderItem
        
        # Validate inputs
        self.validate_required(client, "Client")
        self.validate_required(point_of_sale, "Point de vente")
        
        if not items_data:
            raise ServiceException("Impossible de créer une commande sans articles.")
        
        # Validate order type
        if order_type not in ['retail', 'wholesale']:
            raise ValidationError(f"Type de commande invalide: {order_type}")
        
        # Create order
        order = Order(
            client=client,
            point_of_sale=point_of_sale,
            created_by=user,
            order_type=order_type,
            status=status,
            payment_method=payment_method,
            notes=notes
        )
        
        # Generate number before validation
        if not order.order_number:
            order.order_number = order.generate_order_number()
            
        order.full_clean()
        order.save()
        
        # Create order items
        for item_data in items_data:
            self._create_order_item(order, item_data)
        
        # Calculate totals
        self.calculate_totals(order)
        
        # If status is validated or delivered, deduct stock immediately
        if status in ['validated', 'processing', 'shipped', 'delivered']:
            self.deduct_stock(order, user)
        
        self.log_info(
            f"Order created: {order.order_number}",
            order_id=order.id,
            client=client.name,
            total=float(order.total_amount)
        )
        
        return order
    
    def _create_order_item(self, order, item_data: Dict[str, Any]):
        """Create an order item"""
        from sales.models import OrderItem
        
        product = item_data.get('product')
        quantity = item_data.get('quantity', 1)
        unit_price = item_data.get('unit_price')
        discount = item_data.get('discount', 0)
        
        self.validate_required(product, "Produit")
        quantity = self.validate_positive_decimal(quantity, "Quantité")
        
        # Use product price if not provided
        if unit_price is None:
            if order.order_type == 'wholesale':
                unit_price = product.wholesale_selling_price
            else:
                unit_price = product.selling_price
        
        unit_price = self.validate_positive_decimal(unit_price, "Prix unitaire")
        
        # Create item
        item = OrderItem(
            order=order,
            product=product,
            quantity=int(quantity),
            unit_price=unit_price,
            discount=discount
        )
        
        # Calculate total before validation
        if not item.total_price:
            from decimal import Decimal, ROUND_HALF_UP
            price = Decimal(str(item.unit_price))
            qty = Decimal(str(item.quantity))
            disc = Decimal(str(item.discount))
            total = (price * qty) * (1 - (disc / Decimal('100')))
            item.total_price = total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
        item.full_clean()
        item.save()
        
        return item
    
    @transaction.atomic
    def update_order(
        self,
        order,
        items_data: List[Dict[str, Any]],
        user: User,
        **kwargs
    ):
        """
        Update an existing order.
        
        Handles smart stock management:
        - If stock was deducted, restore it first, then deduct again with new values
        - If status changes to validated, deduct stock
        - If status changes to cancelled, restore stock
        
        Args:
            order: Order to update
            items_data: New items data
            user: User performing the update
            **kwargs: Additional fields to update
            
        Returns:
            Updated Order instance
        """
        # Check if we need to restore stock first
        old_stock_deducted = order.stock_deducted
        
        # If stock was deducted, restore it before making changes
        if old_stock_deducted:
            self.restore_stock(order, user)
        
        # Update order fields
        for key, value in kwargs.items():
            if hasattr(order, key):
                setattr(order, key, value)
        
        # Delete old items and create new ones
        order.items.all().delete()
        for item_data in items_data:
            self._create_order_item(order, item_data)
        
        # Recalculate totals
        self.calculate_totals(order)
        
        # If status requires stock deduction, deduct it
        if order.status in ['validated', 'processing', 'shipped', 'delivered']:
            self.deduct_stock(order, user)
        
        order.save()
        
        self.log_info(
            f"Order updated: {order.order_number}",
            order_id=order.id,
            user_id=user.id
        )
        
        return order
    
    @transaction.atomic
    def add_order_item(
        self,
        order,
        item_data: Dict[str, Any],
        user: User
    ):
        """
        Add an item to an existing order.
        
        If stock has already been deducted for this order,
        deduct stock for the new item immediately.
        
        Args:
            order: Order to add item to
            item_data: Item data
            user: User performing the operation
            
        Returns:
            Created OrderItem
        """
        item = self._create_order_item(order, item_data)
        
        # Recalculate totals
        self.calculate_totals(order)
        
        # If stock was already deducted, deduct for this new item
        if order.stock_deducted:
            self._deduct_stock_for_item(order, item, user)
        
        return item
    
    @transaction.atomic
    def remove_order_item(
        self,
        order,
        item,
        user: User
    ):
        """
        Remove an item from an order.
        
        If stock has been deducted, restore stock for this item.
        
        Args:
            order: Order to remove item from
            item: Item to remove
            user: User performing the operation
        """
        # If stock was deducted, restore it for this item
        if order.stock_deducted:
            self._restore_stock_for_item(order, item, user)
        
        # Delete the item
        item.delete()
        
        # Recalculate totals
        self.calculate_totals(order)
    
    def calculate_totals(self, order):
        """
        Calculate order totals (subtotal, total).
        
        Args:
            order: Order to calculate totals for
        """
        items = order.items.all()
        from decimal import Decimal, ROUND_HALF_UP
        
        # Calculate subtotal
        order.subtotal = sum(item.total_price for item in items)
        order.subtotal = Decimal(str(order.subtotal)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # Calculate total (No tax)
        order.total_amount = (order.subtotal - order.discount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        if order.total_amount < 0:
            order.total_amount = Decimal('0.00')
        
        # Update payment status
        if order.amount_paid >= order.total_amount:
            order.payment_status = 'paid'
        elif order.amount_paid > 0:
            order.payment_status = 'partial'
        else:
            order.payment_status = 'unpaid'
        
        order.save()
    
    @transaction.atomic
    def deduct_stock(self, order, user: User):
        """
        Deduct stock for all items in an order.
        
        Args:
            order: Order to deduct stock for
            user: User performing the operation
            
        Raises:
            ServiceException: If stock is insufficient
        """
        # Avoid deducting twice
        if order.stock_deducted:
            return
        
        # Validate point of sale
        if not order.point_of_sale:
            raise ServiceException(
                "Impossible de déduire le stock : aucun point de vente associé à cette commande."
            )
        
        # Deduct stock for each item
        items = order.items.all()
        for item in items:
            self._deduct_stock_for_item(order, item, user)
        
        # Mark as deducted
        order.stock_deducted = True
        order.save(update_fields=['stock_deducted'])
        
        self.log_info(
            f"Stock deducted for order {order.order_number}",
            order_id=order.id
        )
    
    def _deduct_stock_for_item(self, order, item, user: User):
        """Deduct stock for a single order item"""
        from inventory.models import StockMovement
        
        # Determine if wholesale based on unit price
        is_wholesale = (item.unit_price == item.product.wholesale_selling_price)
        
        StockMovement.objects.create(
            product=item.product,
            movement_type='exit',
            quantity=item.quantity,
            is_wholesale=is_wholesale,
            from_point_of_sale=order.point_of_sale,
            reference=f"Commande {order.order_number}",
            notes=f"Sortie automatique ({'Gros' if is_wholesale else 'Détail'}) pour commande {order.order_number}",
            user=user
        )
    
    @transaction.atomic
    def restore_stock(self, order, user: User):
        """
        Restore stock for all items in an order (when cancelled).
        
        Args:
            order: Order to restore stock for
            user: User performing the operation
        """
        # If stock was not deducted, nothing to do
        if not order.stock_deducted:
            return
        
        # Validate point of sale
        if not order.point_of_sale:
            raise ServiceException(
                "Impossible de restaurer le stock : aucun point de vente associé à cette commande."
            )
        
        # Restore stock for each item
        items = order.items.all()
        for item in items:
            self._restore_stock_for_item(order, item, user)
        
        # Mark as not deducted
        order.stock_deducted = False
        order.save(update_fields=['stock_deducted'])
        
        self.log_info(
            f"Stock restored for order {order.order_number}",
            order_id=order.id
        )
    
    def _restore_stock_for_item(self, order, item, user: User):
        """Restore stock for a single order item"""
        from inventory.models import StockMovement
        
        # Determine if wholesale based on unit price
        is_wholesale = (item.unit_price == item.product.wholesale_selling_price)
        
        StockMovement.objects.create(
            product=item.product,
            movement_type='return',
            quantity=item.quantity,
            is_wholesale=is_wholesale,
            from_point_of_sale=order.point_of_sale,
            reference=f"Annulation Commande {order.order_number}",
            notes=f"Retour automatique suite à l'annulation de la commande {order.order_number}",
            user=user
        )
    
    @transaction.atomic
    def cancel_order(self, order, user: User):
        """
        Cancel an order and restore stock.
        
        Args:
            order: Order to cancel
            user: User performing the operation
            
        Returns:
            Updated Order
        """
        # Restore stock if it was deducted
        if order.stock_deducted:
            self.restore_stock(order, user)
        
        # Update status
        order.status = 'cancelled'
        order.save()
        
        self.log_info(
            f"Order cancelled: {order.order_number}",
            order_id=order.id,
            user_id=user.id
        )
        
        return order
    
    @transaction.atomic
    def change_status(self, order, new_status: str, user: User):
        """
        Change order status with automatic stock management.
        
        Args:
            order: Order to update
            new_status: New status
            user: User performing the operation
            
        Returns:
            Updated Order
        """
        old_status = order.status
        
        # Validate status
        valid_statuses = ['pending', 'validated', 'processing', 'shipped', 'delivered', 'cancelled']
        if new_status not in valid_statuses:
            raise ValidationError(f"Statut invalide: {new_status}")
        
        # Handle stock based on status change
        if new_status in ['validated', 'processing', 'shipped', 'delivered'] and not order.stock_deducted:
            # Deduct stock when moving to these statuses
            self.deduct_stock(order, user)
        elif new_status == 'cancelled' and order.stock_deducted:
            # Restore stock when cancelling
            self.restore_stock(order, user)
        
        # Update status
        order.status = new_status
        order.save()
        
        self.log_info(
            f"Order status changed: {order.order_number}",
            order_id=order.id,
            old_status=old_status,
            new_status=new_status
        )
        
        return order
