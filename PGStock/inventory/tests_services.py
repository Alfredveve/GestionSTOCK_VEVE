"""
Service Layer Tests

Unit tests for the service layer.
Demonstrates testability of the service architecture.
"""

from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

from inventory.models import (
    Product, Category, Supplier, Client, PointOfSale, 
    Inventory, Invoice, Receipt
)
from inventory.services import (
    StockService, InvoiceService, ReceiptService, PaymentService
)
from inventory.services.base import ServiceException


class StockServiceTest(TestCase):
    """Tests for StockService"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(username='testuser', password='12345')
        self.category = Category.objects.create(name='Test Category')
        self.pos = PointOfSale.objects.create(
            name='Magasin Principal',
            code='MAG01',
            address='123 Rue Test'
        )
        self.product = Product.objects.create(
            name='Produit Test',
            sku='TEST001',
            category=self.category,
            purchase_price=Decimal('100.00'),
            selling_price=Decimal('150.00')
        )
        self.stock_service = StockService()
    
    def test_process_entry(self):
        """Test stock entry"""
        movement = self.stock_service.process_entry(
            product=self.product,
            quantity=Decimal('10'),
            point_of_sale=self.pos,
            user=self.user,
            reference='TEST-001'
        )
        
        self.assertEqual(movement.movement_type, 'entry')
        self.assertEqual(movement.quantity, Decimal('10'))
        
        # Check inventory updated
        inventory = Inventory.objects.get(product=self.product, point_of_sale=self.pos)
        self.assertEqual(inventory.quantity, Decimal('10'))
    
    def test_process_exit_insufficient_stock(self):
        """Test exit with insufficient stock raises exception"""
        with self.assertRaises(ServiceException):
            self.stock_service.process_exit(
                product=self.product,
                quantity=Decimal('10'),
                point_of_sale=self.pos,
                user=self.user
            )
    
    def test_process_transfer(self):
        """Test stock transfer between points of sale"""
        # Create second POS
        pos2 = PointOfSale.objects.create(
            name='Magasin 2',
            code='MAG02',
            address='456 Rue Test'
        )
        
        # Add stock to first POS
        self.stock_service.process_entry(
            product=self.product,
            quantity=Decimal('20'),
            point_of_sale=self.pos,
            user=self.user
        )
        
        # Transfer
        movement = self.stock_service.process_transfer(
            product=self.product,
            quantity=Decimal('5'),
            from_point_of_sale=self.pos,
            to_point_of_sale=pos2,
            user=self.user
        )
        
        self.assertEqual(movement.movement_type, 'transfer')
        
        # Check inventories
        inv1 = Inventory.objects.get(product=self.product, point_of_sale=self.pos)
        inv2 = Inventory.objects.get(product=self.product, point_of_sale=pos2)
        
        self.assertEqual(inv1.quantity, Decimal('15'))
        self.assertEqual(inv2.quantity, Decimal('5'))
    
    def test_check_stock_availability(self):
        """Test stock availability check"""
        # No stock initially
        available = self.stock_service.check_stock_availability(
            product=self.product,
            point_of_sale=self.pos,
            required_quantity=Decimal('5')
        )
        self.assertFalse(available)
        
        # Add stock
        self.stock_service.process_entry(
            product=self.product,
            quantity=Decimal('10'),
            point_of_sale=self.pos,
            user=self.user
        )
        
        # Check again
        available = self.stock_service.check_stock_availability(
            product=self.product,
            point_of_sale=self.pos,
            required_quantity=Decimal('5')
        )
        self.assertTrue(available)


class InvoiceServiceTest(TestCase):
    """Tests for InvoiceService"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(username='testuser', password='12345')
        self.category = Category.objects.create(name='Test Category')
        self.pos = PointOfSale.objects.create(
            name='Magasin Principal',
            code='MAG01',
            address='123 Rue Test'
        )
        self.client = Client.objects.create(
            name='Client Test',
            email='client@test.com'
        )
        self.product = Product.objects.create(
            name='Produit Test',
            sku='TEST001',
            category=self.category,
            purchase_price=Decimal('100.00'),
            selling_price=Decimal('150.00')
        )
        
        # Add stock
        Inventory.objects.create(
            product=self.product,
            point_of_sale=self.pos,
            quantity=Decimal('100')
        )
        
        self.invoice_service = InvoiceService()
    
    def test_create_invoice_draft(self):
        """Test creating a draft invoice (no stock deduction)"""
        items_data = [{
            'product': self.product,
            'quantity': Decimal('5'),
            'unit_price': Decimal('150.00'),
            'discount': Decimal('0'),
            'is_wholesale': False
        }]
        
        invoice = self.invoice_service.create_invoice(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data,
            status='draft'
        )
        
        self.assertEqual(invoice.status, 'draft')
        self.assertFalse(invoice.stock_deducted)
        self.assertEqual(invoice.total_amount, Decimal('750.00'))
        
        # Stock should NOT be deducted
        inventory = Inventory.objects.get(product=self.product, point_of_sale=self.pos)
        self.assertEqual(inventory.quantity, Decimal('100'))
    
    def test_create_invoice_paid(self):
        """Test creating a paid invoice (with stock deduction)"""
        items_data = [{
            'product': self.product,
            'quantity': Decimal('5'),
            'unit_price': Decimal('150.00'),
            'discount': Decimal('0'),
            'is_wholesale': False
        }]
        
        invoice = self.invoice_service.create_invoice(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data,
            status='paid'
        )
        
        self.assertEqual(invoice.status, 'paid')
        self.assertTrue(invoice.stock_deducted)
        
        # Stock SHOULD be deducted
        inventory = Inventory.objects.get(product=self.product, point_of_sale=self.pos)
        self.assertEqual(inventory.quantity, Decimal('95'))
    
    def test_cancel_invoice_restores_stock(self):
        """Test that cancelling an invoice restores stock"""
        items_data = [{
            'product': self.product,
            'quantity': Decimal('5'),
            'unit_price': Decimal('150.00'),
            'discount': Decimal('0'),
            'is_wholesale': False
        }]
        
        # Create paid invoice
        invoice = self.invoice_service.create_invoice(
            client=self.client,
            point_of_sale=self.pos,
            user=self.user,
            items_data=items_data,
            status='paid'
        )
        
        # Stock deducted
        inventory = Inventory.objects.get(product=self.product, point_of_sale=self.pos)
        self.assertEqual(inventory.quantity, Decimal('95'))
        
        # Cancel invoice
        self.invoice_service.cancel_invoice(invoice, self.user)
        
        # Stock restored
        inventory.refresh_from_db()
        self.assertEqual(inventory.quantity, Decimal('100'))
        self.assertEqual(invoice.status, 'cancelled')
        self.assertFalse(invoice.stock_deducted)


