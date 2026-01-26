"""
Sales App Signals

Handles signals for the sales application:
- Order creation notifications
- Order status change notifications
- Order validation with stock deduction
- Order cancellation with stock restoration
"""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.db import transaction

from sales.models import Order
from inventory.services import NotificationService, OrderService


# Initialize services
notification_service = NotificationService()
order_service = OrderService()


@receiver(post_save, sender=Order)
def notify_order_created(sender, instance, created, **kwargs):
    """
    Create notification when a new order is created.
    """
    if created:
        notification_service.notify_order_created(instance)


@receiver(pre_save, sender=Order)
def track_order_status_change(sender, instance, **kwargs):
    """
    Track order status changes before save.
    """
    if instance.pk:
        try:
            old_instance = Order.objects.get(pk=instance.pk)
            if old_instance.status != instance.status:
                # Store old status for post_save signal
                instance._old_status = old_instance.status
        except Order.DoesNotExist:
            pass


@receiver(post_save, sender=Order)
def handle_order_status_change(sender, instance, created, **kwargs):
    """
    Handle order status changes:
    - Notify staff of status change
    - Deduct stock when validated
    - Restore stock when cancelled
    """
    if not created and hasattr(instance, '_old_status'):
        old_status = instance._old_status
        new_status = instance.status
        
        # Notify status change
        notification_service.notify_order_status_changed(instance, old_status, new_status)
        
        # Handle stock based on status change
        if new_status in ['validated', 'processing', 'shipped', 'delivered'] and not instance.stock_deducted:
            # Deduct stock when moving to these statuses
            try:
                with transaction.atomic():
                    order_service.deduct_stock(instance, instance.created_by)
            except Exception as e:
                # Log error but don't fail the save
                print(f"Error deducting stock for order {instance.order_number}: {e}")
        
        elif new_status == 'cancelled' and instance.stock_deducted:
            # Restore stock when cancelling
            try:
                with transaction.atomic():
                    order_service.restore_stock(instance, instance.created_by)
            except Exception as e:
                # Log error but don't fail the save
                print(f"Error restoring stock for order {instance.order_number}: {e}")
        
        # Clean up temporary attribute
        if hasattr(instance, '_old_status'):
            delattr(instance, '_old_status')
