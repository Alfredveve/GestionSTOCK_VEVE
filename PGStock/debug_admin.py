
import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from django.contrib.auth.models import User, Group
from inventory.permissions import get_user_role, filter_queryset_by_pos
from inventory.models import Inventory

def check_admin_user():
    print("--- Checking 'Admin' user ---")
    
    # Try to find user 'admin' or 'Admin'
    users = User.objects.filter(username__icontains='admin')
    
    if not users.exists():
        print("No user found with username containing 'admin'")
        # List all superusers?
        superusers = User.objects.filter(is_superuser=True)
        if superusers.exists():
            print("Found superusers:", [u.username for u in superusers])
        return

    for user in users:
        print(f"\nUser: {user.username} (ID: {user.id})")
        print(f"  is_superuser: {user.is_superuser}")
        print(f"  is_staff: {user.is_staff}")
        print(f"  is_active: {user.is_active}")
        
        groups = list(user.groups.values_list('name', flat=True))
        print(f"  Groups: {groups}")
        
        role = get_user_role(user)
        print(f"  Computed Role (get_user_role): {role}")
        
        # Check filter_queryset_by_pos result
        qs = Inventory.objects.all()
        filtered_qs = filter_queryset_by_pos(qs, user)
        
        count_all = qs.count()
        count_filtered = filtered_qs.count()
        
        print(f"  Inventory Visibility: {count_filtered} / {count_all} items")
        
        if role == 'ADMIN' and count_filtered < count_all:
             print("  [WARNING] Role is ADMIN but some items are hidden! (This shouldn't happen based on code logic)")
        elif role != 'ADMIN' and not user.is_superuser:
             print("  [WARNING] User is not recognized as ADMIN. Check Group assignment.")

if __name__ == "__main__":
    check_admin_user()
