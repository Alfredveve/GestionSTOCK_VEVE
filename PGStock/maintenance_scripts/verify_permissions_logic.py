
import os
import django
import sys
from decimal import Decimal

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from django.contrib.auth.models import User, Group
from inventory.permissions import validate_discount, get_user_role
from inventory.forms import InvoiceItemForm

def test_discount_validation():
    print("--- Testing Discount Validation Logic ---")
    
    # Create or get test users
    admin_user, _ = User.objects.get_or_create(username='test_admin', is_superuser=True)
    staff_user, _ = User.objects.get_or_create(username='test_staff')
    
    # Ensure staff_user is in STAFF group
    staff_group, _ = Group.objects.get_or_create(name='STAFF')
    staff_user.groups.add(staff_group)
    
    # Test cases
    cases = [
        (admin_user, 50, True, "Admin should allow 50% discount"),
        (staff_user, 5, True, "Staff should allow 5% discount"),
        (staff_user, 15, False, "Staff should NOT allow 15% discount (limit 10%)"),
    ]
    
    for user, discount, expected, msg in cases:
        role = get_user_role(user)
        is_valid, error = validate_discount(user, Decimal(str(discount)))
        result = "PASS" if is_valid == expected else "FAIL"
        print(f"[{result}] Role: {role}, Discount: {discount}% -> {'Valid' if is_valid else 'Invalid'}: {msg}")
        if not is_valid and error:
            print(f"      Error Message: {error}")

def test_form_validation():
    print("\n--- Testing Form Validation ---")
    staff_user = User.objects.get(username='test_staff')
    
    # Valid discount for staff
    form_valid = InvoiceItemForm(data={'discount': 5}, user=staff_user)
    # Mocking product field for form validity if needed, but we care about clean_discount
    # We can call clean_discount directly if we prep cleaned_data
    form_valid.cleaned_data = {'discount': Decimal('5')}
    try:
        val = form_valid.clean_discount()
        print(f"[PASS] Form clean_discount (5%) for staff: returned {val}")
    except Exception as e:
        print(f"[FAIL] Form clean_discount (5%) for staff failed: {e}")

    # Invalid discount for staff
    form_invalid = InvoiceItemForm(data={'discount': 15}, user=staff_user)
    form_invalid.cleaned_data = {'discount': Decimal('15')}
    try:
        form_invalid.clean_discount()
        print(f"[FAIL] Form clean_discount (15%) for staff should have failed")
    except django.core.exceptions.ValidationError as e:
        print(f"[PASS] Form clean_discount (15%) for staff failed as expected: {e.messages}")

if __name__ == "__main__":
    try:
        test_discount_validation()
        test_form_validation()
    except Exception as e:
        print(f"Error during verification: {e}")
    finally:
        # Cleanup test users (optional, but keep it for now as it's a test script)
        # User.objects.filter(username__startswith='test_').delete()
        pass
