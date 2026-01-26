"""
Comprehensive Unit Tests for NotificationService

Tests all methods and edge cases with high coverage.
"""

from django.test import TestCase
from django.contrib.auth.models import User
from datetime import date

from inventory.models import (
    Product, Client, PointOfSale, Category, Supplier,
    Inventory, Invoice, Payment, Notification
)
from inventory.services import NotificationService
from sales.models import Order
from decimal import Decimal


class NotificationServiceTestCase(TestCase):
    """Comprehensive tests for NotificationService"""
    
    def setUp(self):
        """Set up test data"""
        self.service = NotificationService()
        
        # Create test users
        self.user1 = User.objects.create_user(
            username='user1_not',
            password='pass123',
            is_staff=True
        )
        
        self.user2 = User.objects.create_user(
            username='user2_not',
            password='pass123',
            is_staff=True
        )
        
        self.regular_user = User.objects.create_user(
            username='regular_not',
            password='pass123',
            is_staff=False
        )
        
        # Create test data
        self.category = Category.objects.create(name='Test Category Not')
        self.pos = PointOfSale.objects.create(
            name='Test POS Not',
            code='POSNOT001',
            address='123 Test St',
            manager_name='Test Manager'
        )
        self.client = Client.objects.create(
            name='Test Client Not',
            email='client@testnot.com'
        )
        self.product = Product.objects.create(
            name='Test Product Not',
            sku='PRODNOT001',
            category=self.category,
            purchase_price=Decimal('1000'),
            selling_price=Decimal('1500'),
            wholesale_selling_price=Decimal('1300')
        )
    
    def test_create_notification(self):
        """Test creating a single notification"""
        notification = self.service.create_notification(
            recipient=self.user1,
            title='Test Notification',
            message='This is a test message',
            notification_type='info',
            link='/test'
        )
        
        self.assertIsNotNone(notification)
        self.assertEqual(notification.recipient, self.user1)
        self.assertEqual(notification.title, 'Test Notification')
        self.assertEqual(notification.notification_type, 'info')
        self.assertFalse(notification.is_read)
    
    def test_bulk_create_for_staff(self):
        """Test creating notifications for all staff users"""
        notifications = self.service.bulk_create_for_staff(
            title='Staff Notification',
            message='Message for all staff',
            notification_type='warning',
            link='/dashboard'
        )
        
        # Verify it created for staff users (filter by our test users)
        staff_notifs = [n for n in notifications if n.recipient in [self.user1, self.user2]]
        self.assertGreaterEqual(len(staff_notifs), 2)
        
        # Verify all are for staff users
        for notif in notifications:
            self.assertTrue(notif.recipient.is_staff)
    
    def test_notify_low_stock(self):
        """Test low stock notification"""
        inventory = Inventory.objects.create(
            product=self.product,
            point_of_sale=self.pos,
            quantity=5
        )
        
        notifications = self.service.notify_low_stock(self.product, inventory)
        
        # Verify staff users got notified
        staff_notified = [n for n in notifications if n.recipient in [self.user1, self.user2]]
        self.assertGreaterEqual(len(staff_notified), 2)
        
        for notif in staff_notified:
            self.assertEqual(notif.title, 'Stock Faible')
            self.assertEqual(notif.notification_type, 'warning')
            self.assertIn(self.product.name, notif.message)
    
    def test_notify_invoice_created(self):
        """Test invoice creation notification"""
        invoice = Invoice.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user1,
            status='draft',
            date_issued=date.today(),
            date_due=date.today()
        )
        
        notifications = self.service.notify_invoice_created(invoice)
        
        staff_notified = [n for n in notifications if n.recipient in [self.user1, self.user2]]
        self.assertGreaterEqual(len(staff_notified), 2)
        
        for notif in staff_notified:
            self.assertEqual(notif.title, 'Nouvelle Facture')
            self.assertIn(invoice.invoice_number, notif.message)
    
    def test_notify_invoice_already_paid_no_notification(self):
        """Test that paid invoices don't create notifications"""
        invoice = Invoice.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user1,
            status='paid',
            date_issued=date.today(),
            date_due=date.today()
        )
        
        notifications = self.service.notify_invoice_created(invoice)
        
        self.assertEqual(len(notifications), 0)
    
    def test_notify_payment_received(self):
        """Test payment received notification"""
        invoice = Invoice.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user1,
            total_amount=Decimal('10000'),
            date_issued=date.today(),
            date_due=date.today()
        )
        
        payment = Payment.objects.create(
            invoice=invoice,
            amount=Decimal('5000'),
            payment_method='cash',
            created_by=self.user1,
            payment_date=date.today()
        )
        
        notifications = self.service.notify_payment_received(payment)
        
        staff_notified = [n for n in notifications if n.recipient in [self.user1, self.user2]]
        self.assertGreaterEqual(len(staff_notified), 2)
        
        for notif in staff_notified:
            self.assertEqual(notif.title, 'Paiement Reçu')
            self.assertEqual(notif.notification_type, 'success')
    
    def test_notify_order_created(self):
        """Test order creation notification"""
        order = Order.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user1,
            total_amount=Decimal('15000')
        )
        
        notifications = self.service.notify_order_created(order)
        
        staff_notified = [n for n in notifications if n.recipient in [self.user1, self.user2]]
        self.assertGreaterEqual(len(staff_notified), 2)
        
        for notif in staff_notified:
            self.assertEqual(notif.title, 'Nouvelle Commande')
            self.assertIn(order.order_number, notif.message)
    
    def test_notify_order_status_changed(self):
        """Test order status change notification"""
        order = Order.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user1
        )
        
        notifications = self.service.notify_order_status_changed(
            order=order,
            old_status='pending',
            new_status='validated'
        )
        
        staff_notified = [n for n in notifications if n.recipient in [self.user1, self.user2]]
        self.assertGreaterEqual(len(staff_notified), 2)
        
        for notif in staff_notified:
            self.assertEqual(notif.title, 'Changement de Statut Commande')
            self.assertIn('En attente', notif.message)
            self.assertIn('Validée', notif.message)
    
    def test_notify_product_price_changed(self):
        """Test product price change notification"""
        notifications = self.service.notify_product_price_changed(
            product=self.product,
            old_price=Decimal('1500'),
            new_price=Decimal('1800'),
            price_type='retail'
        )
        
        staff_notified = [n for n in notifications if n.recipient in [self.user1, self.user2]]
        self.assertGreaterEqual(len(staff_notified), 2)
        
        for notif in staff_notified:
            self.assertEqual(notif.title, 'Changement de Prix')
            self.assertIn('1500', notif.message)
            self.assertIn('1800', notif.message)
    
    def test_mark_as_read(self):
        """Test marking notification as read"""
        notification = self.service.create_notification(
            recipient=self.user1,
            title='Test',
            message='Test message'
        )
        
        self.assertFalse(notification.is_read)
        
        self.service.mark_as_read(notification)
        
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)
    
    def test_mark_all_as_read(self):
        """Test marking all notifications as read for a user"""
        # Create multiple notifications
        for i in range(5):
            self.service.create_notification(
                recipient=self.user1,
                title=f'Test {i}',
                message=f'Message {i}'
            )
        
        # Mark all as read
        count = self.service.mark_all_as_read(self.user1)
        
        self.assertEqual(count, 5)
        
        # Verify all are read
        unread = Notification.objects.filter(
            recipient=self.user1,
            is_read=False
        ).count()
        self.assertEqual(unread, 0)
    
    def test_get_unread_count(self):
        """Test getting unread notification count"""
        # Create notifications
        for i in range(3):
            self.service.create_notification(
                recipient=self.user1,
                title=f'Test {i}',
                message=f'Message {i}'
            )
        
        # Mark one as read
        notif = Notification.objects.filter(recipient=self.user1).first()
        self.service.mark_as_read(notif)
        
        # Get unread count
        count = self.service.get_unread_count(self.user1)
        
        self.assertEqual(count, 2)
    
    def test_delete_old_notifications(self):
        """Test deleting old read notifications"""
        from datetime import datetime, timedelta
        
        # Create old read notification
        old_notif = Notification.objects.create(
            recipient=self.user1,
            title='Old Notification',
            message='Old message',
            is_read=True
        )
        
        # Manually set created_at to 100 days ago
        old_date = datetime.now() - timedelta(days=100)
        Notification.objects.filter(id=old_notif.id).update(created_at=old_date)
        
        # Create recent notification
        recent_notif = self.service.create_notification(
            recipient=self.user1,
            title='Recent',
            message='Recent message'
        )
        
        # Delete old notifications (older than 90 days)
        count = self.service.delete_old_notifications(days=90)
        
        self.assertEqual(count, 1)
        
        # Verify old one is deleted, recent one remains
        self.assertFalse(Notification.objects.filter(id=old_notif.id).exists())
        self.assertTrue(Notification.objects.filter(id=recent_notif.id).exists())
