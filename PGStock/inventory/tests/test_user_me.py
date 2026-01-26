from django.contrib.auth.models import User, Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from inventory.models import PointOfSale, UserProfile

class UserMeTests(APITestCase):
    """
    Tests techniques pour l'endpoint /api/v1/users/me/
    Vérifie l'identification correcte du rôle et du point de vente.
    """

    def setUp(self):
        # Configuration des groupes
        self.staff_group, _ = Group.objects.get_or_create(name='STAFF')
        self.admin_group, _ = Group.objects.get_or_create(name='Admin')

        # Configuration des points de vente
        self.pos_a = PointOfSale.objects.create(name="Boutique A", code="BTQ-A", city="Conakry")
        self.pos_b = PointOfSale.objects.create(name="Boutique B", code="BTQ-B", city="Conakry")

        # Création d'un Administrateur
        self.admin_user = User.objects.create_superuser(
            username='admin_test',
            password='password123',
            email='admin@test.com'
        )
        # Assignation optionnelle d'un POS à l'admin
        self.admin_user.profile.point_of_sale = self.pos_a
        self.admin_user.profile.save()

        # Création d'un Vendeur (Staff)
        self.staff_user = User.objects.create_user(
            username='staff_test',
            password='password123',
            email='staff@test.com'
        )
        self.staff_user.groups.add(self.staff_group)
        self.staff_user.is_staff = True
        self.staff_user.save()
        
        # Assignation obligatoire d'un POS au staff
        self.staff_user.profile.point_of_sale = self.pos_b
        self.staff_user.profile.save()

        self.client = APIClient()

    def get_token(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def test_me_endpoint_unauthenticated(self):
        """Vérifie que l'accès anonyme est refusé"""
        url = reverse('user-me')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_admin(self):
        """Vérifie les données retournées pour un Administrateur"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.admin_user)}')
        url = reverse('user-me')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.admin_user.username)
        self.assertEqual(response.data['role'], 'ADMIN')
        self.assertEqual(response.data['point_of_sale']['id'], self.pos_a.id)

    def test_me_endpoint_staff(self):
        """Vérifie les données retournées pour un Vendeur (Staff)"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.staff_user)}')
        url = reverse('user-me')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.staff_user.username)
        self.assertEqual(response.data['role'], 'STAFF')
        self.assertEqual(response.data['point_of_sale']['id'], self.pos_b.id)
        self.assertEqual(response.data['point_of_sale']['name'], "Boutique B")

    def test_me_endpoint_no_pos(self):
        """Vérifie le comportement si aucun POS n'est assigné"""
        user_no_pos = User.objects.create_user(username='no_pos', password='password')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(user_no_pos)}')
        
        url = reverse('user-me')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['point_of_sale'])
