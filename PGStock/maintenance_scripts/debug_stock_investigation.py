import os
import django
import sys

# Setup Django environment
sys.path.append(r'c:\Users\codeshester0011\Desktop\GestionSTOCK\PGStock')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import Product, Category, PointOfSale, Inventory, Receipt, ReceiptItem, Invoice, InvoiceItem, StockMovement
from django.utils import timezone
from decimal import Decimal

def reproduce():
    print("--- Starting Reproduction ---")
    
    # 1. Setup data
    category, _ = Category.objects.get_or_create(name="Test Category")
    pos, _ = PointOfSale.objects.get_or_create(name="Test POS Investigation", defaults={'code': "PINV", 'is_active': True})
    
    product, created = Product.objects.get_or_create(
        sku="TEST-001",
        defaults={
            'name': "Liqueur Test",
            'category': category,
            'units_per_box': 12,
            'selling_price': Decimal('1000.00'),
            'wholesale_selling_price': Decimal('10000.00'),
        }
    )
    if not created:
        product.units_per_box = 12
        product.save()

    # Clear existing stock for this product at this POS
    Inventory.objects.filter(product=product, point_of_sale=pos).update(quantity=0)
    
    print(f"Product: {product.name}, Units per box: {product.units_per_box}")
    
    # 2. Add 10 cartons (Wholesale purchase)
    receipt = Receipt.objects.create(
        receipt_number=f"REC-TEST-{int(timezone.now().timestamp())}",
        supplier_id=1, # Assume supplier 1 exists
        point_of_sale=pos,
        date_received=timezone.now().date(),
        status='validated'
    )
    
    ReceiptItem.objects.create(
        receipt=receipt,
        product=product,
        quantity=10,
        unit_cost=Decimal('8000.00'),
        is_wholesale=True,
        total=Decimal('80000.00')
    )
    
    print("Adding 10 cartons to stock...")
    receipt.add_stock()
    
    inventory = Inventory.objects.get(product=product, point_of_sale=pos)
    print(f"Stock after receiving 10 cartons: {inventory.quantity} units ({inventory.get_quantity_display()})")
    
    # 3. Quick Sale: 2 bottles (Retail sale)
    invoice = Invoice.objects.create(
        invoice_number=f"INV-TEST-{int(timezone.now().timestamp())}",
        client_id=1, # Assume client 1 exists
        invoice_type='retail',
        point_of_sale=pos,
        date_issued=timezone.now().date(),
        date_due=timezone.now().date(),
        status='paid'
    )
    
    InvoiceItem.objects.create(
        invoice=invoice,
        product=product,
        quantity=2,
        unit_price=product.selling_price,
        is_wholesale=False,
        total=product.selling_price * 2
    )
    
    print("Selling 2 bottles (retail)...")
    invoice.deduct_stock()
    
    inventory.refresh_from_db()
    print(f"Stock after selling 2 bottles: {inventory.quantity} units ({inventory.get_quantity_display()})")
    
    analysis = inventory.get_analysis_data()
    print(f"Analysis: {analysis['analysis']}")
    
    expected_colis = 9
    expected_unites = 10
    
    if analysis['colis'] == expected_colis and analysis['unites'] == expected_unites:
        print("SUCCESS: Calculation matches expected result in backend models.")
    else:
        print(f"FAILURE: Expected {expected_colis} Colis and {expected_unites} Units, but got {analysis['colis']} Colis and {analysis['unites']} Units.")

if __name__ == "__main__":
    # Ensure a supplier and client exist
    from inventory.models import Supplier, Client
    if not Supplier.objects.exists():
        Supplier.objects.create(name="Default Supplier")
    if not Client.objects.exists():
        Client.objects.create(name="Default Client")
        
    reproduce()
