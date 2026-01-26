from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone

from .models import (
    Category, Supplier, Client, Product, PointOfSale, Inventory,
    Invoice, InvoiceItem, Expense, ExpenseCategory
)
from sales.models import Order, OrderItem

class DashboardNewAPITests(APITestCase):
    """Tests for New Dashboard Features (Finance & Advanced Reporting)"""
    
    def setUp(self):
        # Create user and auth
        self.user = User.objects.create_superuser('testadmin_dashv2', 'admin@testdashv2.com', 'testpass123')
        self.client = APIClient()
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')

        # Setup basic data
        self.pos = PointOfSale.objects.create(name="Main Store Dash V2", code="DASHMATCHV2", manager_name="Test Manager")
        self.client_obj = Client.objects.create(name="Test Client Dash V2")
        self.category = Category.objects.create(name="Test Category Dash V2")
        self.supplier = Supplier.objects.create(name="Test Supplier Dash V2")
        self.expense_category = ExpenseCategory.objects.create(name="Rent Dash V2")

        # Create Product
        self.product = Product.objects.create(
            name="Test Product Dash V2",
            sku="DASH-PROD-V2",
            category=self.category,
            supplier=self.supplier,
            purchase_price=Decimal('1000'),
            selling_price=Decimal('2000')
        )

        # Create Data for Current Month
        today = timezone.now().date()
        
        # 1. Order (Revenue)
        self.order = Order.objects.create(
            order_number="ORD-DASH-V2",
            client=self.client_obj,
            point_of_sale=self.pos,
            total_amount=Decimal('5000'),
            status='validated'
        )
        
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2,
            unit_price=Decimal('2000'),
            total_price=Decimal('4000')
        )
        
        # 2. Expense
        Expense.objects.create(
            category=self.expense_category,
            point_of_sale=self.pos,
            amount=Decimal('1000'),
            date=today,
            description="Test Expense Dash V2"
        )

    def test_dashboard_financial_stats(self):
        """Test retrieval of financial stats (revenue, expenses, net_profit)"""
        response = self.client.get('/api/v1/dashboard/')
        self.assertEqual(response.status_code, 200)
        
        data = response.data
        
        # Check keys exist
        self.assertIn('monthly_revenue', data)
        self.assertIn('monthly_expenses', data)
        self.assertIn('net_profit', data)
        
        # Verify values
        self.assertTrue(Decimal(str(data['monthly_revenue'])) > 0)
        self.assertTrue(Decimal(str(data['monthly_expenses'])) >= 1000)
        
    def test_top_selling_products(self):
        """Test top selling products list"""
        response = self.client.get('/api/v1/dashboard/')
        self.assertEqual(response.status_code, 200)
        
        data = response.data
        self.assertIn('top_selling_products', data)
        top_products = data['top_selling_products']
        
        self.assertTrue(len(top_products) > 0)
        self.assertEqual(top_products[0]['name'], "Test Product Dash V2")
        self.assertEqual(top_products[0]['quantity'], 2)

    def test_remaining_products(self):
        """Test remaining products list"""
        # Create inventory for the product
        Inventory.objects.create(
            product=self.product,
            point_of_sale=self.pos,
            quantity=10,
            reorder_level=5
        )
        
        response = self.client.get('/api/v1/dashboard/')
        self.assertEqual(response.status_code, 200)
        
        data = response.data
        self.assertIn('remaining_products', data)
        remaining = data['remaining_products']
        
        self.assertTrue(remaining['count'] > 0)
        # Find our product in results
        found = False
        for res in remaining['results']:
            if res['product'] == "Test Product Dash V2":
                self.assertEqual(res['quantity'], 10)
                # 10 * 1000 (purchase_price) = 10000
                self.assertEqual(res['amount'], 10000.0)
                found = True
                break
        self.assertTrue(found)
