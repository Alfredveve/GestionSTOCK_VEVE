"""
Stock App Signals

Handles signals for the stock application:
- Transfer completion notifications
- Transfer failure handling
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from inventory.models import StockMovement
from inventory.services import NotificationService


# Initialize services
notification_service = NotificationService()


@receiver(post_save, sender=StockMovement)
def notify_transfer_completed(sender, instance, created, **kwargs):
    """
    Create notification when a transfer is completed.
    """
    if created and instance.movement_type == 'transfer':
        # Only notify for transfers between points of sale
        if instance.from_point_of_sale and instance.to_point_of_sale:
            notification_service.notify_transfer_completed(instance)


@receiver(post_save, sender=StockMovement)
def handle_transfer_validation(sender, instance, created, **kwargs):
    """
    Validate transfer movements and handle any errors.
    """
    if created and instance.movement_type == 'transfer':
        # Check if transfer was successful
        # In case of errors, this could create error notifications
        try:
            # Verify stock was properly updated
            if instance.from_point_of_sale:
                from inventory.models import Inventory
                
                # Check if source inventory exists and has enough stock
                try:
                    source_inv = Inventory.objects.get(
                        product=instance.product,
                        point_of_sale=instance.from_point_of_sale
                    )
                    
                    # If stock went negative, this is an error
                    if source_inv.quantity < 0:
                        notification_service.bulk_create_for_staff(
                            title="Erreur de Transfert",
                            message=f"Le transfert {instance.reference} a créé un stock négatif pour {instance.product.name} à {instance.from_point_of_sale.name}",
                            notification_type='error',
                            link="/stock-movements"
                        )
                except Inventory.DoesNotExist:
                    # This shouldn't happen, but log it if it does
                    pass
        except Exception as e:
            # Log any unexpected errors
            print(f"Error validating transfer: {e}")
