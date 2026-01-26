"""
Comprehensive Unit Tests for QuoteService

Tests all methods and edge cases with high coverage.
"""

from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

from inventory.models import Product, Client, PointOfSale, Category, Quote, QuoteItem
from inventory.services import QuoteService


class QuoteServiceTestCase(TestCase):
    """Comprehensive tests for QuoteService"""
    
    def setUp(self):
        """Set up test data"""
        self.service = QuoteService()
        
        # Create test user
        self.user = User.objects.create_user(
            username='testuser_quo',
            password='testpass123'
        )
        
        # Create category
        self.category = Category.objects.create(
            name='Test Category Quo'
        )
        
        # Create point of sale
        self.pos = PointOfSale.objects.create(
            name='Test POS Quo',
            code='POSQUO001',
            address='123 Test St',
            manager_name='Test Manager'
        )
        
        # Create client
        self.client = Client.objects.create(
            name='Test Client Quo',
            email='client@testquo.com',
            phone='1234567890'
        )
        
        # Create products
        self.product1 = Product.objects.create(
            name='Product 1',
            sku='PRODQUO001',
            category=self.category,
            purchase_price=Decimal('1000'),
            selling_price=Decimal('1500'),
            wholesale_selling_price=Decimal('1300'),
            units_per_box=10
        )
        
        self.product2 = Product.objects.create(
            name='Product 2',
            sku='PRODQUO002',
            category=self.category,
            purchase_price=Decimal('2000'),
            selling_price=Decimal('3000'),
            wholesale_selling_price=Decimal('2500'),
            units_per_box=5
        )
    
    def test_create_quote_success(self):
        """Test successful quote creation"""
        items_data = [
            {
                'product': self.product1,
                'quantity': 10,
                'unit_price': self.product1.selling_price,
                'discount': 0
            }
        ]
        
        quote = self.service.create_quote(
            client=self.client,
            user=self.user,
            items_data=items_data
        )
        
        self.assertIsNotNone(quote)
        self.assertEqual(quote.client, self.client)
        self.assertEqual(quote.quoteitem_set.count(), 1)
        self.assertEqual(quote.status, 'draft')
    
    def test_create_quote_with_custom_expiration(self):
        """Test quote creation with custom expiration date"""
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        expiration = date.today() + timedelta(days=60)
        
        quote = self.service.create_quote(
            client=self.client,
            user=self.user,
            items_data=items_data,
            valid_until=expiration
        )
        
        self.assertEqual(quote.valid_until, expiration)
    
    def test_create_quote_without_items(self):
        """Test quote creation fails without items"""
        with self.assertRaises(Exception):
            self.service.create_quote(
                client=self.client,
                user=self.user,
                items_data=[]
            )
    
    def test_update_quote(self):
        """Test quote update"""
        # Create quote
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        quote = self.service.create_quote(
            client=self.client,
            user=self.user,
            items_data=items_data
        )
        
        # Update quote
        new_items_data = [
            {'product': self.product2, 'quantity': 5}
        ]
        
        updated_quote = self.service.update_quote(
            quote=quote,
            items_data=new_items_data,
            user=self.user,
            notes='Updated quote'
        )
        
        self.assertEqual(updated_quote.quoteitem_set.count(), 1)
        self.assertEqual(updated_quote.quoteitem_set.first().product, self.product2)
    
    def test_update_accepted_quote_fails(self):
        """Test updating accepted quote fails"""
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        quote = self.service.create_quote(
            client=self.client,
            user=self.user,
            items_data=items_data
        )
        
        quote.status = 'accepted'
        quote.save()
        
        with self.assertRaises(Exception):
            self.service.update_quote(
                quote=quote,
                items_data=items_data,
                user=self.user
            )
    
    def test_calculate_totals(self):
        """Test quote totals calculation"""
        items_data = [
            {
                'product': self.product1,
                'quantity': 10,
                'unit_price': Decimal('1500'),
                'discount': 10
            }
        ]
        
        quote = self.service.create_quote(
            client=self.client,
            user=self.user,
            items_data=items_data
        )
        
        # Subtotal = (10 * 1500) * 0.9 = 13500
        # Tax = 13500 * 0.18 = 2430
        # Total = 13500 + 2430 = 15930
        
        self.assertEqual(quote.subtotal, Decimal('13500'))
        self.assertEqual(quote.tax_amount, Decimal('2430'))
        self.assertEqual(quote.total_amount, Decimal('15930'))
    
    def test_convert_to_invoice(self):
        """Test converting quote to invoice"""
        # Create inventory first
        from inventory.models import Inventory
        Inventory.objects.create(
            product=self.product1,
            point_of_sale=self.pos,
            quantity=100
        )
        
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        quote = self.service.create_quote(
            client=self.client,
            user=self.user,
            items_data=items_data
        )
        
        # Convert to invoice
        invoice = self.service.convert_to_invoice(
            quote=quote,
            user=self.user,
            point_of_sale=self.pos
        )
        
        self.assertIsNotNone(invoice)
        self.assertEqual(invoice.client, quote.client)
        self.assertEqual(quote.status, 'accepted')
    
    def test_convert_rejected_quote_fails(self):
        """Test converting rejected quote fails"""
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        quote = self.service.create_quote(
            client=self.client,
            user=self.user,
            items_data=items_data
        )
        
        quote.status = 'rejected'
        quote.save()
        
        with self.assertRaises(Exception):
            self.service.convert_to_invoice(
                quote=quote,
                user=self.user,
                point_of_sale=self.pos
            )
    
    def test_convert_expired_quote_fails(self):
        """Test converting expired quote fails"""
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        quote = self.service.create_quote(
            client=self.client,
            user=self.user,
            items_data=items_data,
            valid_until=date.today() - timedelta(days=1)
        )
        
        with self.assertRaises(Exception):
            self.service.convert_to_invoice(
                quote=quote,
                user=self.user,
                point_of_sale=self.pos
            )
    
    def test_convert_to_order(self):
        """Test converting quote to order"""
        # Create inventory
        from inventory.models import Inventory
        Inventory.objects.create(
            product=self.product1,
            point_of_sale=self.pos,
            quantity=100
        )
        
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        quote = self.service.create_quote(
            client=self.client,
            user=self.user,
            items_data=items_data
        )
        
        # Convert to order
        order = self.service.convert_to_order(
            quote=quote,
            user=self.user,
            point_of_sale=self.pos,
            order_type='retail'
        )
        
        self.assertIsNotNone(order)
        self.assertEqual(order.client, quote.client)
        self.assertEqual(quote.status, 'accepted')
    
    def test_expire_quote(self):
        """Test expiring a quote"""
        items_data = [
            {'product': self.product1, 'quantity': 10}
        ]
        
        quote = self.service.create_quote(
            client=self.client,
            user=self.user,
            items_data=items_data,
            valid_until=date.today() - timedelta(days=1)
        )
        
        expired_quote = self.service.expire_quote(quote)
        
        self.assertEqual(expired_quote.status, 'expired')
    
    def test_expire_old_quotes(self):
        """Test expiring multiple old quotes"""
        # Create multiple quotes
        for i in range(3):
            items_data = [
                {'product': self.product1, 'quantity': 10}
            ]
            
            self.service.create_quote(
                client=self.client,
                user=self.user,
                items_data=items_data,
                valid_until=date.today() - timedelta(days=i+1)
            )
        
        # Expire all old quotes
        count = self.service.expire_old_quotes()
        
        self.assertEqual(count, 3)
        
        # Verify all are expired
        expired_quotes = Quote.objects.filter(status='expired')
        self.assertEqual(expired_quotes.count(), 3)
