
import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from django.contrib.auth.models import User, Group

def fix_admin_permissions():
    print("--- Fixing 'Admin' user permissions ---")
    
    try:
        user = User.objects.get(username__iexact='admin')
    except User.DoesNotExist:
        print("ERROR: User 'admin' not found.")
        return

    print(f"Target User: {user.username} (ID: {user.id})")
    
    # 1. Promote to Superuser
    if not user.is_superuser:
        print(" -> Setting is_superuser = True")
        user.is_superuser = True
        user.is_staff = True  # Ensure staff access too
        user.save()
        print("    Done.")
    else:
        print(" -> User is already a superuser.")

    # 2. Add to Admin Group
    admin_group, created = Group.objects.get_or_create(name='Admin')
    if created:
        print(" -> Created 'Admin' group.")
    
    if not user.groups.filter(name='Admin').exists():
        print(" -> Adding user to 'Admin' group")
        user.groups.add(admin_group)
        print("    Done.")
    else:
        print(" -> User is already in 'Admin' group.")

    print("\n--- Fix applied successfully ---")

if __name__ == "__main__":
    fix_admin_permissions()
