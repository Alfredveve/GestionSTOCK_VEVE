from django.core.management.base import BaseCommand
from inventory.models import MonthlyProfitReport
from inventory.services.finance_service import FinanceService
from sales.models import Order
from django.utils import timezone

class Command(BaseCommand):
    help = 'Régénère les rapports de profit mensuels basés sur les factures et commandes réelles'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Supprime les rapports existants avant de générer')

    def handle(self, *args, **options):
        if options['clear']:
            count = MonthlyProfitReport.objects.count()
            MonthlyProfitReport.objects.all().delete()
            self.stdout.write(self.style.SUCCESS(f"{count} anciens rapports supprimés."))

        # Logic from regenerate_profit_reports.py
        orders = Order.objects.filter(status__in=['paid', 'validated', 'delivered'])
        
        if not orders.exists():
            self.stdout.write(self.style.WARNING("Aucune commande validée trouvée."))
            return

        months_to_generate = set()
        for order in orders:
            # Handle potential timezone naive dates if necessary
            date = order.date_created
            months_to_generate.add((
                date.month,
                date.year,
                order.point_of_sale
            ))

        self.stdout.write(f"Génération de {len(months_to_generate)} rapports...")

        for month, year, pos in months_to_generate:
            if not pos:
                continue
            try:
                report = FinanceService.generate_monthly_report(month, year, pos)
                self.stdout.write(self.style.SUCCESS(f"✓ Rapport {month}/{year} - {pos.name} : Net {report.net_interest} GNF"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Erreur pour {month}/{year} - {pos.name}: {e}"))

        self.stdout.write(self.style.SUCCESS("\nTerminé !"))
