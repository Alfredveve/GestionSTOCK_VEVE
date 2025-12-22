import os
import sys
import pathlib
import django

# Ensure project root is on sys.path so Django package can be imported
project_root = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(project_root))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from django.contrib.auth import get_user_model

def create_test_user():
    User = get_user_model()
    username = 'testadmin'
    password = 'P@ssw0rd123'
    email = 'test@example.com'
    user, created = User.objects.get_or_create(username=username, defaults={'email': email})
    if created:
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.save()
        print('created')
    else:
        print('exists')

if __name__ == '__main__':
    create_test_user()
