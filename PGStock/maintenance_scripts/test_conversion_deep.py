import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import Quote, QuoteItem, Product, Client, Invoice, Category, PointOfSale
from django.contrib.auth.models import User
from inventory.services import InvoiceService
from decimal import Decimal

def test_quote_conversion():
    print("--- Démarrage du test de conversion ---")
    
    # 1. Setup data
    user = User.objects.filter(is_superuser=True).first()
    if not user:
        user = User.objects.create_superuser('testadmin', 'admin@test.com', 'password123')
    
    client = Client.objects.first()
    if not client:
        client = Client.objects.create(name="Client Test", client_type='individual')
        
    category = Category.objects.first()
    if not category:
        category = Category.objects.create(name="Cat Test")
        
    product = Product.objects.first()
    if not product:
        product = Product.objects.create(
            name="Produit Test", 
            sku="TEST-001", 
            category=category,
            purchase_price=Decimal('100'),
            selling_price=Decimal('150'),
            units_per_box=10
        )
        
    pos = PointOfSale.objects.first()
    if not pos:
        pos = PointOfSale.objects.create(name="POS Test", code="POS01")

    # 2. Create Quote
    print(f"Création d'un devis pour {client.name}...")
    quote = Quote.objects.create(
        client=client,
        quote_type='wholesale',
        date_issued="2025-12-22",
        valid_until="2026-01-22",
        created_by=user,
        tax_rate=Decimal('16')
    )
    quote.quote_number = quote.generate_quote_number()
    quote.save()
    
    QuoteItem.objects.create(
        quote=quote,
        product=product,
        quantity=5,
        unit_price=Decimal('150'),
        is_wholesale=True,
        discount=Decimal('10')
    )
    quote.calculate_totals()
    
    print(f"Devis {quote.quote_number} créé. Total: {quote.total_amount}")
    
    # 3. Convert using Service
    print("Conversion du devis en facture via InvoiceService...")
    service = InvoiceService()
    try:
        invoice = service.convert_quote_to_invoice(quote, user, pos)
        print(f"Facture {invoice.invoice_number} créée avec succès !")
        
        # 4. Assertions
        assert invoice.client == quote.client
        print(f"Facture Total: {invoice.total_amount} ({type(invoice.total_amount)})")
        print(f"Devis Total: {quote.total_amount} ({type(quote.total_amount)})")
        assert Decimal(str(invoice.total_amount)) == Decimal(str(quote.total_amount))
        assert invoice.invoiceitem_set.count() == quote.quoteitem_set.count()
        assert quote.status == 'converted'
        
        # Check Item
        inv_item = invoice.invoiceitem_set.first()
        quo_item = quote.quoteitem_set.first()
        assert inv_item.product == quo_item.product
        assert inv_item.quantity == quo_item.quantity
        assert inv_item.unit_price == quo_item.unit_price
        
        print("Toutes les assertions de base ont réussi !")
        
        # 5. Check missing features (Wholesale)
        print("\nVUE ANALYTIQUE :")
        print(f"Type facture : {invoice.invoice_type} (Attendu: wholesale)")
        assert invoice.invoice_type == 'wholesale'
        print(f"Article gros ? : {inv_item.is_wholesale} (Attendu: True)")
        assert inv_item.is_wholesale == True
        
        print("\n--- TEST RÉUSSI AVEC SUCCÈS ---")
        
    except Exception as e:
        print(f"ERREUR lors de la conversion : {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_quote_conversion()
