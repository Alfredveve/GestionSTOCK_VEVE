from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from inventory.models import Invoice, Notification
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Vérifie les factures arrivant à échéance et crée des notifications'

    def handle(self, *args, **kwargs):
        today = timezone.now().date()
        tomorrow = today + timedelta(days=1)
        
        # Factures dues aujourd'hui ou demain (non payées)
        due_invoices = Invoice.objects.filter(
            date_due__lte=tomorrow,
            status__in=['sent', 'partial', 'draft']
        )
        
        staff_users = User.objects.filter(is_staff=True)
        created_count = 0
        
        for invoice in due_invoices:
            for user in staff_users:
                # Éviter les doublons
                existing = Notification.objects.filter(
                    recipient=user,
                    title="Échéance de Paiement",
                    link=f"/invoices",
                    created_at__date=today
                ).exists()
                
                if not existing:
                    Notification.objects.create(
                        recipient=user,
                        title="Échéance de Paiement",
                        message=f"La facture {invoice.invoice_number} arrive à échéance le {invoice.date_due.strftime('%d/%m/%Y')} - Solde: {invoice.get_remaining_amount()} GNF",
                        notification_type='warning',
                        link=f"/invoices"
                    )
                    created_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'{created_count} notifications créées pour {due_invoices.count()} factures à échéance.')
        )
