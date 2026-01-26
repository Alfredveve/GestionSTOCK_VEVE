"""
Comprehensive Test Suite for Inventory Management API
Tests all endpoints and business logic for the multi-point-of-sale inventory system
"""
from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from decimal import Decimal
from datetime import date, timedelta

from inventory.models import (
    Category, Supplier, Client, Product, PointOfSale, Inventory,
    StockMovement, Invoice, InvoiceItem, Receipt, ReceiptItem,
    Payment, Expense, ExpenseCategory
)
from sales.models import Order


class BaseAPITestCase(APITestCase):
    """Base test case with common setup for all API tests"""
    
    @classmethod
    def setUpTestData(cls):
        """Create common test fixtures once for the class"""
        # Create superuser for authentication
        cls.user = User.objects.create_superuser(
            username='testadmin',
            password='testpass123',
            email='admin@test.com'
        )
        
        # Categories
        cls.category = Category.objects.create(
            name="Boissons",
            description="Boissons diverses"
        )
        
        # Suppliers
        cls.supplier = Supplier.objects.create(
            name="Fournisseur Test",
            email="supplier@test.com",
            phone="123456789",
            city="Conakry"
        )
        
        # Clients
        cls.client_individual = Client.objects.create(
            name="Client Particulier",
            client_type="individual",
            phone="987654321"
        )
        
        cls.client_company = Client.objects.create(
            name="Entreprise ABC",
            client_type="company",
            email="abc@company.com"
        )
        
        # Fix for Postgres sequence issue after manual ID insertion in migration 0007
        from django.db import connection, transaction
        if connection.vendor == 'postgresql':
            with connection.cursor() as cursor:
                cursor.execute("SELECT setval(pg_get_serial_sequence('inventory_pointofsale', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM inventory_pointofsale;")

        # Points of Sale
        # Handle default POS created by migrations
        cls.pos_main, _ = PointOfSale.objects.get_or_create(
            name="Magasin Principal",
            defaults={
                'code': "MAG-001",
                'city': "Conakry",
                'is_active': True,
                'is_warehouse': False
            }
        )
        
        cls.pos_warehouse, _ = PointOfSale.objects.get_or_create(
            name="Entrepôt Central",
            defaults={
                'code': "WH-001",
                'city': "Conakry",
                'is_active': True,
                'is_warehouse': True
            }
        )
        
        # Expense Categories
        cls.expense_category = ExpenseCategory.objects.create(
            name="Loyer",
            description="Loyer mensuel"
        )

    def setUp(self):
        """Set up test client with JWT authentication"""
        # Set up API client with JWT authentication
        self.client = APIClient()
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')

    def assertStatus(self, response, expected_status):
        """Custom assertion that prints response data on failure"""
        if response.status_code != expected_status:
            print(f"\nAssertion Failed: Expected {expected_status}, got {response.status_code}")
            print(f"Response Data: {response.data}\n")
        self.assertEqual(response.status_code, expected_status)


class CategoryAPITests(BaseAPITestCase):
    """Tests for Category API endpoints"""
    
    def test_list_categories(self):
        """Test retrieving list of categories"""
        response = self.client.get('/api/v1/categories/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
        self.assertTrue(len(response.data['results']) > 0)
    
    def test_create_category(self):
        """Test creating a new category"""
        response = self.client.post('/api/v1/categories/', {
            'name': 'Alimentaire',
            'description': 'Produits alimentaires'
        }, format='json')
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['name'], 'Alimentaire')
        self.assertTrue(Category.objects.filter(name='Alimentaire').exists())
    
    def test_update_category(self):
        """Test updating a category"""
        response = self.client.patch(f'/api/v1/categories/{self.category.id}/', {
            'description': 'Boissons alcoolisées et non-alcoolisées'
        }, format='json')
        
        self.assertEqual(response.status_code, 200)
        self.category.refresh_from_db()
        self.assertIn('alcoolisées', self.category.description)


