import os
import django
import sys

# Setup Django environment
sys.path.append(r'c:\Users\codeshester0011\Desktop\GestionSTOCK\PGStock')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import Receipt, Supplier
from django.db.models import Q

def verify():
    print("--- Suppliers ---")
    suppliers = Supplier.objects.all()
    for s in suppliers:
        print(f"ID: {s.id}, Name: '{s.name}'")

    print("\n--- Testing Search ---")
    # Try searching for the first supplier's name
    if suppliers.exists():
        target_name = suppliers.first().name
        print(f"Searching for: '{target_name}'")
        
        query = target_name
        
        receipts = Receipt.objects.select_related('supplier').all()
        filtered_receipts = receipts.filter(
            Q(receipt_number__icontains=query) | 
            Q(supplier__name__icontains=query) |
            Q(supplier_reference__icontains=query)
        )
        
        print(f"Found {filtered_receipts.count()} receipts matching '{query}'")
        
        for r in filtered_receipts:
            print(f" - Receipt: {r.receipt_number}, Supplier: {r.supplier.name}")
            
        # Test partial search
        partial = target_name[:3]
        print(f"\nSearching for partial: '{partial}'")
        filtered_receipts_partial = receipts.filter(
            Q(receipt_number__icontains=partial) | 
            Q(supplier__name__icontains=partial) |
            Q(supplier_reference__icontains=partial)
        )
        print(f"Found {filtered_receipts_partial.count()} receipts matching '{partial}'")

if __name__ == "__main__":
    verify()
