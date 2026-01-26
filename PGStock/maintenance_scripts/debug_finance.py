import os
import django
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import Expense, MonthlyProfitReport, PointOfSale
from inventory.services import FinanceService

def debug_finance():
    print("--- Diagnostic Financier ---")
    
    # 1. Obtenir un POS et une date
    pos = PointOfSale.objects.first()
    if not pos:
        print("Erreur: Aucun Point de Vente trouvé.")
        return
    
    month = 1
    year = 2026
    
    print(f"Analyse pour: {pos.name} ({month}/{year})")
    
    # 2. Recalculer le rapport
    report = FinanceService.generate_monthly_report(month, year, pos)
    print(f"État Initial:")
    print(f"  Ventes Brutes: {report.total_sales_brut}")
    print(f"  Dépenses: {report.total_expenses}")
    print(f"  Marge Brute: {report.gross_profit}")
    print(f"  Intérêt Net: {report.net_interest}")
    
    initial_interest = report.net_interest
    
    # 3. Créer une nouvelle dépense (Salaire)
    print("\nAction: Ajout d'un salaire de 1000")
    salary = Expense.objects.create(
        reference=f"DEBUG-SAL-1",
        category_id=3, # Used verified ID 3
        point_of_sale=pos,
        amount=Decimal('1000.00'),
        date=f"{year}-{month:02d}-01",
        description="Salaire Test"
    )
    
    report.refresh_from_db()
    print(f"Après ajout:")
    print(f"  Dépenses: {report.total_expenses}")
    print(f"  Intérêt Net: {report.net_interest}")
    
    # 4. Diminuer le salaire
    print("\nAction: Diminution du salaire de 1000 à 400")
    salary.amount = Decimal('400.00')
    salary.save()
    
    report.refresh_from_db()
    print(f"Après diminution:")
    print(f"  Dépenses: {report.total_expenses}")
    print(f"  Intérêt Net: {report.net_interest}")
    
    if report.net_interest > initial_interest - Decimal('1000'):
        print("\nObservation: L'intérêt net a BIEN augmenté quand la dépense a diminué.")
    
    # Nettoyage
    # salary.delete()
    print("\n--- Fin du Diagnostic ---")

if __name__ == "__main__":
    debug_finance()
