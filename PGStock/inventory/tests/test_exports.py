from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from inventory.models import Category, Product, Invoice, Client as StoreClient
from sales.models import Order
import datetime
from decimal import Decimal

class ExportTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(username='admin', password='password', email='admin@test.com')
        self.client_auth = Client()
        self.client_auth.force_login(self.user)
        
        self.cat = Category.objects.create(name="Test Cat")
        self.product = Product.objects.create(
            name="Test Product", 
            category=self.cat, 
            purchase_price=Decimal('100'),
            selling_price=Decimal('150')
        )
        self.store_client = StoreClient.objects.create(name="Store Client")
        
        self.invoice = Invoice.objects.create(
            client=self.store_client,
            invoice_number="INV-001",
            date_issued=datetime.date.today(),
            date_due=datetime.date.today() + datetime.timedelta(days=30),
            total_amount=Decimal('150')
        )
        
        self.order = Order.objects.create(
            client=self.store_client,
            order_number="ORD-001",
            total_amount=Decimal('150'),
            order_type='retail'
        )

    def test_invoice_pdf_export(self):
        url = reverse('invoice-download-pdf', kwargs={'pk': self.invoice.pk})
        response = self.client_auth.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_order_pdf_export(self):
        url = reverse('order-download-pdf', kwargs={'pk': self.order.pk})
        response = self.client_auth.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_order_excel_export(self):
        url = reverse('order-export-excel')
        response = self.client_auth.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    def test_order_model_attribute(self):
        # This checks the fix for the AttributeError: 'Order' object has no attribute 'get_invoice_type_display'
        self.assertTrue(hasattr(self.order, 'get_order_type_display'))
        # Ensure it returns a string (avoiding encoding issues in assertion)
        display_name = self.order.get_order_type_display()
        self.assertIsInstance(display_name, str)
        self.assertGreater(len(display_name), 0)

    def test_renderer_import(self):
        try:
            from inventory.renderers import PDFRenderer
            self.assertTrue(True)
        except ImportError:
            self.fail("Could not import PDFRenderer from inventory.renderers")
