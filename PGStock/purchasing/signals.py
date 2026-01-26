"""
Purchasing App Signals

Handles signals for the purchasing application:
- Receipt validation notifications
- Receipt cancellation handling
"""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from inventory.models import Receipt
from inventory.services import NotificationService


# Initialize services
notification_service = NotificationService()


@receiver(pre_save, sender=Receipt)
def track_receipt_status_change(sender, instance, **kwargs):
    """
    Track receipt status changes before save.
    """
    if instance.pk:
        try:
            old_instance = Receipt.objects.get(pk=instance.pk)
            if old_instance.status != instance.status:
                # Store old status for post_save signal
                instance._old_status = old_instance.status
        except Receipt.DoesNotExist:
            pass


@receiver(post_save, sender=Receipt)
def handle_receipt_status_change(sender, instance, created, **kwargs):
    """
    Handle receipt status changes:
    - Notify staff when receipt is validated
    - Handle cancellation if needed
    """
    if not created and hasattr(instance, '_old_status'):
        old_status = instance._old_status
        new_status = instance.status
        
        # Notify when receipt is validated
        if new_status == 'validated' and old_status != 'validated':
            notification_service.notify_receipt_validated(instance)
        
        # Clean up temporary attribute
        delattr(instance, '_old_status')


@receiver(post_save, sender=Receipt)
def notify_receipt_created(sender, instance, created, **kwargs):
    """
    Create notification when a new receipt is created.
    """
    if created:
        from inventory.services import NotificationService
        notification_service = NotificationService()
        
        notification_service.bulk_create_for_staff(
            title="Nouveau Bon de Réception",
            message=f"Bon de réception {instance.receipt_number} créé - Fournisseur: {instance.supplier.name}",
            notification_type='info',
            link=f"/receipts/{instance.id}"
        )
