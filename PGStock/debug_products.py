import os
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import Product
from inventory.serializers import ProductSerializer
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

def debug_products():
    print("Testing ProductViewSet with Client (Middleware enabled)...")
    try:
        from django.test import Client
        from django.contrib.auth.models import User
        
        user = User.objects.first()
        if not user:
            print("No user found, creating one for test...")
            user = User.objects.create_superuser('admin', 'admin@example.com', 'password')
            
        # Generate JWT token
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        print(f"Calling endpoint /api/v1/products/ with JWT token for user: {user.username}")
        response = client.get('/api/v1/products/', HTTP_HOST='localhost', HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        print(f"Response Status Code: {response.status_code}")
        if response.status_code >= 400:
             print(f"Error Content saved to error.html")
             with open('error.html', 'wb') as f:
                 f.write(response.content)
        else:
             print("Response successful.")
             # print(response.content)

    except Exception as e:
        print(f"Client Execution FAILED: {e}")
        import traceback
        traceback.print_exc()

    except Exception as e:
        print(f"View Execution FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    debug_products()
