from django.db.models.signals import post_save
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
    """Met à jour le rapport financier lors d'une nouvelle dépense"""
    if instance.point_of_sale:
        FinanceService.generate_monthly_report(
            instance.date.month, 
            instance.date.year, 
            instance.point_of_sale
        )
