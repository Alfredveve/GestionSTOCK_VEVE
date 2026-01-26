from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from inventory.models import PointOfSale
from rest_framework_simplejwt.tokens import RefreshToken

class PointOfSaleFeatureTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_superuser(username='testadmin', password='password', email='admin@test.com')
        
    def setUp(self):
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')

    def test_create_pos_with_manager_name(self):
        """Test that a POS can be created with a manager_name (text field)."""
        data = {
            'name': 'Boutique Alpha',
            'code': 'ALPHA-001',
            'manager_name': 'Mamadou Diallo',
            'city': 'Conakry',
            'is_active': True
        }
        
        response = self.client.post('/api/v1/pos/', data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['manager_name'], 'Mamadou Diallo')
        
        pos = PointOfSale.objects.get(code='ALPHA-001')
        self.assertEqual(pos.manager_name, 'Mamadou Diallo')

    def test_update_pos_manager_name(self):
        """Test updating the manager_name of an existing POS."""
        pos = PointOfSale.objects.create(
            name='Boutique Beta',
            code='BETA-001',
            manager_name='Ancien Gérant'
        )
        
        data = {
            'manager_name': 'Nouveau Gérant'
        }
        
        response = self.client.patch(f'/api/v1/pos/{pos.id}/', data, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['manager_name'], 'Nouveau Gérant')
        
        pos.refresh_from_db()
        self.assertEqual(pos.manager_name, 'Nouveau Gérant')
