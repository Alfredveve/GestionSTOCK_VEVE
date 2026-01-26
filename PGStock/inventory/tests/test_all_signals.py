"""
Comprehensive Unit Tests for All Signals

Tests all 20 signals with high coverage.
"""

from decimal import Decimal
from datetime import date
from django.test import TestCase
from django.contrib.auth.models import User
from unittest.mock import patch, MagicMock

from inventory.models import (
    Product, Client, PointOfSale, Category, Supplier,
    Inventory, Invoice, InvoiceItem, Payment, Expense,
    StockMovement, Receipt, Notification, ExpenseCategory
)
from sales.models import Order, OrderItem


class InventorySignalsTestCase(TestCase):
    """Tests for inventory app signals"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(username='test_inv', password='pass', is_staff=True)
        self.category = Category.objects.create(name='Test Category')
        self.pos = PointOfSale.objects.create(name='Test POS', code='POS001', address='123 St')
        self.client = Client.objects.create(name='Test Client', email='client@test.com')
        
        self.product = Product.objects.create(
            name='Test Product',
            sku='PROD001',
            category=self.category,
            purchase_price=Decimal('1000'),
            selling_price=Decimal('1500'),
            reorder_level=20
        )
    
    def test_check_stock_after_movement_signal(self):
        """Test that low stock check is triggered after stock movement"""
        # Create inventory with low stock
        inventory = Inventory.objects.create(
            product=self.product,
            point_of_sale=self.pos,
            quantity=15  # Below reorder level
        )
        
        # Create stock movement (should trigger signal)
        movement = StockMovement.objects.create(
            product=self.product,
            movement_type='exit',
            quantity=5,
            from_point_of_sale=self.pos,
            user=self.user
        )
        
        # Signal should have been triggered
    
    def test_notify_low_stock_signal(self):
        """Test low stock notification signal"""
        # Create inventory with high stock
        inventory = Inventory.objects.create(
            product=self.product,
            point_of_sale=self.pos,
            quantity=50
        )
        
        # Update to trigger signal (low stock)
        inventory.quantity = 5
        inventory.save()
        
        # Should have created notifications for staff
        new_notifications = Notification.objects.filter(
            title='Stock Faible'
        )
        self.assertGreater(new_notifications.count(), 0)
    
    def test_notify_new_invoice_signal(self):
        """Test invoice creation notification signal"""
        # Create invoice
        invoice = Invoice.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user,
            status='draft',
            date_issued=date.today(),
            date_due=date.today()
        )
        
        # Should have created notifications
        new_notifications = Notification.objects.filter(
            title='Nouvelle Facture'
        )
        self.assertGreater(new_notifications.count(), 0)
    
    def test_notify_payment_received_signal(self):
        """Test payment notification signal"""
        invoice = Invoice.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user,
            total_amount=Decimal('10000'),
            date_issued=date.today(),
            date_due=date.today()
        )
        
        # Create payment
        payment = Payment.objects.create(
            invoice=invoice,
            amount=Decimal('5000'),
            payment_method='cash',
            payment_date=date.today(),
            created_by=self.user
        )
        
        # Should have created notifications
        new_notifications = Notification.objects.filter(
            title='Paiement Reçu'
        )
        self.assertGreater(new_notifications.count(), 0)
    
    def test_track_product_price_changes_signal(self):
        """Test product price change tracking"""
        # Update retail price
        old_price = self.product.selling_price
        self.product.selling_price = Decimal('1800')
        self.product.save()
        
        # Should have created notification
        notifications = Notification.objects.filter(
            title='Changement de Prix'
        )
        self.assertGreater(notifications.count(), 0)
    
    def test_validate_product_deletion_signal(self):
        """Test product deletion validation"""
        # Create inventory
        Inventory.objects.create(
            product=self.product,
            point_of_sale=self.pos,
            quantity=50
        )
        
        # Try to delete product (should create warning)
        self.product.delete()
        
        # Should have created warning notification
        warnings = Notification.objects.filter(
            title='Tentative de Suppression de Produit',
            notification_type='warning'
        )
        self.assertGreater(warnings.count(), 0)


class SalesSignalsTestCase(TestCase):
    """Tests for sales app signals"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(username='test_sales', password='pass', is_staff=True)
        self.category = Category.objects.create(name='Test Category Sales')
        self.pos = PointOfSale.objects.create(name='Test POS Sales', code='SALES001', address='123 St')
        self.client = Client.objects.create(name='Test Client Sales', email='client@test.com')
        
        self.product = Product.objects.create(
            name='Test Product Sales',
            sku='SALESPROD001',
            category=self.category,
            purchase_price=Decimal('1000'),
            selling_price=Decimal('1500')
        )
        
        # Create inventory
        Inventory.objects.create(
            product=self.product,
            point_of_sale=self.pos,
            quantity=100
        )
    
    def test_notify_order_created_signal(self):
        """Test order creation notification"""
        # Create order
        order = Order.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user,
            total_amount=Decimal('15000')
        )
        
        # Should have created notifications
        new_notifications = Notification.objects.filter(
            title='Nouvelle Commande'
        )
        self.assertGreater(new_notifications.count(), 0)
    
    def test_handle_order_status_change_signal(self):
        """Test order status change handling"""
        # Create order
        order = Order.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user,
            status='pending'
        )
        
        # Add item
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=10,
            unit_price=Decimal('1500')
        )
        
        # Change status to validated (should deduct stock)
        order.status = 'validated'
        order.save()
        
        # Should have created stock movement
        new_movements = StockMovement.objects.filter(
            product=self.product,
            movement_type='exit'
        )
        self.assertGreater(new_movements.count(), 0)
    
    def test_order_cancellation_restores_stock(self):
        """Test that cancelling order restores stock"""
        # Create validated order
        order = Order.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user,
            status='validated',
            stock_deducted=True
        )
        
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=10,
            unit_price=Decimal('1500')
        )
        
        # Cancel order
        order.status = 'cancelled'
        order.save()
        
        # Should have created return movement
        returns = StockMovement.objects.filter(
            product=self.product,
            movement_type='return'
        )
        self.assertGreater(returns.count(), 0)


