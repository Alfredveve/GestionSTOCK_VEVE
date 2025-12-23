import os
import django
import sys

# Setup Django environment
sys.path.append(r'c:\Users\codeshester0011\Desktop\GestionSTOCK\PGStock')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import Receipt, ReceiptItem, Product, PointOfSale, Supplier, Inventory, Category
from decimal import Decimal
from django.contrib.auth.models import User

def verify_stock_impact():
    print("--- Starting Stock Impact Verification ---")
    
    # 1. Setup data
    user = User.objects.first()
    pos = PointOfSale.objects.first()
    if not pos:
        pos = PointOfSale.objects.create(name="POS Test", code="POSTEST")
    
    supplier = Supplier.objects.first()
    if not supplier:
        supplier = Supplier.objects.create(name="Supplier Test")
    
    category = Category.objects.first()
    if not category:
        category = Category.objects.create(name="Category Test")
        
    product = Product.objects.create(
        name="Test Product for Receipt",
        category=category,
        purchase_price=Decimal('100.00'),
        selling_price=Decimal('150.00')
    )
    
    # Initial stock
    inv, _ = Inventory.objects.get_or_create(product=product, point_of_sale=pos)
    initial_qty = inv.quantity
    print(f"Initial Stock: {initial_qty}")
    
    # 2. Create Draft Receipt
    receipt = Receipt.objects.create(
        supplier=supplier,
        point_of_sale=pos,
        date_received="2025-12-22",
        status='draft',
        created_by=user
    )
    receipt.receipt_number = receipt.generate_receipt_number()
    receipt.save()
    
    item = ReceiptItem.objects.create(
        receipt=receipt,
        product=product,
        quantity=10,
        unit_cost=Decimal('100.00'),
        total=Decimal('1000.00')
    )
    
    # Verify no impact in draft
    inv.refresh_from_db()
    print(f"Stock after Draft: {inv.quantity} (Expected: {initial_qty})")
    assert inv.quantity == initial_qty
    
    # 3. Validate Receipt (Simulate view logic)
    print("Validating receipt...")
    receipt.status = 'validated'
    receipt.save()
    receipt.add_stock()
    
    inv.refresh_from_db()
    print(f"Stock after Validation: {inv.quantity} (Expected: {initial_qty + 10})")
    assert inv.quantity == initial_qty + 10
    assert receipt.stock_added == True
    
    # 4. Revert to Draft (Simulate view logic)
    print("Reverting to draft...")
    receipt.status = 'draft'
    receipt.save()
    receipt.revert_stock()
    
    inv.refresh_from_db()
    print(f"Stock after Revert: {inv.quantity} (Expected: {initial_qty})")
    assert inv.quantity == initial_qty
    assert receipt.stock_added == False
    
    print("--- Verification Successful! ---")
    
    # Cleanup
    item.delete()
    receipt.delete()
    product.delete()

if __name__ == "__main__":
    try:
        verify_stock_impact()
    except Exception as e:
        print(f"Verification Failed: {str(e)}")
        import traceback
        traceback.print_exc()
