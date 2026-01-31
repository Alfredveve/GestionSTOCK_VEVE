import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from django.contrib.auth.models import User

with open('../admin_check_output.txt', 'w', encoding='utf-8') as f:
    f.write("--- USER: admin ---\n")
    try:
        u = User.objects.get(username='admin')
        f.write(f"Username: {u.username}\n")
        f.write(f"Is Superuser: {u.is_superuser}\n")
        f.write(f"Is Staff: {u.is_staff}\n")
        
        # Check profile
        if hasattr(u, 'profile'):
            f.write(f"Profile found. POS: {u.profile.point_of_sale}\n")
        else:
            f.write("No profile found via 'profile' related name.\n")
            
        # Check attributes directly on user
        if hasattr(u, 'point_of_sale'):
             f.write(f"User.point_of_sale: {u.point_of_sale}\n")

    except User.DoesNotExist:
        f.write("User 'admin' not found.\n")
print("Done writing to admin_check_output.txt")