class ClientAPITests(BaseAPITestCase):
    """Tests for Client API endpoints"""
    
    def test_list_clients(self):
        """Test retrieving list of clients"""
        response = self.client.get('/api/v1/clients/')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 2)
    
    def test_create_client(self):
        """Test creating a new client"""
        response = self.client.post('/api/v1/clients/', {
            'name': 'Nouveau Client',
            'client_type': 'individual',
            'phone': '611223344',
            'email': 'nouveau@client.com'
        }, format='json')
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['name'], 'Nouveau Client')


class PointOfSaleAPITests(BaseAPITestCase):
    """Tests for Point of Sale API endpoints"""
    
    def test_list_pos(self):
        """Test retrieving list of points of sale"""
        response = self.client.get('/api/v1/pos/')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 2)
    
    def test_create_pos(self):
        """Test creating a new point of sale"""
        response = self.client.post('/api/v1/pos/', {
            'name': 'Succursale Nord',
            'code': 'SUC-002',
            'city': 'Kindia',
            'is_active': True
        }, format='json')
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['code'], 'SUC-002')


class ProductAPITests(BaseAPITestCase):
    """Tests for Product API endpoints"""
    
    def test_create_product_with_pricing(self):
        """Test creating a product with retail and wholesale pricing"""
        response = self.client.post('/api/v1/products/', {
            'name': 'Coca-Cola 33cl',
            'category': self.category.id,
            'supplier': self.supplier.id,
            'purchase_price': '500',
            'selling_price': '750',
            'units_per_box': 24,
            'wholesale_purchase_price': '11000',
            'wholesale_selling_price': '16000'
        }, format='json')
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['name'], 'Coca-Cola 33cl')
        self.assertEqual(Decimal(response.data['selling_price']), Decimal('750'))
        self.assertEqual(response.data['units_per_box'], 24)
        
        # Verify margin was calculated
        product = Product.objects.get(id=response.data['id'])
        self.assertEqual(product.margin, Decimal('250'))  # 750 - 500
    
    def test_product_sku_auto_generation(self):
        """Test automatic SKU generation"""
        response = self.client.post('/api/v1/products/', {
            'name': 'Sprite 50cl',
            'category': self.category.id,
            'purchase_price': '600',
            'selling_price': '900'
        }, format='json')
        
        self.assertEqual(response.status_code, 201)
        self.assertIsNotNone(response.data['sku'])
        self.assertTrue(response.data['sku'].startswith('BOI'))  # From "Boissons"
    
    def test_list_products_with_stock_info(self):
        """Test retrieving products with stock information"""
        # Create a product with inventory
        product = Product.objects.create(
            name="Test Product",
            sku="TEST-001",
            category=self.category,
            supplier=self.supplier,
            purchase_price=Decimal('1000'),
            selling_price=Decimal('1500')
        )
        Inventory.objects.create(
            product=product,
            point_of_sale=self.pos_main,
            quantity=50
        )
        
        response = self.client.get('/api/v1/products/')
        self.assertEqual(response.status_code, 200)
        
        # Find our product in the results
        product_data = next(p for p in response.data['results'] if p['id'] == product.id)
        self.assertEqual(product_data['current_stock'], 50)
        self.assertIn('stock_status', product_data)


class InventoryAPITests(BaseAPITestCase):
    """Tests for Inventory API endpoints"""
    
    def setUp(self):
        super().setUp()
        self.product = Product.objects.create(
            name="Produit Test",
            sku="PROD-001",
            category=self.category,
            supplier=self.supplier,
            purchase_price=Decimal('800'),
            selling_price=Decimal('1200'),
            units_per_box=12
        )
    
    def test_create_inventory(self):
        """Test creating inventory for a product at a POS"""
        response = self.client.post('/api/v1/inventory/', {
            'product': self.product.id,
            'point_of_sale': self.pos_main.id,
            'quantity': 100,
            'reorder_level': 20
        }, format='json')
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['quantity'], 100)
    
    def test_inventory_stock_status(self):
        """Test inventory stock status calculation"""
        inventory = Inventory.objects.create(
            product=self.product,
            point_of_sale=self.pos_main,
            quantity=15,
            reorder_level=20
        )
        
        self.assertEqual(inventory.get_status(), 'low_stock')
        
        inventory.quantity = 0
        self.assertEqual(inventory.get_status(), 'out_of_stock')
        
        inventory.quantity = 50
        self.assertEqual(inventory.get_status(), 'in_stock')


