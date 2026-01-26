from django.contrib.auth.models import User
from inventory.models import Quote, PointOfSale, Invoice
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

def list_quotes():
    print("--- QUOTES ---")
    for q in Quote.objects.all():
        print(f"ID: {q.pk}, Number: {q.quote_number}, Status: '{q.status}'")
        
    print("\n--- INVOICES ---")
    for i in Invoice.objects.all():
        print(f"ID: {i.pk}, Number: {i.invoice_number}, Notes: {i.notes}")

if __name__ == "__main__":
    list_quotes()
