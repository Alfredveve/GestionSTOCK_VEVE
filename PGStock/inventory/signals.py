from django.db.models.signals import post_save, post_delete, pre_save, pre_delete
from django.dispatch import receiver
from .models import StockMovement, Invoice, Payment, Expense, Product
from .utils import check_and_send_low_stock_alert
from .services.finance_service import FinanceService
from .services.notification_service import NotificationService

# Initialize notification service
notification_service = NotificationService()

@receiver(post_save, sender=StockMovement)
def check_stock_after_movement(sender, instance, created, **kwargs):
    """
    Trigger low stock check after any stock movement.
    """
    if created:
        check_and_send_low_stock_alert(instance.product)

@receiver(post_save, sender=Invoice)
def update_profit_report_on_invoice(sender, instance, **kwargs):
    """Met à jour le rapport financier quand une facture est modifiée"""
    # Ensure date_issued is a date object (could be string if assigned manually)
    from datetime import date, datetime
    d = instance.date_issued
    if isinstance(d, str):
        try:
            d = datetime.strptime(d, '%Y-%m-%d').date()
        except ValueError:
            return

    if d and instance.status in ['paid', 'sent'] and instance.point_of_sale:
        try:
            FinanceService.generate_monthly_report(
                d.month, 
                d.year, 
                instance.point_of_sale
            )
        except Exception:
            pass

@receiver(post_save, sender=Payment)
def update_profit_report_on_payment(sender, instance, **kwargs):
    """Met à jour le rapport financier lors d'un paiement (peut changer le statut de la facture)"""
    invoice = instance.invoice
    from datetime import date, datetime
    d = invoice.date_issued
    if isinstance(d, str):
        try:
            d = datetime.strptime(d, '%Y-%m-%d').date()
        except ValueError:
            return

    if d and invoice.status in ['paid', 'sent'] and invoice.point_of_sale:
        try:
            FinanceService.generate_monthly_report(
                d.month, 
                d.year, 
                invoice.point_of_sale
            )
        except Exception:
            pass


@receiver(post_save, sender=Expense)
def update_profit_report_on_expense(sender, instance, **kwargs):
    """Met à jour le rapport financier lors d'une nouvelle dépense ou modification"""
    FinanceService.recalculate_report_for_expense(instance)
    
    # Si la date ou le POS a changé, on recalcule aussi l'ancien rapport
    if hasattr(instance, '_old_date') and hasattr(instance, '_old_pos'):
        FinanceService.recalculate_report_for_date(instance._old_date, instance._old_pos)

@receiver(pre_save, sender=Expense)
def handle_expense_changes(sender, instance, **kwargs):
    """Détecter les changements de date ou de point de vente avant la sauvegarde"""
    if instance.pk:
        try:
            old_instance = Expense.objects.get(pk=instance.pk)
            if old_instance.date != instance.date or old_instance.point_of_sale != instance.point_of_sale:
                instance._old_date = old_instance.date
                instance._old_pos = old_instance.point_of_sale
        except Expense.DoesNotExist:
            pass

@receiver(post_delete, sender=Expense)
def update_profit_report_on_expense_delete(sender, instance, **kwargs):
    """Met à jour le rapport financier après la suppression d'une dépense"""
    FinanceService.recalculate_report_for_expense(instance)


# ===== NOTIFICATION SIGNALS =====
from .models import Notification, Inventory
from django.contrib.auth.models import User

@receiver(post_save, sender=Inventory)
def notify_low_stock(sender, instance, **kwargs):
    """Créer une notification quand le stock est faible"""
    if instance.is_low_stock():
        notification_service.notify_low_stock(instance.product, instance)

@receiver(post_save, sender=Invoice)
def notify_new_invoice(sender, instance, created, **kwargs):
    """Créer une notification lors de la création d'une facture"""
    if created:
        notification_service.notify_invoice_created(instance)

@receiver(post_save, sender=Payment)
def notify_payment_received(sender, instance, created, **kwargs):
    """Créer une notification lors d'un paiement"""
    if created:
        notification_service.notify_payment_received(instance)


# ===== PRODUCT SIGNALS =====
@receiver(pre_save, sender=Product)
def track_product_price_changes(sender, instance, **kwargs):
    """Track product price changes before save"""
    if instance.pk:
        try:
            old_instance = Product.objects.get(pk=instance.pk)
            
            # Track retail price change
            if old_instance.selling_price != instance.selling_price:
                instance._old_selling_price = old_instance.selling_price
                instance._selling_price_changed = True
            
            # Track wholesale price change
            if old_instance.wholesale_selling_price != instance.wholesale_selling_price:
                instance._old_wholesale_price = old_instance.wholesale_selling_price
                instance._wholesale_price_changed = True
        except Product.DoesNotExist:
            pass

@receiver(post_save, sender=Product)
def notify_product_price_changed(sender, instance, created, **kwargs):
    """Notify when product prices change"""
    if not created:
        # Notify retail price change
        if hasattr(instance, '_selling_price_changed') and instance._selling_price_changed:
            notification_service.notify_product_price_changed(
                instance,
                instance._old_selling_price,
                instance.selling_price,
                'retail'
            )
            delattr(instance, '_selling_price_changed')
            delattr(instance, '_old_selling_price')
        
        # Notify wholesale price change
        if hasattr(instance, '_wholesale_price_changed') and instance._wholesale_price_changed:
            notification_service.notify_product_price_changed(
                instance,
                instance._old_wholesale_price,
                instance.wholesale_selling_price,
                'wholesale'
            )
            delattr(instance, '_wholesale_price_changed')
            delattr(instance, '_old_wholesale_price')

@receiver(pre_delete, sender=Product)
def validate_product_deletion(sender, instance, **kwargs):
    """Validate that product can be deleted (no remaining stock)"""
    from django.core.exceptions import ValidationError
    
    # Check if product has any stock
    total_stock = instance.get_total_stock_quantity()
    if total_stock > 0:
        # Create warning notification instead of blocking
        notification_service.bulk_create_for_staff(
            title="Tentative de Suppression de Produit",
            message=f"Attention: Tentative de suppression du produit '{instance.name}' avec {total_stock} unités en stock.",
            notification_type='warning',
            link=f"/products"
        )
        
        # Uncomment to actually block deletion:
        # raise ValidationError(
        #     f"Impossible de supprimer le produit '{instance.name}' : {total_stock} unités en stock."
        # )
