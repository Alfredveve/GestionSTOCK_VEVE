from django.contrib.auth.models import User
from inventory.models import PointOfSale, UserProfile

try:
    u = User.objects.get(username='codeshester0011')
    p = PointOfSale.objects.get(id=1)

    profile, created = UserProfile.objects.get_or_create(user=u)
    profile.point_of_sale = p
    profile.save()

    print(f"SUCCESS: Assigned {u.username} to POS: {p.name}")
except Exception as e:
    print(f"ERROR: {e}")