class StockMovementAPITests(BaseAPITestCase):
    """Tests for Stock Movement API endpoints"""
    
    def setUp(self):
        super().setUp()
        self.product = Product.objects.create(
            name="Produit Mouvement",
            sku="MOV-001",
            category=self.category,
            purchase_price=Decimal('500'),
            selling_price=Decimal('800'),
            units_per_box=24
        )
        # Initialize inventory at warehouse
        self.inventory_warehouse = Inventory.objects.create(
            product=self.product,
            point_of_sale=self.pos_warehouse,
            quantity=0
        )
    
    def test_stock_entry_movement(self):
        """Test creating a stock entry movement"""
        response = self.client.post('/api/v1/movements/', {
            'product': self.product.id,
            'movement_type': 'entry',
            'quantity': 10,  # 10 boxes
            'is_wholesale': True,
            'from_point_of_sale': self.pos_warehouse.id,
            'reference': 'BON-001',
            'notes': 'Réception marchandise'
        }, format='json')
        
        self.assertEqual(response.status_code, 201)
        
        # Verify inventory was updated (10 boxes * 24 units = 240 units)
        self.inventory_warehouse.refresh_from_db()
        self.assertEqual(self.inventory_warehouse.quantity, 240)
    
    def test_stock_transfer_movement(self):
        """Test transferring stock between points of sale"""
        # First, add stock to warehouse
        self.inventory_warehouse.quantity = 240
        self.inventory_warehouse.save()
        
        # Create inventory at main store
        inventory_main = Inventory.objects.create(
            product=self.product,
            point_of_sale=self.pos_main,
            quantity=0
        )
        
        # Transfer 5 boxes from warehouse to main store
        response = self.client.post('/api/v1/movements/', {
            'product': self.product.id,
            'movement_type': 'transfer',
            'quantity': 5,
            'is_wholesale': True,
            'from_point_of_sale': self.pos_warehouse.id,
            'to_point_of_sale': self.pos_main.id,
            'reference': 'TRANS-001',
            'notes': 'Transfert vers magasin'
        }, format='json')
        
        self.assertEqual(response.status_code, 201)
        
        # Verify inventory updates
        self.inventory_warehouse.refresh_from_db()
        inventory_main.refresh_from_db()
        
        self.assertEqual(self.inventory_warehouse.quantity, 120)  # 240 - 120
        self.assertEqual(inventory_main.quantity, 120)  # 0 + 120
    
    def test_stock_exit_movement(self):
        """Test creating a stock exit movement"""
        self.inventory_warehouse.quantity = 100
        self.inventory_warehouse.save()
        
        response = self.client.post('/api/v1/movements/', {
            'product': self.product.id,
            'movement_type': 'exit',
            'quantity': 10,  # 10 units (retail)
            'is_wholesale': False,
            'from_point_of_sale': self.pos_warehouse.id,
            'reference': 'EXIT-001'
        }, format='json')
        
        self.assertEqual(response.status_code, 201)
        
        self.inventory_warehouse.refresh_from_db()
        self.assertEqual(self.inventory_warehouse.quantity, 90)


