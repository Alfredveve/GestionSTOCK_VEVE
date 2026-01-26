from django.contrib.auth.models import User
from inventory.models import Quote, PointOfSale, Invoice, Client
from datetime import date
import django
import os

# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
# django.setup()

def simulate_fresh():
    try:
        u = User.objects.create_user(username='testuser_debug_2', password='password123')
        c = Client.objects.create(name='Test Client Debug 2')
        pos = PointOfSale.objects.create(name='Test POS Debug 2')
        
        print(f"Fresh User: {u.pk}, Client: {c.pk}, POS: {pos.pk}")
        
        inv = Invoice(
            invoice_number='DEBUG-FRESH-002',
            client=c,
            point_of_sale=pos,
            created_by=u,
            date_issued=date.today(),
            date_due=date.today(),
            status='draft'
        )
        inv.save()
        print(f"Success! Created Invoice ID: {inv.pk}")
        
        # Clean up
        inv.delete()
        pos.delete()
        c.delete()
        u.delete()
        print("Cleaned up successfully")
        
    except Exception as e:
        import traceback
        print(f"FAILED: {type(e).__name__}: {e}")
        traceback.print_exc()

simulate_fresh()