class PaymentServiceTest(TestCase):
    """Tests for PaymentService"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(username='testuser', password='12345')
        self.pos = PointOfSale.objects.create(
            name='Magasin Principal',
            code='MAG01',
            address='123 Rue Test'
        )
        self.client = Client.objects.create(
            name='Client Test',
            email='client@test.com'
        )
        
        # Create an invoice
        self.invoice = Invoice.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user,
            invoice_number='INV-001',
            subtotal=Decimal('1000.00'),
            total_amount=Decimal('1000.00'),
            status='sent'
        )
        
        self.payment_service = PaymentService()
    
    def test_register_full_payment(self):
        """Test registering a full payment"""
        payment = self.payment_service.process_full_payment(
            invoice=self.invoice,
            payment_method='cash',
            user=self.user
        )
        
        self.assertEqual(payment.amount, Decimal('1000.00'))
        
        # Invoice should be marked as paid
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, 'paid')
    
    def test_register_partial_payment(self):
        """Test registering a partial payment"""
        payment = self.payment_service.register_payment(
            invoice=self.invoice,
            amount=Decimal('500.00'),
            payment_method='cash',
            user=self.user
        )
        
        self.assertEqual(payment.amount, Decimal('500.00'))
        
        # Invoice should be partially paid
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, 'partially_paid')
    
    def test_payment_exceeds_balance(self):
        """Test that payment exceeding balance raises exception"""
        with self.assertRaises(ServiceException):
            self.payment_service.register_payment(
                invoice=self.invoice,
                amount=Decimal('1500.00'),  # More than total
                payment_method='cash',
                user=self.user
            )
    
    def test_get_payment_summary(self):
        """Test getting payment summary"""
        # Register partial payment
        self.payment_service.register_payment(
            invoice=self.invoice,
            amount=Decimal('600.00'),
            payment_method='cash',
            user=self.user
        )
        
        summary = self.payment_service.get_payment_summary(self.invoice)
        
        self.assertEqual(summary['total_amount'], Decimal('1000.00'))
        self.assertEqual(summary['total_paid'], Decimal('600.00'))
        self.assertEqual(summary['remaining'], Decimal('400.00'))
        self.assertEqual(summary['payment_count'], 1)
        self.assertTrue(summary['is_partially_paid'])
        self.assertFalse(summary['is_fully_paid'])


# Run tests with:
# python manage.py test inventory.tests_services