class InvoiceAPITests(BaseAPITestCase):
    """Tests for Invoice API endpoints"""
    
    def setUp(self):
        super().setUp()
        self.product = Product.objects.create(
            name="Produit Facture",
            sku="FAC-001",
            category=self.category,
            purchase_price=Decimal('1000'),
            selling_price=Decimal('1500'),
            units_per_box=12,
            wholesale_selling_price=Decimal('16000')
        )
        # Add stock
        self.inventory = Inventory.objects.create(
            product=self.product,
            point_of_sale=self.pos_main,
            quantity=200
        )
    
    def test_create_invoice(self):
        """Test creating an invoice"""
        response = self.client.post('/api/v1/invoices/', {
            'invoice_number': 'INV-2023-00001',
            'client': self.client_individual.id,
            'point_of_sale': self.pos_main.id,
            'date_issued': date.today().isoformat(),
            'date_due': (date.today() + timedelta(days=30)).isoformat(),
            'status': 'draft',
            'invoice_type': 'retail',
            'tax_rate': 18,
            'apply_tax': True
        }, format='json')
        
        self.assertEqual(response.status_code, 201)
        self.assertIsNotNone(response.data['invoice_number'])
    
    def test_invoice_total_calculations(self):
        """Test invoice total calculations with tax and discount"""
        # Create invoice
        invoice = Invoice.objects.create(
            client=self.client_individual,
            point_of_sale=self.pos_main,
            date_issued=date.today(),
            date_due=date.today() + timedelta(days=30),
            status='draft',
            tax_rate=Decimal('18'),
            discount_amount=Decimal('1000'),
            apply_tax=True,
            created_by=self.user
        )
        invoice.invoice_number = invoice.generate_invoice_number()
        invoice.save()
        
        # Add items
        InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product,
            quantity=10,
            unit_price=Decimal('1500'),
            is_wholesale=False
        )
        
        # Calculate totals
        invoice.calculate_totals()
        
        # Verify calculations
        self.assertEqual(invoice.subtotal, Decimal('15000'))  # 10 * 1500
        self.assertEqual(invoice.tax_amount, Decimal('2700'))  # 15000 * 0.18
        self.assertEqual(invoice.total_amount, Decimal('16700'))  # 15000 + 2700 - 1000
    
    def test_invoice_stock_deduction(self):
        """Test automatic stock deduction when invoice is paid"""
        # Create invoice
        invoice = Invoice.objects.create(
            client=self.client_individual,
            point_of_sale=self.pos_main,
            date_issued=date.today(),
            date_due=date.today(),
            status='draft',
            created_by=self.user
        )
        invoice.invoice_number = invoice.generate_invoice_number()
        invoice.save()
        
        # Add item
        InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product,
            quantity=20,
            unit_price=self.product.selling_price,
            is_wholesale=False
        )
        
        invoice.calculate_totals()
        
        # Mark as paid and deduct stock
        invoice.status = 'paid'
        invoice.save()
        invoice.deduct_stock()
        
        # Verify stock was deducted
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 180)  # 200 - 20
        self.assertTrue(invoice.stock_deducted)


class ReceiptAPITests(BaseAPITestCase):
    """Tests for Receipt API endpoints"""
    
    def test_create_receipt(self):
        """Test creating a receipt (bon de réception)"""
        response = self.client.post('/api/v1/receipts/', {
            'receipt_number': 'REC-2023-00001',
            'supplier': self.supplier.id,
            'point_of_sale': self.pos_warehouse.id,
            'date_received': date.today().isoformat(),
            'supplier_reference': 'SUPP-REF-001',
            'status': 'received'
        }, format='json')
        
        self.assertEqual(response.status_code, 201)
        self.assertIsNotNone(response.data['receipt_number'])


