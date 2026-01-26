"""
Comprehensive Unit Tests for OrderService

Tests all methods and edge cases with high coverage.
"""

from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

from inventory.models import Product, Client, PointOfSale, Category, Supplier, StockMovement
from inventory.services import OrderService
from sales.models import Order, OrderItem


class OrderServiceTestCase(TestCase):
    """Comprehensive tests for OrderService"""
    
    def setUp(self):
        """Set up test data"""
        self.service = OrderService()
        
        # Create test user
        self.user = User.objects.create_user(
            username='testuser_ord',
            password='testpass123'
        )
        
        # Create category
        self.category = Category.objects.create(
            name='Test Category Ord'
        )
        
        # Create supplier
        self.supplier = Supplier.objects.create(
            name='Test Supplier Ord',
            email='supplier@testord.com'
        )
        
        # Create point of sale
        self.pos = PointOfSale.objects.create(
            name='Test POS Ord',
            code='POSORD001',
            address='123 Test St',
            manager_name='Test Manager'
        )
        
        # Create client
        self.client = Client.objects.create(
            name='Test Client Ord',
            email='client@testord.com',
            phone='1234567890'
        )
        
        # Create products
        self.product1 = Product.objects.create(
            name='Product 1',
            sku='PRODORD001',
            category=self.category,
            purchase_price=Decimal('1000'),
            selling_price=Decimal('1500'),
            wholesale_selling_price=Decimal('1300'),
            units_per_box=10
        )
        
        self.product2 = Product.objects.create(
            name='Product 2',
            sku='PRODORD002',
            category=self.category,
            purchase_price=Decimal('2000'),
            selling_price=Decimal('3000'),
            wholesale_selling_price=Decimal('2500'),
            units_per_box=5
        )
        
        # Create inventory
        from inventory.models import Inventory
        Inventory.objects.create(
            product=self.product1,
            point_of_sale=self.pos,
            quantity=100
        )
        Inventory.objects.create(
            product=self.product2,
            point_of_sale=self.pos,
            quantity=50
        )
    
    def test_create_order_success(self):
        """Test successful order creation"""
        items_data = [
            {
                'product': self.product1,
                'quantity': 10,
                'unit_price': self.product1.selling_price,
                'discount': 0
            },
            {
                'product': self.product2,
                'quantity': 5,
                'unit_price': self.product2.selling_price,
                'discount': 5
            }
        ]
        
        order = self.service.create_order(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data,
            order_type='retail',
            status='pending'
        )
        
        self.assertIsNotNone(order)
        self.assertEqual(order.client, self.client)
        self.assertEqual(order.point_of_sale, self.pos)
        self.assertEqual(order.items.count(), 2)
        self.assertFalse(order.stock_deducted)
        self.assertEqual(order.status, 'pending')
    
    def test_create_order_without_items(self):
        """Test order creation fails without items"""
        with self.assertRaisesRegex(Exception, 'sans articles'):
            self.service.create_order(
                client=self.client,
                point_of_sale=self.pos,
                user=self.user,
                items_data=[],
                order_type='retail'
            )
    
    def test_create_order_with_validation_status(self):
        """Test order creation with validated status deducts stock"""
        items_data = [
            {
                'product': self.product1,
                'quantity': 10,
                'unit_price': self.product1.selling_price
            }
        ]
        
        order = self.service.create_order(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data,
            status='validated'
        )
        
        self.assertTrue(order.stock_deducted)
        
        # Verify stock was deducted
        from inventory.models import StockMovement
        movements = StockMovement.objects.filter(
            product=self.product1,
            movement_type='exit'
        )
        self.assertGreaterEqual(movements.count(), 1)
    
    def test_create_order_invalid_type(self):
        """Test order creation with invalid type"""
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        with self.assertRaises(ValidationError):
            self.service.create_order(
                client=self.client,
                point_of_sale=self.pos,
                user=self.user,
                items_data=items_data,
                order_type='invalid_type'
            )
    
    def test_update_order(self):
        """Test order update"""
        # Create initial order
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        order = self.service.create_order(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data,
            status='pending'
        )
        
        # Update order
        new_items_data = [
            {'product': self.product2, 'quantity': 5}
        ]
        
        updated_order = self.service.update_order(
            order=order,
            items_data=new_items_data,
            user=self.user,
            notes='Updated order'
        )
        
        self.assertEqual(updated_order.items.count(), 1)
        self.assertEqual(updated_order.items.first().product, self.product2)
        self.assertEqual(updated_order.notes, 'Updated order')
    
    def test_add_order_item(self):
        """Test adding item to order"""
        # Create order
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        order = self.service.create_order(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data
        )
        
        initial_count = order.items.count()
        
        # Add new item
        new_item = self.service.add_order_item(
            order=order,
            item_data={'product': self.product2, 'quantity': 5},
            user=self.user
        )
        
        self.assertIsNotNone(new_item)
        self.assertEqual(order.items.count(), initial_count + 1)
    
    def test_remove_order_item(self):
        """Test removing item from order"""
        # Create order with multiple items
        items_data = [
            {'product': self.product1, 'quantity': 10},
            {'product': self.product2, 'quantity': 5}
        ]
        
        order = self.service.create_order(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data
        )
        
        item_to_remove = order.items.first()
        initial_count = order.items.count()
        
        # Remove item
        self.service.remove_order_item(
            order=order,
            item=item_to_remove,
            user=self.user
        )
        
        self.assertEqual(order.items.count(), initial_count - 1)
    
    def test_calculate_totals(self):
        """Test order totals calculation"""
        items_data = [
            {
                'product': self.product1,
                'quantity': 10,
                'unit_price': Decimal('1500'),
                'discount': 0
            }
        ]
        
        order = self.service.create_order(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data
        )
        
        # Subtotal = 10 * 1500 = 15000
        # Tax = 15000 * 0.18 = 2700
        # Total = 15000 + 2700 = 17700
        
        self.assertEqual(order.subtotal, Decimal('15000'))
        self.assertEqual(order.tax_amount, Decimal('2700'))
        self.assertEqual(order.total_amount, Decimal('17700'))
    
    def test_deduct_stock(self):
        """Test stock deduction"""
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        order = self.service.create_order(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data,
            status='pending'
        )
        
        # Deduct stock
        self.service.deduct_stock(order, self.user)
        
        self.assertTrue(order.stock_deducted)
        
        # Verify stock movement
        from inventory.models import StockMovement
        movements = StockMovement.objects.filter(
            product=self.product1,
            movement_type='exit'
        )
        self.assertGreaterEqual(movements.count(), 1)
    
    def test_deduct_stock_twice_fails(self):
        """Test that deducting stock twice doesn't duplicate"""
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        order = self.service.create_order(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data,
            status='validated'
        )
        
        initial_movement_count = StockMovement.objects.filter(
            product=self.product1,
            movement_type='exit'
        ).count()
        
        # Try to deduct again
        self.service.deduct_stock(order, self.user)
        
        # Should still only have the same number of movements
        final_movement_count = StockMovement.objects.filter(
            product=self.product1,
            movement_type='exit'
        ).count()
        self.assertEqual(final_movement_count, initial_movement_count)
    
    def test_restore_stock(self):
        """Test stock restoration"""
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        order = self.service.create_order(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data,
            status='validated'
        )
        
        # Restore stock
        self.service.restore_stock(order, self.user)
        
        self.assertFalse(order.stock_deducted)
        
        # Verify return movement
        from inventory.models import StockMovement
        returns = StockMovement.objects.filter(
            product=self.product1,
            movement_type='return'
        )
        self.assertGreaterEqual(returns.count(), 1)
    
    def test_cancel_order(self):
        """Test order cancellation"""
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        order = self.service.create_order(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data,
            status='validated'
        )
        
        # Cancel order
        cancelled_order = self.service.cancel_order(order, self.user)
        
        self.assertEqual(cancelled_order.status, 'cancelled')
        self.assertFalse(cancelled_order.stock_deducted)
    
    def test_change_status_to_validated(self):
        """Test changing status to validated deducts stock"""
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        order = self.service.create_order(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data,
            status='pending'
        )
        
        # Change to validated
        self.service.change_status(order, 'validated', self.user)
        
        self.assertEqual(order.status, 'validated')
        self.assertTrue(order.stock_deducted)
    
    def test_change_status_to_cancelled(self):
        """Test changing status to cancelled restores stock"""
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        order = self.service.create_order(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data,
            status='validated'
        )
        
        # Change to cancelled
        self.service.change_status(order, 'cancelled', self.user)
        
        self.assertEqual(order.status, 'cancelled')
        self.assertFalse(order.stock_deducted)
    
    def test_change_status_invalid(self):
        """Test changing to invalid status fails"""
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        order = self.service.create_order(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data
        )
        
        with self.assertRaises(ValidationError):
            self.service.change_status(order, 'invalid_status', self.user)
    
    def test_wholesale_order(self):
        """Test wholesale order creation"""
        items_data = [
            {
                'product': self.product1,
                'quantity': 10,
                'unit_price': self.product1.wholesale_selling_price
            }
        ]
        
        order = self.service.create_order(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data,
            order_type='wholesale'
        )
        
        self.assertEqual(order.order_type, 'wholesale')
        item = order.items.first()
        self.assertEqual(item.unit_price, self.product1.wholesale_selling_price)
