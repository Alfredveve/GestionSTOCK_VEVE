import sys
from django.contrib.auth.models import User
from inventory.models import PointOfSale

try:
    u = User.objects.get(username='codeshester0011')
    print(f"User: {u.username}")
    print(f"Is Superuser: {u.is_superuser}")
    
    if hasattr(u, 'profile'):
        print(f"Profile exists. POS: {u.profile.point_of_sale}")
    else:
        print("No profile found.")

    p = PointOfSale.objects.get(id=1)
    print(f"POS ID 1: {p.name}")

except Exception as e:
    print(f"Error: {e}")
