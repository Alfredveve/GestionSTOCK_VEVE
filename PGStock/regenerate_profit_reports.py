#!/usr/bin/env python
"""
Script pour régénérer les rapports de profit mensuels
Inclut maintenant les Orders (ventes POS) en plus des Invoices
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import MonthlyProfitReport
from inventory.services.finance_service import FinanceService
from sales.models import Order
import datetime

def regenerate_profit_reports():
    """Régénère tous les rapports de profit basés sur les Orders et Invoices existants"""
    
    # Supprimer les anciens rapports
    old_count = MonthlyProfitReport.objects.count()
    MonthlyProfitReport.objects.all().delete()
    print(f"✓ {old_count} anciens rapports supprimés")
    
    # Trouver tous les mois avec des orders
    orders = Order.objects.filter(status__in=['paid', 'validated', 'delivered'])
    
    if not orders.exists():
        print("⚠ Aucune commande validée trouvée")
        return
    
    # Grouper par mois/année/POS
    months_to_generate = set()
    for order in orders:
        months_to_generate.add((
            order.date_created.month,
            order.date_created.year,
            order.point_of_sale
        ))
    
    print(f"\n📊 Génération de {len(months_to_generate)} rapport(s)...")
    
    # Générer les rapports
    for month, year, pos in months_to_generate:
        report = FinanceService.generate_monthly_report(month, year, pos)
        print(f"\n✓ Rapport {month}/{year} - {pos.name}")
        print(f"  Ventes brutes: {report.total_sales_brut:,.2f} GNF")
        print(f"  COGS: {report.total_cost_of_goods:,.2f} GNF")
        print(f"  Profit brut: {report.gross_profit:,.2f} GNF")
        print(f"  Dépenses: {report.total_expenses:,.2f} GNF")
        print(f"  Intérêt net: {report.net_interest:,.2f} GNF")
    
    print(f"\n✅ {len(months_to_generate)} rapport(s) généré(s) avec succès!")

if __name__ == '__main__':
    regenerate_profit_reports()
