import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "PGStock.settings")
django.setup()

from django.test import RequestFactory
from django.contrib.auth.models import User
from inventory.views.old_views import export_stock_movements_pdf

def reproduce():
    try:
        request = RequestFactory().get('/inventory/reports/stock-movements/pdf/')
        # Use an existing user or create a mock one. Since it's a test, let's just use the first available or create one.
        user = User.objects.filter(is_staff=True).first()
        if not user:
             user = User(username='admin', is_staff=True, is_superuser=True)
             
        request.user = user
        response = export_stock_movements_pdf(request)
        print(f"Success! Response Status: {response.status_code}")
        if response.status_code == 500:
            print("Response Content:")
            print(response.content.decode('utf-8'))
        return True
    except Exception as e:
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    reproduce()
