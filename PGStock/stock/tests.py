from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from decimal import Decimal
from inventory.models import Category, Product, PointOfSale, Inventory, StockMovement

class StockAPITestCase(APITestCase):
    """Test suite for Stock Management API"""

    @classmethod
    def setUpTestData(cls):
        # Setup common data
        cls.user = User.objects.create_superuser(username='stockadmin', password='password123', email='admin@test.com')
        cls.pos_warehouse = PointOfSale.objects.create(name="Entrepôt", code="WH1", city="Conakry", is_warehouse=True)
        cls.pos_store = PointOfSale.objects.create(name="Magasin 1", code="STR1", city="Conakry", is_warehouse=False)
        cls.category = Category.objects.create(name="Cat 1")
        cls.product = Product.objects.create(
            name="Product Stock",
            category=cls.category,
            purchase_price=Decimal('1000'),
            selling_price=Decimal('1500'),
            units_per_box=10
        )
        # Initial stock at warehouse
        cls.inventory_wh = Inventory.objects.create(product=cls.product, point_of_sale=cls.pos_warehouse, quantity=100)
        # No stock at store yet
        cls.inventory_str = Inventory.objects.create(product=cls.product, point_of_sale=cls.pos_store, quantity=0)

    def setUp(self):
        self.client = APIClient()
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_stock_transfer_logic(self):
        """Test transferring stock between POS"""
        # Transfer 2 boxes (20 units) from warehouse to store
        data = {
            "product": self.product.id,
            "movement_type": "transfer",
            "quantity": 2, # 2 boxes = 20 units
            "is_wholesale": True,
            "from_point_of_sale": self.pos_warehouse.id,
            "to_point_of_sale": self.pos_store.id,
            "reference": "TRANS-001"
        }
        response = self.client.post('/api/v1/movements/', data, format='json')
        self.assertEqual(response.status_code, 201)
        
        self.inventory_wh.refresh_from_db()
        self.inventory_str.refresh_from_db()
        
        self.assertEqual(self.inventory_wh.quantity, 80) # 100 - 20
        self.assertEqual(self.inventory_str.quantity, 20) # 0 + 20

    def test_stock_entry_retail(self):
        """Test entering stock (entries are forced to wholesale units in model)"""
        # Note: Model forces is_wholesale=True for 'entry'
        data = {
            "product": self.product.id,
            "movement_type": "entry",
            "quantity": 1, # 1 box = 10 units
            "from_point_of_sale": self.pos_store.id,
            "reference": "RECEPTION-001"
        }
        response = self.client.post('/api/v1/movements/', data, format='json')
        self.assertEqual(response.status_code, 201)
        
        self.inventory_str.refresh_from_db()
        # Initial 0 + (1 * 10) = 10
        self.assertEqual(self.inventory_str.quantity, 10)

    def test_list_movements(self):
        """Test listing movements"""
        StockMovement.objects.create(
            product=self.product,
            movement_type='entry',
            quantity=5,
            from_point_of_sale=self.pos_store,
            user=self.user
        )
        response = self.client.get('/api/v1/movements/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
