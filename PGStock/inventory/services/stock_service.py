"""
Stock Service

Handles all stock-related business logic:
- Stock movements (entry, exit, transfer, adjustment)
- Inventory updates
- Stock validation
- Bulk operations
"""

from decimal import Decimal
from typing import Optional, Dict, Any, List
from django.db import transaction
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User

from .base import BaseService, ServiceException
from ..models import (
    Product, Inventory, PointOfSale, StockMovement
)


class StockService(BaseService):
    """
    Service for managing stock operations.
    
    All stock movements should go through this service to ensure:
    - Atomic transactions
    - Proper validation
    - Inventory synchronization
    - Audit trail
    """
    
    @transaction.atomic
    def create_stock_movement(
        self,
        product: Product,
        movement_type: str,
        quantity: Decimal,
        user: User,
        from_point_of_sale: Optional[PointOfSale] = None,
        to_point_of_sale: Optional[PointOfSale] = None,
        reference: str = "",
        notes: str = ""
    ) -> StockMovement:
        """
        Create a stock movement and update inventory.
        
        Args:
            product: Product being moved
            movement_type: Type of movement ('entry', 'exit', 'transfer', 'adjustment', 'return')
            quantity: Quantity being moved (always positive)
            user: User performing the operation
            from_point_of_sale: Source point of sale (for exit/transfer)
            to_point_of_sale: Destination point of sale (for entry/transfer)
            reference: Reference document (invoice number, receipt number, etc.)
            notes: Additional notes
            
        Returns:
            Created StockMovement instance
            
        Raises:
            ValidationError: If validation fails
            ServiceException: If business rules are violated
        """
        # Validation
        self._validate_movement_params(
            product, movement_type, quantity, from_point_of_sale, to_point_of_sale
        )
        
        # Check stock availability for exits
        if movement_type in ['exit', 'transfer']:
            self._validate_stock_availability(product, from_point_of_sale, quantity)
        
        # Create the movement
        movement = StockMovement(
            product=product,
            movement_type=movement_type,
            quantity=quantity,
            from_point_of_sale=from_point_of_sale,
            to_point_of_sale=to_point_of_sale,
            reference=reference,
            notes=notes,
            user=user
        )
        
        # Full clean to trigger model validation
        movement.full_clean()
        
        # Save (this will trigger inventory updates via model's save method)
        movement.save()
        
        self.log_info(
            f"Stock movement created: {movement_type} - {quantity} x {product.name}",
            movement_id=movement.id,
            product_id=product.id,
            user_id=user.id
        )
        
        return movement
    
    def _validate_movement_params(
        self,
        product: Product,
        movement_type: str,
        quantity: Decimal,
        from_pos: Optional[PointOfSale],
        to_pos: Optional[PointOfSale]
    ):
        """Validate movement parameters"""
        # Validate product
        self.validate_required(product, "Produit")
        
        # Validate quantity
        quantity = self.validate_positive_decimal(quantity, "Quantité")
        
        # Validate movement type
        valid_types = ['entry', 'exit', 'transfer', 'adjustment', 'return']
        if movement_type not in valid_types:
            raise ValidationError(f"Type de mouvement invalide: {movement_type}")
        
        # Validate point of sale requirements
        if movement_type == 'entry':
            if not to_pos:
                raise ValidationError("Point de vente de destination requis pour une entrée.")
        
        elif movement_type in ['exit', 'adjustment', 'return']:
            if not from_pos:
                raise ValidationError(f"Point de vente source requis pour {movement_type}.")
        
        elif movement_type == 'transfer':
            if not from_pos or not to_pos:
                raise ValidationError("Points de vente source et destination requis pour un transfert.")
            if from_pos == to_pos:
                raise ValidationError("Les points de vente source et destination doivent être différents.")
    
    def _validate_stock_availability(
        self,
        product: Product,
        point_of_sale: PointOfSale,
        quantity: Decimal
    ):
        """
        Validate that sufficient stock is available.
        
        Raises:
            ServiceException: If insufficient stock
        """
        try:
            inventory = Inventory.objects.get(
                product=product,
                point_of_sale=point_of_sale
            )
            available = inventory.quantity
        except Inventory.DoesNotExist:
            available = Decimal('0')
        
        if available < quantity:
            raise ServiceException(
                f"Stock insuffisant pour {product.name} au point de vente {point_of_sale.name}. "
                f"Disponible: {available}, Demandé: {quantity}"
            )
    
    @transaction.atomic
    def process_entry(
        self,
        product: Product,
        quantity: Decimal,
        point_of_sale: PointOfSale,
        user: User,
        reference: str = "",
        notes: str = ""
    ) -> StockMovement:
        """
        Process a stock entry (reception from supplier).
        
        Args:
            product: Product being received
            quantity: Quantity received
            point_of_sale: Destination point of sale
            user: User performing the operation
            reference: Reference (e.g., receipt number)
            notes: Additional notes
            
        Returns:
            Created StockMovement
        """
        return self.create_stock_movement(
            product=product,
            movement_type='entry',
            quantity=quantity,
            user=user,
            to_point_of_sale=point_of_sale,
            reference=reference,
            notes=notes
        )
    
    @transaction.atomic
    def process_exit(
        self,
        product: Product,
        quantity: Decimal,
        point_of_sale: PointOfSale,
        user: User,
        reference: str = "",
        notes: str = ""
    ) -> StockMovement:
        """
        Process a stock exit (sale, loss, etc.).
        
        Args:
            product: Product being removed
            quantity: Quantity removed
            point_of_sale: Source point of sale
            user: User performing the operation
            reference: Reference (e.g., invoice number)
            notes: Additional notes
            
        Returns:
            Created StockMovement
        """
        return self.create_stock_movement(
            product=product,
            movement_type='exit',
            quantity=quantity,
            user=user,
            from_point_of_sale=point_of_sale,
            reference=reference,
            notes=notes
        )
    
    @transaction.atomic
    def process_transfer(
        self,
        product: Product,
        quantity: Decimal,
        from_point_of_sale: PointOfSale,
        to_point_of_sale: PointOfSale,
        user: User,
        reference: str = "",
        notes: str = ""
    ) -> StockMovement:
        """
        Process a stock transfer between points of sale.
        
        Args:
            product: Product being transferred
            quantity: Quantity transferred
            from_point_of_sale: Source point of sale
            to_point_of_sale: Destination point of sale
            user: User performing the operation
            reference: Reference
            notes: Additional notes
            
        Returns:
            Created StockMovement
        """
        return self.create_stock_movement(
            product=product,
            movement_type='transfer',
            quantity=quantity,
            user=user,
            from_point_of_sale=from_point_of_sale,
            to_point_of_sale=to_point_of_sale,
            reference=reference,
            notes=notes
        )
    
    @transaction.atomic
    def process_adjustment(
        self,
        product: Product,
        quantity: Decimal,
        point_of_sale: PointOfSale,
        user: User,
        reference: str = "",
        notes: str = ""
    ) -> StockMovement:
        """
        Process a stock adjustment (inventory correction).
        
        Args:
            product: Product being adjusted
            quantity: Adjustment quantity (can be negative)
            point_of_sale: Point of sale
            user: User performing the operation
            reference: Reference
            notes: Reason for adjustment
            
        Returns:
            Created StockMovement
        """
        # For adjustments, quantity can be negative
        # We store absolute value and let the model handle the sign
        return self.create_stock_movement(
            product=product,
            movement_type='adjustment',
            quantity=abs(quantity),
            user=user,
            from_point_of_sale=point_of_sale,
            reference=reference,
            notes=notes
        )
    
    @transaction.atomic
    def process_return(
        self,
        product: Product,
        quantity: Decimal,
        point_of_sale: PointOfSale,
        user: User,
        reference: str = "",
        notes: str = ""
    ) -> StockMovement:
        """
        Process a stock return (customer return, cancelled sale).
        
        Args:
            product: Product being returned
            quantity: Quantity returned
            point_of_sale: Point of sale receiving the return
            user: User performing the operation
            reference: Reference (e.g., original invoice number)
            notes: Reason for return
            
        Returns:
            Created StockMovement
        """
        return self.create_stock_movement(
            product=product,
            movement_type='return',
            quantity=quantity,
            user=user,
            from_point_of_sale=point_of_sale,
            reference=reference,
            notes=notes
        )
    
    def get_available_stock(
        self,
        product: Product,
        point_of_sale: PointOfSale
    ) -> Decimal:
        """
        Get available stock for a product at a point of sale.
        
        Args:
            product: Product to check
            point_of_sale: Point of sale
            
        Returns:
            Available quantity (Decimal)
        """
        try:
            inventory = Inventory.objects.get(
                product=product,
                point_of_sale=point_of_sale
            )
            return inventory.quantity
        except Inventory.DoesNotExist:
            return Decimal('0')
    
    def check_stock_availability(
        self,
        product: Product,
        point_of_sale: PointOfSale,
        required_quantity: Decimal
    ) -> bool:
        """
        Check if sufficient stock is available.
        
        Args:
            product: Product to check
            point_of_sale: Point of sale
            required_quantity: Required quantity
            
        Returns:
            True if sufficient stock available, False otherwise
        """
        available = self.get_available_stock(product, point_of_sale)
        return available >= required_quantity
    
    @transaction.atomic
    def bulk_update_inventory(
        self,
        updates: List[Dict[str, Any]],
        user: User
    ) -> List[StockMovement]:
        """
        Bulk update inventory (optimized for Excel imports).
        
        Args:
            updates: List of dicts with keys: product, point_of_sale, quantity, movement_type
            user: User performing the operation
            
        Returns:
            List of created StockMovements
        """
        movements = []
        
        for update in updates:
            try:
                movement = self.create_stock_movement(
                    product=update['product'],
                    movement_type=update.get('movement_type', 'adjustment'),
                    quantity=update['quantity'],
                    user=user,
                    from_point_of_sale=update.get('from_point_of_sale'),
                    to_point_of_sale=update.get('to_point_of_sale'),
                    reference=update.get('reference', 'Import en masse'),
                    notes=update.get('notes', '')
                )
                movements.append(movement)
            except (ValidationError, ServiceException) as e:
                self.log_error(
                    f"Erreur lors de la mise à jour en masse: {str(e)}",
                    product_id=update.get('product', {}).get('id') if isinstance(update.get('product'), dict) else None
                )
                # Continue processing other items
                continue
        
        self.log_info(f"Mise à jour en masse terminée: {len(movements)}/{len(updates)} réussies")
        return movements
