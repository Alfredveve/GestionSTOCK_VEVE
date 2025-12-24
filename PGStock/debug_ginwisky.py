
import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import Product, StockMovement, Inventory, Receipt, ReceiptItem

def inspect_ginwisky():
    print("--- Inspecting GinWisky ---")
    # Try to find by name, using insensitive search
    products = Product.objects.filter(name__icontains="GinWisky")
    if not products.exists():
        print("Product 'GinWisky' not found. Listing all products:")
        for p in Product.objects.all()[:10]:
            print(f"- {p.name} (SKU: {p.sku})")
        return

    for p in products:
        print(f"\nProduct: {p.name} (SKU: {p.sku})")
        print(f"Units per box: {p.units_per_box}")
        print(f"Selling Price (Detail): {p.selling_price}")
        print(f"Wholesale Price: {p.wholesale_selling_price}")
        
        print("\nInventory per POS:")
        for inv in p.inventory_set.all():
            print(f"- POS: {inv.point_of_sale.name} ({inv.point_of_sale.code}) | Quantity: {inv.quantity}")

        print("\nStock Movements (Last 10):")
        movements = StockMovement.objects.filter(product=p).order_by('-created_at')[:10]
        for m in movements:
            print(f"- {m.created_at}: Type={m.movement_type}, Qty={m.quantity}, Notes={m.notes}")
            
        print("\nReceipt Items (Purchases):")
        receipt_items = ReceiptItem.objects.filter(product=p)
        for ri in receipt_items:
            print(f"- Receipt {ri.receipt.receipt_number}: Qty={ri.quantity}, Wholesale={ri.is_wholesale}, Unit Cost={ri.unit_cost}, Added to Stock={ri.receipt.stock_added}")

if __name__ == "__main__":
    inspect_ginwisky()
