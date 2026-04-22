import sys
from django.contrib.auth.models import User
from inventory.models import PointOfSale

try:
    with open('c:/Users/codeshester0011/Desktop/GestionSTOCK/verify_output_direct.txt', 'w') as f:
        u = User.objects.get(username='codeshester0011')
        f.write(f"User: {u.username}\n")
        f.write(f"Is Superuser: {u.is_superuser}\n")
        
        if hasattr(u, 'profile'):
            f.write(f"Profile exists. POS: {u.profile.point_of_sale}\n")
        else:
            f.write("No profile found.\n")

        p = PointOfSale.objects.get(id=1)
        f.write(f"POS ID 1: {p.name}\n")

except Exception as e:
    with open('c:/Users/codeshester0011/Desktop/GestionSTOCK/verify_output_direct.txt', 'w') as f:
        f.write(f"Error: {e}\n")
