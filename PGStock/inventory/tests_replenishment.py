from django.test import TestCase, Client
from django.contrib.auth.models import User
from inventory.models import Category, Product, PointOfSale, Inventory, StockMovement

class ReplenishmentTests(TestCase):
    def setUp(self):
        # Clean up any existing POS to ensure deterministic behavior
        PointOfSale.objects.all().delete()
        
        # Create user
        self.user = User.objects.create_user(username='testuser', password='password')
        self.client = Client()
        self.client.login(username='testuser', password='password')
        
        # Create category
        self.category = Category.objects.create(name='Test Category')
        
        # Create product
        self.product = Product.objects.create(
            name='Test Product',
            sku='TEST-001',
            category=self.category,
            unit_price=100.00
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

    def test_replenish_pos_success(self):
        """Test successful replenishment from warehouse to store"""
        response = self.client.post(f'/inventory/pos/{self.store.id}/replenish/', {
            'product': self.product.id,
            'quantity': 10,
            'notes': 'Test replenishment'
        })
        
        # Check redirect
        self.assertRedirects(response, f'/inventory/pos/{self.store.id}/')
        
        # Check stock levels
        warehouse_stock = Inventory.objects.get(product=self.product, point_of_sale=self.warehouse).quantity
        store_stock = Inventory.objects.get(product=self.product, point_of_sale=self.store).quantity
        
        self.assertEqual(warehouse_stock, 90)
        self.assertEqual(store_stock, 10)
        
        # Check movement creation
        movement = StockMovement.objects.last()
        self.assertEqual(movement.movement_type, 'transfer')
        self.assertEqual(movement.from_point_of_sale, self.warehouse)
        self.assertEqual(movement.to_point_of_sale, self.store)
        self.assertEqual(movement.quantity, 10)

    def test_replenish_pos_insufficient_stock(self):
        """Test replenishment fails if warehouse has insufficient stock"""
        response = self.client.post(f'/inventory/pos/{self.store.id}/replenish/', {
            'product': self.product.id,
            'quantity': 150,  # More than 100 available
            'notes': 'Test fail'
        })
        
        # Should show error message (implementation detail: form error or message)
        # In this case, the form should be invalid and re-render the page
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Stock insuffisant")
        
        # Check stock levels unchanged
        warehouse_stock = Inventory.objects.get(product=self.product, point_of_sale=self.warehouse).quantity
        self.assertEqual(warehouse_stock, 100)

    def test_replenish_warehouse_fail(self):
        """Test cannot replenish warehouse itself"""
        response = self.client.get(f'/inventory/pos/{self.warehouse.id}/replenish/')
        
        # Should redirect with warning
        self.assertRedirects(response, f'/inventory/pos/{self.warehouse.id}/')
