from inventory.models import PointOfSale
from django.contrib.auth.models import User

print("--- POINTS OF SALE ---")
for p in PointOfSale.objects.all():
    print(f"ID: {p.id}, Name: {p.name}, Code: {p.code}")

print("\n--- USER INFO ---")
try:
    u = User.objects.get(username='codeshester0011')
    print(f"User: {u.username}")
    if hasattr(u, 'profile'):
        print(f"Profile found. POS: {u.profile.point_of_sale}")
    else:
        print("No profile found on user.")
except Exception as e:
    print(f"Error finding user: {e}")
