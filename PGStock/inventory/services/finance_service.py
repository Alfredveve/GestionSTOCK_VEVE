from django.db.models import Sum, F
from decimal import Decimal
from ..models import Invoice, InvoiceItem, Expense, MonthlyProfitReport, PointOfSale
import datetime

class FinanceService:
    """Service pour gérer les calculs financiers et les rapports de profit"""

    @staticmethod
    def generate_monthly_report(month, year, point_of_sale):
        """Génère ou met à jour le rapport de profit pour un POS et un mois donné"""
        
        # 1. Calculer le total des ventes et du coût d'achat pour ce mois et ce POS
        # On ne prend que les factures payées
        invoices = Invoice.objects.filter(
            date_issued__month=month,
            date_issued__year=year,
            point_of_sale=point_of_sale,
            status='paid'
        )
        
        total_sales_brut = Decimal('0.00')
        total_discounts = Decimal('0.00')
        total_cogs = Decimal('0.00')
        
        for inv in invoices:
            # Remise globale sur la facture
            total_discounts += inv.discount_amount
            
            items = inv.invoiceitem_set.all()
            for item in items:
                # Vente brute (avant remise ligne)
                brut_line = item.quantity * item.unit_price
                total_sales_brut += brut_line
                
                # Remise sur la ligne
                if item.discount:
                    total_discounts += (brut_line * (item.discount / Decimal('100')))
                
                # Coût d'achat (COGS)
                total_cogs += item.quantity * item.product.purchase_price

        # 2. Calculer le total des dépenses pour ce mois et ce POS
        expenses_total = Expense.objects.filter(
            date__month=month,
            date__year=year,
            point_of_sale=point_of_sale
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # 3. Créer ou mettre à jour le rapport
        report, created = MonthlyProfitReport.objects.get_or_create(
            month=month,
            year=year,
            point_of_sale=point_of_sale
        )
        
        report.total_sales_brut = total_sales_brut
        report.total_discounts = total_discounts
        report.total_cost_of_goods = total_cogs
        report.total_expenses = expenses_total
        
        report.calculate_totals()
        report.save()
        
        return report

    @staticmethod
    def update_all_reports_for_month(month, year):
        """Met à jour les rapports de tous les POS pour un mois donné"""
        reports = []
        for pos in PointOfSale.objects.all():
            reports.append(FinanceService.generate_monthly_report(month, year, pos))
        return reports
