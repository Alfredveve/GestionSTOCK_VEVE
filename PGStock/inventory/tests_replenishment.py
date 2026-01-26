from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from inventory.models import Category, Product, PointOfSale, Inventory, StockMovement
from decimal import Decimal


class ReplenishmentAPITests(APITestCase):
    """Tests for stock replenishment via API (using StockMovement endpoints)"""
    
    def setUp(self):
        # Clean up any existing POS to ensure deterministic behavior
        PointOfSale.objects.all().delete()
        
        # Create user
        self.user = User.objects.create_superuser(
            username='testuser',
            password='password',
            email='test@test.com'
        )
        
        # Set up API client with JWT authentication
        self.client = APIClient()
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        # Create category
        self.category = Category.objects.create(name='Test Category')
        
        # Create product
        self.product = Product.objects.create(
            name='Test Product',
            sku='TEST-001',
            category=self.category,
            selling_price=Decimal('100.00'),
            purchase_price=Decimal('50.00')
        )
        
        # Create Warehouse
        self.warehouse = PointOfSale.objects.create(
            name='Main Warehouse',
            code='WH-001',
            is_warehouse=True,
            is_active=True
        )
        
        # Create Store
        self.store = PointOfSale.objects.create(
            name='Store 1',
            code='STR-001',
            is_warehouse=False,
            is_active=True
        )
        
        # Add stock to Warehouse
        Inventory.objects.create(
            product=self.product,
            point_of_sale=self.warehouse,
            quantity=100
        )
        
        # Initialize empty stock for Store
        Inventory.objects.create(
            product=self.product,
            point_of_sale=self.store,
            quantity=0
        )

    def test_transfer_stock_success(self):
        """Test successful stock transfer from warehouse to store via API"""
        response = self.client.post('/api/v1/movements/', {
            'product': self.product.id,
            'movement_type': 'transfer',
            'quantity': 10,
            'from_point_of_sale': self.warehouse.id,
            'to_point_of_sale': self.store.id,
            'notes': 'Test replenishment'
        }, format='json')
        
        # Check for successful creation
        self.assertEqual(response.status_code, 201)
        
        # Check stock levels
        warehouse_stock = Inventory.objects.get(
            product=self.product,
            point_of_sale=self.warehouse
        ).quantity
        store_stock = Inventory.objects.get(
            product=self.product,
            point_of_sale=self.store
        ).quantity
        
        self.assertEqual(warehouse_stock, 90)
        self.assertEqual(store_stock, 10)
        
        # Check movement creation
        movement = StockMovement.objects.last()
        self.assertEqual(movement.movement_type, 'transfer')
        self.assertEqual(movement.from_point_of_sale, self.warehouse)
        self.assertEqual(movement.to_point_of_sale, self.store)
        self.assertEqual(movement.quantity, 10)

    def test_transfer_insufficient_stock(self):
        """Test that transfer fails if source has insufficient stock"""
        response = self.client.post('/api/v1/movements/', {
            'product': self.product.id,
            'movement_type': 'transfer',
            'quantity': 150,  # More than 100 available
            'from_point_of_sale': self.warehouse.id,
            'to_point_of_sale': self.store.id,
            'notes': 'Test fail'
        }, format='json')
        
        # Should return 400 Bad Request with validation error
        self.assertEqual(response.status_code, 400)
        
        # Check stock levels unchanged
        warehouse_stock = Inventory.objects.get(
            product=self.product,
            point_of_sale=self.warehouse
        ).quantity
        self.assertEqual(warehouse_stock, 100)

    def test_stock_entry_to_warehouse(self):
        """Test adding stock via entry movement"""
        response = self.client.post('/api/v1/movements/', {
            'product': self.product.id,
            'movement_type': 'entry',
            'quantity': 50,
            'from_point_of_sale': self.warehouse.id,
            'notes': 'New stock arrival'
        }, format='json')
        
        self.assertEqual(response.status_code, 201)
        
        # Check stock increased
        warehouse_stock = Inventory.objects.get(
            product=self.product,
            point_of_sale=self.warehouse
        ).quantity
        self.assertEqual(warehouse_stock, 150)  # 100 + 50
