import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.PGStock.settings')
django.setup()

from django.contrib.auth.models import User

def create_admin():
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@example.com', 'veve')
        print("Superuser 'admin' created with password 'veve'")
    else:
        print("Superuser 'admin' already exists")

if __name__ == "__main__":
    create_admin()