class PaymentAPITests(BaseAPITestCase):
    """Tests for Payment API endpoints"""
    
    def setUp(self):
        super().setUp()
        # Create an invoice
        self.invoice = Invoice.objects.create(
            client=self.client_individual,
            point_of_sale=self.pos_main,
            date_issued=date.today(),
            date_due=date.today() + timedelta(days=30),
            status='sent',
            subtotal=Decimal('10000'),
            tax_amount=Decimal('1800'),
            total_amount=Decimal('11800'),
            created_by=self.user
        )
        self.invoice.invoice_number = self.invoice.generate_invoice_number()
        self.invoice.save()
    
    def test_create_payment(self):
        """Test creating a payment for an invoice"""
        response = self.client.post('/api/v1/payments/', {
            'invoice': self.invoice.id,
            'amount': '5000',
            'payment_date': date.today().isoformat(),
            'payment_method': 'cash',
            'reference': 'PAY-001'
        }, format='json')
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Decimal(response.data['amount']), Decimal('5000'))
    
    def test_invoice_status_update_on_full_payment(self):
        """Test invoice status updates to 'paid' when fully paid"""
        # Create payment for full amount
        Payment.objects.create(
            invoice=self.invoice,
            amount=self.invoice.total_amount,
            payment_date=date.today(),
            payment_method='cash',
            created_by=self.user
        )
        
        # Update invoice status
        self.invoice.update_status()
        
        self.assertEqual(self.invoice.status, 'paid')
        self.assertEqual(self.invoice.get_remaining_amount(), Decimal('0.00'))


class ExpenseAPITests(BaseAPITestCase):
    """Tests for Expense API endpoints"""
    
    def test_create_expense(self):
        """Test creating an expense"""
        response = self.client.post('/api/v1/expenses/', {
            'category': self.expense_category.id,
            'point_of_sale': self.pos_main.id,
            'amount': '50000',
            'date': date.today().isoformat(),
            'description': 'Loyer du mois de janvier',
            'reference': 'EXP-001'
        }, format='json')
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Decimal(response.data['amount']), Decimal('50000'))


class DashboardAPITests(BaseAPITestCase):
    """Tests for Dashboard API endpoints"""
    
    def test_dashboard_statistics(self):
        """Test retrieving dashboard statistics"""
        # Create an order to have some statistics
        Order.objects.create(
            order_number="CMD-TEST-001",
            client=self.client_individual,
            point_of_sale=self.pos_main,
            total_amount=Decimal('1000.00'),
            status='validated'
        )
        
        response = self.client.get('/api/v1/dashboard/')
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('today_sales', response.data)
        self.assertIn('low_stock_count', response.data)


class IntegrationTests(BaseAPITestCase):
    """Integration tests for complete workflows"""
    
    def test_complete_sales_workflow(self):
        """Test complete sales workflow: product -> inventory -> invoice -> payment"""
        # 1. Create product
        product = Product.objects.create(
            name="Produit Workflow",
            sku="WF-001",
            category=self.category,
            purchase_price=Decimal('2000'),
            selling_price=Decimal('3000')
        )
        
        # 2. Add inventory
        inventory = Inventory.objects.create(
            product=product,
            point_of_sale=self.pos_main,
            quantity=100
        )
        
        # 3. Create invoice with item
        invoice = Invoice.objects.create(
            client=self.client_individual,
            point_of_sale=self.pos_main,
            date_issued=date.today(),
            date_due=date.today() + timedelta(days=30),
            status='sent',
            created_by=self.user
        )
        invoice.invoice_number = invoice.generate_invoice_number()
        invoice.save()
        
        InvoiceItem.objects.create(
            invoice=invoice,
            product=product,
            quantity=5,
            unit_price=product.selling_price,
            is_wholesale=False
        )
        
        invoice.calculate_totals()
        
        # 4. Create payment
        Payment.objects.create(
            invoice=invoice,
            amount=invoice.total_amount,
            payment_date=date.today(),
            payment_method='cash',
            created_by=self.user
        )
        
        # 5. Update invoice status (triggers stock deduction)
        invoice.update_status()
        
        # 6. Verify complete workflow
        self.assertEqual(invoice.status, 'paid')
        self.assertTrue(invoice.stock_deducted)
        
        inventory.refresh_from_db()
        self.assertEqual(inventory.quantity, 95)  # 100 - 5
