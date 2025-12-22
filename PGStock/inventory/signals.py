from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import StockMovement
from .utils import check_and_send_low_stock_alert

@receiver(post_save, sender=StockMovement)
def check_stock_after_movement(sender, instance, created, **kwargs):
    """
    Trigger low stock check after any stock movement.
    """
    if created:
        check_and_send_low_stock_alert(instance.product)
