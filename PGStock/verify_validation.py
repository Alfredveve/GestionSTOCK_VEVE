import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import Product, Inventory, StockMovement, PointOfSale
from django.core.exceptions import ValidationError

def test_validation():
    print("--- Testing StockMovement Validation Message ---")
    p = Product.objects.filter(units_per_box__gt=1).first()
    if not p:
        print("No product with units_per_box > 1 found.")
        return
        
    pos = PointOfSale.objects.first()
    if not pos:
        print("No PointOfSale found.")
        return
        
    inv, _ = Inventory.objects.get_or_create(product=p, point_of_sale=pos)
    inv.quantity = 12
    inv.reorder_level = 10
    inv.save()
    
    # Try to withdraw 5 units (12 - 5 = 7, which is < 10)
    m = StockMovement(
        product=p,
        movement_type='exit',
        quantity=5,
        from_point_of_sale=pos
    )
    
    print(f"Product: {p.name}, UPB: {p.units_per_box}")
    print(f"Current Stock: {inv.quantity} (1 Colis)")
    print(f"Reorder Level: {inv.reorder_level}")
    print(f"Attempting to withdraw 5 units...")
    
    try:
        m.clean()
    except ValidationError as e:
        print("\nSUCCESS! ValidationError message follows:")
        print(e.messages[0])
    except Exception as e:
        print(f"\nFAILED with unexpected exception: {type(e).__name__}: {e}")
    else:
        print("\nFAILED: No ValidationError raised!")

if __name__ == "__main__":
    test_validation()
