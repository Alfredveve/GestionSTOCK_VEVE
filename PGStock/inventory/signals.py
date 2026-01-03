from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import StockMovement, Invoice, Payment, Expense
from .utils import check_and_send_low_stock_alert
from .services.finance_service import FinanceService

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
    if instance.status in ['paid', 'sent'] and instance.point_of_sale:
        FinanceService.generate_monthly_report(
            instance.date_issued.month, 
            instance.date_issued.year, 
            instance.point_of_sale
        )

@receiver(post_save, sender=Payment)
def update_profit_report_on_payment(sender, instance, **kwargs):
    """Met à jour le rapport financier lors d'un paiement (peut changer le statut de la facture)"""
    invoice = instance.invoice
    if invoice.status in ['paid', 'sent'] and invoice.point_of_sale:
        FinanceService.generate_monthly_report(
            invoice.date_issued.month, 
            invoice.date_issued.year, 
            invoice.point_of_sale
        )

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
