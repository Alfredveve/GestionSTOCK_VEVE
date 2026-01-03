import os
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.templatetags.inventory_extras import format_currency
from django.contrib.auth.models import User

def test_format_currency():
    print("Testing format_currency filter...")

    # Test case 1: Valid User object (should work)
    try:
        user = User.objects.first()
        if not user:
             print("No user found, creating dummy user")
             user = User(username='test_user')
        
        result = format_currency(1000, user)
        print(f"User object test: SUCCESS -> {result}")
    except Exception as e:
        print(f"User object test: FAILED -> {e}")

    # Test case 2: String argument (The bug)
    try:
        print("\nTesting with string argument 'GNF' (Simulating the bug)...")
        result = format_currency(5000, 'GNF')
        print(f"String argument test: SUCCESS -> {result}")
    except AttributeError as e:
        print(f"String argument test: FAILED as expected -> {e}")
    except Exception as e:
        print(f"String argument test: FAILED with unexpected error -> {e}")

if __name__ == "__main__":
    test_format_currency()
