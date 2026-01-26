from django.contrib.auth.models import User
from inventory.models import Quote, PointOfSale, Invoice
from datetime import date
import django
import os

def simulate_q1():
    try:
        q = Quote.objects.get(pk=1)
        u = User.objects.filter(pk__in=[3, 15, 16, 17, 18, 19]).first()
        pos = PointOfSale.objects.first()
        
        print(f"Using Quote: {q.pk}, Client: {q.client.pk}, User: {u.pk if u else 'NONE'}, POS: {pos.pk if pos else 'NONE'}")
        
        inv = Invoice(
            invoice_number='DEBUG-SIM-Q1-V2',
            client=q.client,
            point_of_sale=pos,
            created_by=u,
            date_issued=date.today(),
            date_due=date.today(),
            status='draft'
        )
        inv.save()
        print(f"Success! Created Invoice ID: {inv.pk}")
        inv.delete() # Clean up
        print("Cleaned up successfully")
        
    except Exception as e:
        import traceback
        print(f"FAILED: {type(e).__name__}: {e}")
        traceback.print_exc()

simulate_q1()
