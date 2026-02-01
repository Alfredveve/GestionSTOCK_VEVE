import os
import sys
import django
from django.db.models import Sum, F

# Add the project directory to the sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up the Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import Product, Inventory

def analyze_stock():
    with open('debug_output.txt', 'w', encoding='utf-8') as f:
        f.write("--- Analysing Stock Value ---\n")
        
        total_products = Product.objects.count()
        f.write(f"Total Products: {total_products}\n")
        
        products_in_stock = Product.objects.filter(inventory__quantity__gt=0).distinct().count()
        f.write(f"Products with Stock > 0: {products_in_stock}\n")

        # Calculate Total Value using SELLING PRICE (as in GlobalStockDashboard)
        total_value_selling = Inventory.objects.aggregate(
            total=Sum(F('quantity') * F('product__selling_price'))
        )['total'] or 0
        
        # Calculate Total Value using PURCHASE PRICE
        total_value_purchase = Inventory.objects.aggregate(
            total=Sum(F('quantity') * F('product__purchase_price'))
        )['total'] or 0

        f.write(f"Total Stock Value (Selling Price): {total_value_selling:,.2f} GNF\n")
        f.write(f"Total Stock Value (Purchase Price): {total_value_purchase:,.2f} GNF\n")
        
        f.write("\n--- Top 10 Products by Value (Selling Price) ---\n")
        top_products = Product.objects.annotate(
            total_qty=Sum('inventory__quantity'),
            stock_value=Sum(F('inventory__quantity') * F('selling_price'))
        ).filter(total_qty__gt=0).order_by('-stock_value')[:10]

        for p in top_products:
            f.write(f"Product: {p.name} (SKU: {p.sku})\n")
            f.write(f"  Total Quantity: {p.total_qty}\n")
            f.write(f"  Selling Price: {p.selling_price:,.2f} GNF\n")
            f.write(f"  Total Value: {p.stock_value:,.2f} GNF\n")
            f.write("-" * 30 + "\n")

if __name__ == "__main__":
    analyze_stock()
