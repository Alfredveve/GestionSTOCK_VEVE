import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from django.contrib.auth.models import User
from inventory.permissions import get_user_role

users = User.objects.all()
print(f"Total users: {users.count()}")
for u in users:
    role = get_user_role(u)
    print(f"User: {u.username}, is_staff: {u.is_staff}, is_superuser: {u.is_superuser}, role: {role}")

staff_count = User.objects.filter(is_staff=True).count()
print(f"Staff users count: {staff_count}")
