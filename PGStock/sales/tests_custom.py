from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from inventory.models import Category, Product, PointOfSale, Inventory, Client
from sales.models import Order, OrderItem
from sales.serializers import OrderSerializer
from decimal import Decimal

class StockRestrictionTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_superuser(username='testadmin', password='password', email='admin@test.com')
        cls.category = Category.objects.create(name="Test Category")
        cls.pos = PointOfSale.objects.create(name="Test POS", code="POS-001")
        cls.order_client = Client.objects.create(name="Test Client")
        
        cls.product = Product.objects.create(
            name="Restricted Product",
            sku="RST-001",
            category=cls.category,
            purchase_price=Decimal('100'),
            selling_price=Decimal('150')
        )
        
    def setUp(self):
        self.client.force_authenticate(user=self.user)

    def test_stock_lower_than_2_blocks_sale(self):
        """Test that if stock is <= 2, the sale is blocked by the serializer validation."""
        # Set stock to 2
        Inventory.objects.create(
            product=self.product,
            point_of_sale=self.pos,
            quantity=2
        )
        
        data = {
            'client': self.order_client.id,
            'point_of_sale': self.pos.id,
            'order_type': 'retail',
            'items': [
                {
                    'product': self.product.id,
                    'quantity': 1,
                    'unit_price': 150
                }
            ]
        }
        
        serializer = OrderSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('detail', serializer.errors)
        self.assertIn('interdite car la q<=2', str(serializer.errors['detail']))

    def test_stock_exactly_3_allows_sale(self):
        """Test that if stock is 3, the sale is allowed."""
        # Set stock to 3
        inventory, _ = Inventory.objects.get_or_create(
            product=self.product,
            point_of_sale=self.pos,
            defaults={'quantity': 3}
        )
        inventory.quantity = 3
        inventory.save()
        
        data = {
            'client': self.order_client.id,
            'point_of_sale': self.pos.id,
            'order_type': 'retail',
            'items': [
                {
                    'product': self.product.id,
                    'quantity': 1,
                    'unit_price': 150
                }
            ]
        }
        
        serializer = OrderSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