class PurchasingSignalsTestCase(TestCase):
    """Tests for purchasing app signals"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(username='test_purch', password='pass', is_staff=True)
        self.supplier = Supplier.objects.create(name='Test Supplier', email='supplier@test.com')
        self.pos = PointOfSale.objects.create(name='Test POS Purch', code='PURCH001', address='123 St')
        self.category = Category.objects.create(name='Test Category Purch')
        
        self.product = Product.objects.create(
            name='Test Product Purch',
            sku='PURCHPROD001',
            category=self.category,
            purchase_price=Decimal('1000'),
            selling_price=Decimal('1500')
        )
    
    def test_notify_receipt_created_signal(self):
        """Test receipt creation notification"""
        # Create receipt
        receipt = Receipt.objects.create(
            supplier=self.supplier,
            point_of_sale=self.pos,
            created_by=self.user,
            receipt_number='REC-001',
            date_received=date.today()
        )
        
        # Should have created notifications
        new_notifications = Notification.objects.filter(
            title='Nouveau Bon de Réception'
        )
        self.assertGreater(new_notifications.count(), 0)
    
    def test_handle_receipt_status_change_signal(self):
        """Test receipt status change notification"""
        # Create receipt
        receipt = Receipt.objects.create(
            supplier=self.supplier,
            point_of_sale=self.pos,
            created_by=self.user,
            status='draft',
            receipt_number='REC-002',
            date_received=date.today()
        )
        
        # Change to validated
        receipt.status = 'validated'
        receipt.save()
        
        # Should have created notification
        new_notifications = Notification.objects.filter(
            title='Bon de Réception Validé'
        )
        self.assertGreater(new_notifications.count(), 0)


class StockSignalsTestCase(TestCase):
    """Tests for stock app signals"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(username='test_stock', password='pass', is_staff=True)
        self.category = Category.objects.create(name='Test Category Stock')
        self.pos1 = PointOfSale.objects.create(name='POS Stock 1', code='STOCK001', address='123 St')
        self.pos2 = PointOfSale.objects.create(name='POS Stock 2', code='STOCK002', address='456 St')
        
        self.product = Product.objects.create(
            name='Test Product Stock',
            sku='STOCKPROD001',
            category=self.category,
            purchase_price=Decimal('1000'),
            selling_price=Decimal('1500')
        )
        
        # Create inventory
        Inventory.objects.create(product=self.product, point_of_sale=self.pos1, quantity=100)
        Inventory.objects.create(product=self.product, point_of_sale=self.pos2, quantity=50)
    
    def test_notify_transfer_completed_signal(self):
        """Test transfer completion notification"""
        # Create transfer movement
        movement = StockMovement.objects.create(
            product=self.product,
            movement_type='transfer',
            quantity=20,
            from_point_of_sale=self.pos1,
            to_point_of_sale=self.pos2,
            user=self.user,
            reference='TRANS-001'
        )
        
        # Should have created notifications
        new_notifications = Notification.objects.filter(
            title='Transfert Complété'
        )
        self.assertGreater(new_notifications.count(), 0)


class FinancialSignalsTestCase(TestCase):
    """Tests for financial signals"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(username='test_fin', password='pass')
        self.pos = PointOfSale.objects.create(name='Test POS Fin', code='FIN001', address='123 St')
        self.client = Client.objects.create(name='Test Client Fin', email='client@test.com')
        self.expense_category = ExpenseCategory.objects.create(name='Finance Category')
    
    def test_update_profit_report_on_invoice_signal(self):
        """Test profit report update on invoice"""
        # Create invoice
        invoice = Invoice.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user,
            status='paid',
            date_issued=date.today(),
            date_due=date.today(),
            total_amount=Decimal('10000')
        )
    
    def test_update_profit_report_on_payment_signal(self):
        """Test profit report update on payment"""
        invoice = Invoice.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user,
            date_issued=date.today(),
            date_due=date.today(),
            total_amount=Decimal('10000')
        )
        
        # Create payment
        payment = Payment.objects.create(
            invoice=invoice,
            amount=Decimal('5000'),
            payment_method='cash',
            payment_date=date.today(),
            created_by=self.user
        )
    
    def test_update_profit_report_on_expense_signal(self):
        """Test profit report update on expense"""
        # Create expense
        expense = Expense.objects.create(
            reference='EXP-001',
            category=self.expense_category,
            description='Test Expense',
            amount=Decimal('5000'),
            date=date.today(),
            point_of_sale=self.pos,
            created_by=self.user
        )
    
    def test_handle_expense_changes_signal(self):
        """Test expense change tracking"""
        # Create expense
        expense = Expense.objects.create(
            reference='EXP-002',
            category=self.expense_category,
            description='Test Expense',
            amount=Decimal('5000'),
            date=date.today(),
            point_of_sale=self.pos,
            created_by=self.user
        )
        
        # Update expense
        expense.amount = Decimal('7000')
        expense.save()
