import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import Product, Inventory, PointOfSale, Category, StockMovement
from django.core.exceptions import ValidationError

def test_stock_display():
    print("--- Testing Stock Display Logic ---")
    
    # Get or create a point of sale
    pos, _ = PointOfSale.objects.get_or_create(code='TEST_POS', defaults={'name': 'Test POS'})
    cat, _ = Category.objects.get_or_create(name='Test Category')
    
    # Test product with 12 units per box
    product = Product.objects.create(
        name="Test Display Product",
        sku="DISP-001",
        category=cat,
        units_per_box=12,
        selling_price=100
    )
    
    inventory = Inventory.objects.create(
        product=product,
        point_of_sale=pos,
        quantity=17,
        reorder_level=5
    )
    
    print(f"Product: {product.name} (UPB: {product.units_per_box})")
    print(f"Inventory Quantity: {inventory.quantity}")
    print(f"Display Method Output: {inventory.get_quantity_display()}")
    
    # Test validation error message
    movement = StockMovement(
        product=product,
        movement_type='exit',
        quantity=20,
        from_point_of_sale=pos
    )
    
    print("\nAttempting to withdraw 20 units (resulting in -3, below min 5)...")
    try:
        movement.clean()
    except ValidationError as e:
        print(f"Caught Expected ValidationError:\n{e.messages[0]}")
    
    # Cleanup
    inventory.delete()
    product.delete()
    print("\nTest Finished.")

if __name__ == "__main__":
    test_stock_display()
