import os
import django
import sys

# Setup Django environment
sys.path.append('c:\\Users\\codeshester0011\\Desktop\\GestionSTOCK\\PGStock')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from sales.models import Order
from inventory.pdf_utils import export_order_to_pdf
from django.http import HttpResponse

def test_pdf():
    order = Order.objects.first()
    if not order:
        print("No orders found to test.")
        return
    
    print(f"Testing PDF for Order: {order.order_number}")
    try:
        response = export_order_to_pdf(order)
        print(f"Success! Response type: {type(response)}")
        print(f"Content length: {len(response.content)}")
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_pdf()
