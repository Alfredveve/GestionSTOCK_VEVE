from django.contrib.auth.models import User, Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from inventory.models import PointOfSale, UserProfile, Client, Product, Inventory, Category
from sales.models import Order
from decimal import Decimal

class SalesPOSPermissionTests(APITestCase):
    """
    Tests de permissions pour les ventes (Sales) par Point de Vente.
    Vérifie que les administrateurs ont un accès global et que les vendeurs sont restreints.
    """

    @classmethod
    def setUpTestData(cls):
        # Groupes
        cls.staff_group, _ = Group.objects.get_or_create(name='STAFF')
        
        # Points de vente
        cls.pos_a = PointOfSale.objects.create(name="POS A", code="POS-A")
        cls.pos_b = PointOfSale.objects.create(name="POS B", code="POS-B")
        
        # Utilisateurs
        cls.admin = User.objects.create_superuser(username='admin', password='password')
        
        cls.staff_a = User.objects.create_user(username='staff_a', password='password', is_staff=True)
        cls.staff_a.groups.add(cls.staff_group)
        cls.staff_a.profile.point_of_sale = cls.pos_a
        cls.staff_a.profile.save()
        
        cls.staff_b = User.objects.create_user(username='staff_b', password='password', is_staff=True)
        cls.staff_b.groups.add(cls.staff_group)
        cls.staff_b.profile.point_of_sale = cls.pos_b
        cls.staff_b.profile.save()
        
        # Données partagées
        cls.category = Category.objects.create(name="Cat Test")
        cls.client_obj = Client.objects.create(name="Client Test")
        cls.product = Product.objects.create(
            name="Prod Test", 
            category=cls.category,
            purchase_price=Decimal('10'), 
            selling_price=Decimal('20')
        )
        
        # Stock dans les deux POS
        Inventory.objects.create(product=cls.product, point_of_sale=cls.pos_a, quantity=100)
        Inventory.objects.create(product=cls.product, point_of_sale=cls.pos_b, quantity=100)

        # Création d'une commande par POS
        Order.objects.create(order_number="CMD-A", client=cls.client_obj, point_of_sale=cls.pos_a, total_amount=Decimal('20'))
        Order.objects.create(order_number="CMD-B", client=cls.client_obj, point_of_sale=cls.pos_b, total_amount=Decimal('20'))

    def setUp(self):
        self.api_client = APIClient()

    def test_admin_can_list_all_orders(self):
        """Un administrateur doit voir TOUTES les commandes"""
        self.api_client.force_authenticate(user=self.admin)
        url = reverse('order-list')
        response = self.api_client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        count = response.data.get('count', len(results))
        self.assertGreaterEqual(count, 2)

    def test_staff_a_only_sees_orders_from_pos_a(self):
        """Un vendeur ne voit que les commandes de SON point de vente"""
        self.api_client.force_authenticate(user=self.staff_a)
        url = reverse('order-list')
        response = self.api_client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        order_numbers = [o['order_number'] for o in results]
        
        self.assertIn("CMD-A", order_numbers)
        self.assertNotIn("CMD-B", order_numbers)

    def test_staff_a_cannot_create_order_for_pos_b(self):
        """Un vendeur ne peut pas créer une commande pour un autre point de vente"""
        self.api_client.force_authenticate(user=self.staff_a)
        url = reverse('order-list')
        data = {
            'client': self.client_obj.id,
            'point_of_sale': self.pos_b.id, # Attempt to sell from POS B
            'order_type': 'retail',
            'items': [{'product': self.product.id, 'quantity': 1, 'unit_price': 20}]
        }
        response = self.api_client.post(url, data, format='json')
        
        # Le backend doit rejeter ou forcer le POS de l'utilisateur
        self.assertNotEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_can_create_order_for_any_pos(self):
        """Un administrateur peut créer une commande pour n'importe quel POS"""
        self.api_client.force_authenticate(user=self.admin)
        url = reverse('order-list')
        data = {
            'client': self.client_obj.id,
            'point_of_sale': self.pos_b.id, 
            'order_type': 'retail',
            'items': [{'product': self.product.id, 'quantity': 1, 'unit_price': 20}]
        }
        response = self.api_client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['point_of_sale'], self.pos_b.id)
