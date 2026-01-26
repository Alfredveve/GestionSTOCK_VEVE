import os
import django
import sys
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth.models import User

# Setup Django environment
sys.path.append('c:\\Users\\codeshester0011\\Desktop\\GestionSTOCK\\PGStock')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from sales.api import OrderViewSet
from sales.models import Order

def test_endpoint():
    factory = APIRequestFactory()
    order = Order.objects.filter(id=6).first() or Order.objects.first()
    if not order:
        print("No orders found.")
        return
        
    print(f"Testing download_pdf endpoint for Order: {order.order_number} (ID: {order.id})")
    
    view = OrderViewSet.as_view({'get': 'download_pdf'})
    request = factory.get(f'/api/v1/orders/{order.id}/download_pdf/')
    
    user = User.objects.first()
    force_authenticate(request, user=user)
    
    try:
        response = view(request, pk=order.id)
        print(f"Status Code: {response.status_code}")
        print(f"Content Type: {response.get('Content-Type')}")
        # print(f"Content Start: {response.content[:100]}")
        if response.status_code == 200:
            print("SUCCESS: Endpoint returned 200")
        else:
            print(f"FAILURE: Received {response.status_code}")
            if hasattr(response, 'data'):
                print(f"Response Data: {response.data}")
    except Exception as e:
        print(f"CRASH: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_endpoint()
