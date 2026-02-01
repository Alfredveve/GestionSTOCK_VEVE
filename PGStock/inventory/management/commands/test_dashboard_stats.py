from django.core.management.base import BaseCommand
from inventory.models import Inventory, Product, PointOfSale
from django.db.models import F, Sum, Count
from sales.models import Order

class Command(BaseCommand):
    help = 'Test dashboard stats logic'

    def handle(self, *args, **options):
        self.stdout.write("Testing Dashboard Logic...")

        # 1. Check Low Stock Count
        low_stock_count = Inventory.objects.filter(quantity__lte=F('reorder_level')).count()
        self.stdout.write(f"Low Stock Count from DB: {low_stock_count}")

        # 2. Check Low Stock Products list
        low_stock_qs = Inventory.objects.filter(quantity__lte=F('reorder_level')).select_related('product', 'point_of_sale')
        count = low_stock_qs.count()
        self.stdout.write(f"Low Stock QS Count: {count}")
        
        for inv in low_stock_qs[:5]:
             self.stdout.write(f" - {inv.product.name} (Qty: {inv.quantity}, Reorder: {inv.reorder_level})")

        self.stdout.write("--- All Inventories ---")
        for inv in Inventory.objects.all():
            self.stdout.write(f"ID: {inv.id} | Product: {inv.product.name} | POS: {inv.point_of_sale.name} | Qty: {inv.quantity} | Reorder: {inv.reorder_level}")


        # 3. Check Total Stock Value
        total_stock_value = Inventory.objects.aggregate(
            total_value=Sum(F('quantity') * F('product__purchase_price'))
        )['total_value'] or 0
        self.stdout.write(f"Total Stock Value: {total_stock_value}")

        # 4. Check if we have any products/inventory
        self.stdout.write(f"Total Products: {Product.objects.count()}")
        self.stdout.write(f"Total Inventories: {Inventory.objects.count()}")
