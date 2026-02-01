
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

def check_prices():
    print("--- Checking Buying Prices ---")
    
    # Get products contributing most to Purchase Price Value
    top_products = Product.objects.annotate(
        total_qty=Sum('inventory__quantity'),
        stock_value_buying=Sum(F('inventory__quantity') * F('purchase_price'))
    ).filter(total_qty__gt=0).order_by('-stock_value_buying')[:5]

    for p in top_products:
        print(f"Product: {p.name}")
        print(f"  Qty: {p.total_qty}")
        print(f"  Buying Price: {p.purchase_price:,.2f} GNF")
        print(f"  Selling Price: {p.selling_price:,.2f} GNF")
        print(f"  Total Buying Value: {p.stock_value_buying:,.2f} GNF")
        print("-" * 30)

if __name__ == "__main__":
    check_prices()
