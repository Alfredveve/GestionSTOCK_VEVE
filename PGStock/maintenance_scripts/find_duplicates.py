import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from django.contrib.auth.models import User
from django.db.models import Count

def find_duplicates():
    # Find emails that are used more than once
    duplicates = User.objects.values('email').annotate(count=Count('id')).filter(count__gt=1)
    
    print(f"Found {duplicates.count()} emails with multiple users.")
    
    for entry in duplicates:
        email = entry['email']
        count = entry['count']
        print(f"\nEmail: {email} (used {count} times)")
        
        users = User.objects.filter(email=email).order_by('date_joined')
        for user in users:
            print(f"  - ID: {user.id}, Username: {user.username}, Joined: {user.date_joined}, Last Login: {user.last_login}, Staff: {user.is_staff}")

if __name__ == '__main__':
    find_duplicates()
