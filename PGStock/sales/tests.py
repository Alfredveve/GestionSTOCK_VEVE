from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from decimal import Decimal
from inventory.models import Category, Supplier, Client, Product, PointOfSale, Inventory, StockMovement
from .models import Order, OrderItem

class SalesAPITestCase(APITestCase):
    """Test suite for Sales API"""

    @classmethod
    def setUpTestData(cls):
        # Setup common data
        cls.user = User.objects.create_superuser(username='salesadmin', password='password123', email='admin@test.com')
        cls.pos = PointOfSale.objects.create(name="POS 1", code="POS1", city="Conakry")
        cls.client_obj = Client.objects.create(name="Client 1", client_type="individual")
        cls.category = Category.objects.create(name="Cat 1")
        cls.product = Product.objects.create(
            name="Product 1",
            category=cls.category,
            purchase_price=Decimal('1000'),
            selling_price=Decimal('1500'),
            wholesale_selling_price=Decimal('1200'),
            units_per_box=12
        )
        Inventory.objects.create(product=cls.product, point_of_sale=cls.pos, quantity=100)

    def setUp(self):
        self.client = APIClient()
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_create_order_with_items_via_serializer(self):
        """Test creating an order with items through the API (serializer)"""
        data = {
            "client": self.client_obj.id,
            "point_of_sale": self.pos.id,
            "order_type": "retail",
            "items": [
                {
                    "product": self.product.id,
                    "quantity": 5,
                    "unit_price": str(self.product.selling_price),
                    "discount": 0
                }
            ]
        }
        
        # Get initial stock
        initial_stock = Inventory.objects.get(product=self.product, point_of_sale=self.pos).quantity
        
        response = self.client.post('/api/v1/orders/', data, format='json')
        self.assertEqual(response.status_code, 201)
        
        # Verify order was created
        order = Order.objects.get(id=response.data['id'])
        self.assertEqual(order.items.count(), 1)
        
        # Verify stock was deducted
        self.assertTrue(order.stock_deducted)
        final_stock = Inventory.objects.get(product=self.product, point_of_sale=self.pos).quantity
        self.assertEqual(final_stock, initial_stock - 5)
        
        # Verify stock movement was created
        movement = StockMovement.objects.filter(
            product=self.product,
            movement_type='exit',
            reference__contains=order.order_number
        ).first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.quantity, 5)

    def test_order_calculations_with_items(self):
        """Test that order totals are calculated correctly when items are added"""
        order = Order.objects.create(
            client=self.client_obj,
            point_of_sale=self.pos,
            order_type='retail',
            created_by=self.user
        )
        
        # Add items via model (since serializer items is read_only)
        item1 = OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=10,
            unit_price=self.product.selling_price
        )
        
        order.refresh_from_db()
        expected_subtotal = Decimal('15000') # 10 * 1500
        expected_total = expected_subtotal
        
        self.assertEqual(order.subtotal, expected_subtotal)
        self.assertEqual(order.total_amount, expected_total)

    def test_order_item_discount(self):
        """Test order item total calculation with discount"""
        order = Order.objects.create(client=self.client_obj, point_of_sale=self.pos, created_by=self.user)
        item = OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=10,
            unit_price=Decimal('1000'),
            discount=Decimal('10') # 10% discount
        )
        # 10 * 1000 = 10000. 10% of 10000 = 1000. Total = 9000.
        self.assertEqual(item.total_price, Decimal('9000'))

    def test_list_orders(self):
        """Test listing orders"""
        Order.objects.create(client=self.client_obj, point_of_sale=self.pos, order_type='retail', created_by=self.user)
        response = self.client.get('/api/v1/orders/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
        self.assertTrue(len(response.data['results']) >= 1)

    def test_wholesale_stock_deduction(self):
        """Test that wholesale sales deduct correct stock (quantity * units_per_box)"""
        data = {
            "client": self.client_obj.id,
            "point_of_sale": self.pos.id,
            "order_type": "wholesale",
            "items": [
                {
                    "product": self.product.id,
                    "quantity": 2,  # 2 boxes
                    "unit_price": str(self.product.wholesale_selling_price),
                    "discount": 0
                }
            ]
        }
        
        initial_stock = Inventory.objects.get(product=self.product, point_of_sale=self.pos).quantity
        
        response = self.client.post('/api/v1/orders/', data, format='json')
        self.assertEqual(response.status_code, 201)
        
        # Verify stock was deducted (2 boxes * 12 units = 24 units)
        final_stock = Inventory.objects.get(product=self.product, point_of_sale=self.pos).quantity
        self.assertEqual(final_stock, initial_stock - 24)
        
        # Verify movement is marked as wholesale
        order = Order.objects.get(id=response.data['id'])
        movement = StockMovement.objects.filter(
            product=self.product,
            reference__contains=order.order_number
        ).first()
        self.assertTrue(movement.is_wholesale)

    def test_stock_deduction_prevents_duplicate(self):
        """Test that calling deduct_stock() multiple times doesn't deduct twice"""
        order = Order.objects.create(
            client=self.client_obj,
            point_of_sale=self.pos,
            order_type='retail',
            created_by=self.user
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=5,
            unit_price=self.product.selling_price
        )
        
        initial_stock = Inventory.objects.get(product=self.product, point_of_sale=self.pos).quantity
        
        # First deduction
        order.deduct_stock()
        stock_after_first = Inventory.objects.get(product=self.product, point_of_sale=self.pos).quantity
        self.assertEqual(stock_after_first, initial_stock - 5)
        
        # Second deduction attempt (should be ignored)
        order.deduct_stock()
        stock_after_second = Inventory.objects.get(product=self.product, point_of_sale=self.pos).quantity
        self.assertEqual(stock_after_second, stock_after_first)  # No change

    def test_restore_stock_on_cancellation(self):
        """Test that restore_stock() returns stock to inventory"""
        order = Order.objects.create(
            client=self.client_obj,
            point_of_sale=self.pos,
            order_type='retail',
            created_by=self.user
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=5,
            unit_price=self.product.selling_price
        )
        
        initial_stock = Inventory.objects.get(product=self.product, point_of_sale=self.pos).quantity
        
        # Deduct stock
        order.deduct_stock()
        stock_after_deduction = Inventory.objects.get(product=self.product, point_of_sale=self.pos).quantity
        self.assertEqual(stock_after_deduction, initial_stock - 5)
        
        # Restore stock
        order.restore_stock()
        final_stock = Inventory.objects.get(product=self.product, point_of_sale=self.pos).quantity
        self.assertEqual(final_stock, initial_stock)
        
        # Verify return movement was created
        return_movement = StockMovement.objects.filter(
            product=self.product,
            movement_type='return',
            reference__contains=f"Annulation Commande {order.order_number}"
        ).first()
        self.assertIsNotNone(return_movement)
