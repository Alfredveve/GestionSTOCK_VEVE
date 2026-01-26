import os
import django
import sys
from decimal import Decimal
from datetime import date

# Configuration de l'environnement Django
sys.path.append(r'c:\Users\codeshester0011\Desktop\GestionSTOCK\PGStock')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import ExpenseCategory, PointOfSale, Product, Category, Client, Invoice, InvoiceItem, Expense, MonthlyProfitReport
from inventory.services import FinanceService

def init_financial_system():
    print("--- Initialisation du système financier ---")
    
    # 1. Créer les catégories de dépenses
    categories = [
        "Salaires",
        "Loyer",
        "Électricité/eau",
        "Marketing",
        "Transport"
    ]
    
    for cat_name in categories:
        obj, created = ExpenseCategory.objects.get_or_create(name=cat_name)
        if created:
            print(f"Catégorie créée: {cat_name}")
        else:
            print(f"Catégorie trouvée: {cat_name}")

    # 2. Test de calcul
    print("\n--- Test de calcul du profit net ---")
    
    # S'assurer d'avoir au moins un POS
    pos = PointOfSale.objects.first()
    if not pos:
        pos = PointOfSale.objects.create(name="Point de Vente Test", code="POS-TEST", is_active=True)
    
    # S'assurer d'avoir un produit avec prix d'achat
    cat = Category.objects.first()
    if not cat:
        cat = Category.objects.create(name="Test Cat")
        
    product, _ = Product.objects.get_or_create(
        sku="TEST-PROD",
        defaults={
            "name": "Produit Test",
            "category": cat,
            "purchase_price": Decimal('600.00'),
            "selling_price": Decimal('1000.00'),
            "units_per_box": 1
        }
    )
    
    # Créer un client
    client, _ = Client.objects.get_or_create(name="Client Test")
    
    # Créer une facture pour le mois en cours
    today = date.today()
    invoice = Invoice.objects.create(
        invoice_number=f"INV-TEST-{today.strftime('%Y%m%d')}",
        client=client,
        point_of_sale=pos,
        date_issued=today,
        date_due=today,
        status='paid',
        subtotal=Decimal('1000.00'),
        tax_rate=Decimal('0.00'),
        tax_amount=Decimal('0.00'),
        total_amount=Decimal('1000.00')
    )
    
    # Item avec remise de 10%
    InvoiceItem.objects.create(
        invoice=invoice,
        product=product,
        quantity=1,
        unit_price=Decimal('1000.00'),
        discount=Decimal('10.00'),
        total=Decimal('900.00') # 1000 - 10%
    )
    
    # Mettre à jour les totaux de la facture
    invoice.calculate_totals()
    print(f"Vente effectuée: {invoice.total_amount} GNF (Remise incluse)")

    # Créer une dépense (Loyer)
    rent_cat = ExpenseCategory.objects.get(name="Loyer")
    Expense.objects.create(
        reference=f"EXP-RENT-{today.month}-{today.year}",
        category=rent_cat,
        point_of_sale=pos,
        amount=Decimal('200.00'),
        date=today,
        description="Loyer du mois"
    )
    print(f"Dépense enregistrée: 200 GNF (Loyer)")

    # Générer le rapport
    report = FinanceService.generate_monthly_report(today.month, today.year, pos)
    
    print("\n--- Résultat du Rapport Mensuel ---")
    print(f"Période: {report.month}/{report.year}")
    print(f"Point de vente: {report.point_of_sale.name}")
    print(f"Ventes Brutes: {report.total_sales_brut}")
    print(f"Remises Accordées: {report.total_discounts}")
    print(f"Coût d'Achat (COGS): {report.total_cost_of_goods}")
    print(f"Charges (Expenses): {report.total_expenses}")
    print(f"-----------------------------------")
    print(f"Bénéfice Brut (Gross Profit): {report.gross_profit}")
    print(f"INTÉRÊT NET (Net Interest): {report.net_interest}")
    
    # Vérification: (1000 brut - 100 remise - 600 achat) = 300 gross. 300 - 200 expense = 100 net.
    expected_net = Decimal('100.00')
    if abs(report.net_interest - expected_net) < Decimal('0.01'):
        print("\n✅ TEST RÉUSSI: Le calcul est correct !")
    else:
        print(f"\n❌ TEST ÉCHOUÉ: Attendu {expected_net}, obtenu {report.net_interest}")

if __name__ == "__main__":
    init_financial_system()
