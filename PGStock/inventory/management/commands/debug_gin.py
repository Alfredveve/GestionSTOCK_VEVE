
from django.core.management.base import BaseCommand
from inventory.models import Product, StockMovement, Inventory, ReceiptItem
import sys

class Command(BaseCommand):
    help = 'Debug GinWisky product'

    def handle(self, *args, **options):
        with open('debug_output.txt', 'w', encoding='utf-8') as f:
            f.write("--- Inspecting GinWisky ---\n")
            products = Product.objects.filter(name__icontains="GinWisky")
            
            if not products.exists():
                f.write("Product 'GinWisky' not found. Listing first 10 products:\n")
                for p in Product.objects.all()[:10]:
                    f.write(f"- {p.name} (SKU: {p.sku})\n")
                return

            for p in products:
                f.write(f"\nProduct: {p.name} (SKU: {p.sku})\n")
                f.write(f"Units per box: {p.units_per_box}\n")
                f.write(f"Selling Price: {p.selling_price}\n")
                
                f.write("\nInventory per POS:\n")
                for inv in p.inventory_set.all():
                    f.write(f"- POS: {inv.point_of_sale.name} ({inv.point_of_sale.code}) | Quantity: {inv.quantity}\n")

                f.write("\nStock Movements (Last 10):\n")
                movements = StockMovement.objects.filter(product=p).order_by('-created_at')[:10]
                for m in movements:
                    f.write(f"- {m.created_at}: Type={m.movement_type}, Qty={m.quantity}, Notes='{m.notes}'\n")
                    
                f.write("\nReceipt Items (Purchases):\n")
                receipt_items = ReceiptItem.objects.filter(product=p)
                for ri in receipt_items:
                    f.write(f"- Receipt {ri.receipt.receipt_number}: Qty={ri.quantity}, Wholesale={ri.is_wholesale}, Added={ri.receipt.stock_added}\n")
