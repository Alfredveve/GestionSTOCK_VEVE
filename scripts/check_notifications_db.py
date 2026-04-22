import os
import django
import sys

# Add PGStock to sys.path
sys.path.append(os.path.join(os.getcwd(), 'PGStock'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import Notification

notifs = Notification.objects.all().order_by('-created_at')[:10]
print(f"Total notifications: {Notification.objects.count()}")
for n in notifs:
    print(f"[{n.created_at}] To: {n.recipient.username}, Title: {n.title}, Type: {n.notification_type}")
