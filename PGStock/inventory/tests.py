from django.test import TestCase, Client as TestClient
from django.contrib.auth.models import User
from django.urls import reverse
from .models import Client, Supplier, Category, Product, Invoice, Receipt, Inventory
from decimal import Decimal
from datetime import date

class InventoryFlowTests(TestCase):
    def setUp(self):
        # Create a superuser for authentication (required for many views)
        self.user = User.objects.create_superuser(username='testuser', password='password', email='test@test.com')
        self.client = TestClient()
        self.client.login(username='testuser', password='password')

        # Create basic dependencies
        self.category = Category.objects.create(name="Test Category")
        self.supplier = Supplier.objects.create(name="Test Supplier", email="supplier@test.com")
        self.product = Product.objects.create(
            name="Test Product",
            sku="TEST-001",
            category=self.category,
            supplier=self.supplier,
            selling_price=Decimal('100.00')
        )
        # Create inventory
        self.inventory = Inventory.objects.create(product=self.product, quantity=100)

    def test_client_creation(self):
        """Test creating a client via the view"""
        response = self.client.post(reverse('inventory:client_create'), {
            'name': 'New Client',
            'client_type': 'individual',
            'email': 'client@test.com',
            'phone': '1234567890',
            'address': '123 Test St'
        })
        # Check for redirection (success)
        self.assertEqual(response.status_code, 302)
        # Verify client exists in DB
        self.assertTrue(Client.objects.filter(name='New Client').exists())

    def test_invoice_creation(self):
        """Test creating an invoice"""
        # Create a client first
        db_client = Client.objects.create(name="Invoice Client", email="invoice@test.com")
        
        # Data for invoice creation
        # Note: The form might expect different data structure depending on how items are handled (formset vs JS)
        # Based on views.py, invoice_create just saves the invoice form, items are likely added separately or via formset
        # Let's check invoice_create view again. It saves InvoiceForm.
        # If items are added in a separate step or via JS that submits to a different endpoint, this test might need adjustment.
        # Looking at views.py: invoice_create only handles InvoiceForm.
        
        response = self.client.post(reverse('inventory:invoice_create'), {
            'client': db_client.id,
            'date_issued': date.today(),
            'date_due': date.today(),
            'status': 'draft',
            'tax_rate': 16
        })
        
        self.assertEqual(response.status_code, 302)
        # Verify invoice exists
        self.assertTrue(Invoice.objects.filter(client=db_client).exists())
        
    def test_receipt_creation(self):
        """Test creating a receipt (Bon de commande/reception)"""
        response = self.client.post(reverse('inventory:receipt_create'), {
            'supplier': self.supplier.id,
            'date_received': date.today(),
            'status': 'draft',
            'supplier_reference': 'REF-001'
        })
        
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Receipt.objects.filter(supplier=self.supplier).exists())

    def test_model_str_methods(self):
        """Test string representations"""
        self.assertEqual(str(self.category), "Test Category")
        self.assertEqual(str(self.supplier), "Test Supplier")
        self.assertEqual(str(self.product), "Test Product (TEST-001)")

    def test_api_search_products(self):
        """Test the optimized search API"""
        response = self.client.get(reverse('inventory:api_pos_search_products'), {'q': 'Test'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(len(data['results']) > 0)
        self.assertEqual(data['results'][0]['name'], "Test Product")
        self.assertEqual(data['results'][0]['stock'], 100) # From setup inventory

