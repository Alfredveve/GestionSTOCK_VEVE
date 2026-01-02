import os
import django
import sys
from decimal import Decimal
from datetime import date
from django.test import RequestFactory
from django.urls import reverse

sys.path.append(r'c:\Users\codeshester0011\Desktop\GestionSTOCK\PGStock')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import ExpenseCategory, Expense, MonthlyProfitReport, PointOfSale, User
from inventory.services import FinanceService
from inventory.views import expense_list, profit_report

def verify_system():
    print("--- VÉRIFICATION FINALE DU SYSTÈME FINANCIER ---")
    
    # 1. Vérifier les catégories
    cats = ExpenseCategory.objects.count()
    print(f"✅ Catégories de dépenses: {cats} trouvées")
    
    # 2. Vérifier le rapport mensuel généré précédemment
    today = date.today()
    pos = PointOfSale.objects.first()
    report = MonthlyProfitReport.objects.filter(month=today.month, year=today.year, point_of_sale=pos).first()

    
    if report:
        print(f"✅ Rapport mensuel trouvé pour {pos.name}: Intérêt Net = {report.net_interest} GNF")
    else:
        print("⚠️ Aucun rapport trouvé (peut-être normal si le script précédent a échoué)")

    # 3. Vérifier le rendu des vues (Smoke Test)
    factory = RequestFactory()
    user = User.objects.filter(is_superuser=True).first()
    
    # Test Expense List View
    try:
        request = factory.get('/inventory/finance/expenses/')
        request.user = user
        response = expense_list(request)
        if response.status_code == 200:
            print("✅ Vue 'Liste des Dépenses' fonctionne (Code 200)")
        else:
            print(f"❌ Vue 'Liste des Dépenses' a échoué (Code {response.status_code})")
    except Exception as e:
        print(f"❌ Erreur lors du test de la vue 'Liste des Dépenses': {e}")

    # Test Profit Report View
    try:
        request = factory.get('/inventory/finance/profit-report/')
        request.user = user
        response = profit_report(request)
        if response.status_code == 200:
            print("✅ Vue 'Rapport de Profit' fonctionne (Code 200)")
        else:
            print(f"❌ Vue 'Rapport de Profit' a échoué (Code {response.status_code})")
    except Exception as e:
        print(f"❌ Erreur lors du test de la vue 'Rapport de Profit': {e}")

if __name__ == "__main__":
    verify_system()
