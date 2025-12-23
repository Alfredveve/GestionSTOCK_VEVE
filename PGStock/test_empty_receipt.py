import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import Product, Category, PointOfSale, Receipt, Supplier
from inventory.services.receipt_service import ReceiptService
from inventory.services.base import ServiceException
from django.contrib.auth.models import User
from decimal import Decimal

from django.utils import timezone

def test_empty_receipt_validation():
    print("--- Testing Empty Receipt Validation ---")
    
    # 1. Setup Data
    user, _ = User.objects.get_or_create(username='admin')
    cat, _ = Category.objects.get_or_create(name='Electronics')
    pos, _ = PointOfSale.objects.get_or_create(code='MAIN', defaults={'name': 'Main Store'})
    supplier, _ = Supplier.objects.get_or_create(name='Test Supplier')
    
    # 2. Create an empty receipt
    receipt = Receipt.objects.create(
        supplier=supplier,
        point_of_sale=pos,
        created_by=user,
        status='draft',
        date_received=timezone.now()
    )
    print(f"Empty Receipt created: {receipt.receipt_number}")
    
    # 3. Try to validate via service
    service = ReceiptService()
    try:
        print("Attempting to validate empty receipt...")
        service.validate_and_add_stock(receipt)
        print("❌ Error: Validated an empty receipt! (Should have failed)")
    except ServiceException as e:
        print(f"✅ Success: Validation failed as expected: {str(e)}")
    except Exception as e:
        print(f"❌ Error: Unexpected exception type: {type(e).__name__}: {str(e)}")

    # 4. Try to change status to 'received' via service
    try:
        print("Attempting to change status to 'received' for empty receipt...")
        service.change_status(receipt, 'received', user)
        print("❌ Error: Changed status of an empty receipt! (Should have failed)")
    except ServiceException as e:
        print(f"✅ Success: Status change failed as expected: {str(e)}")

    # 5. Clean up
    receipt.delete()
    print("--- Test Completed ---")

if __name__ == "__main__":
    test_empty_receipt_validation()
