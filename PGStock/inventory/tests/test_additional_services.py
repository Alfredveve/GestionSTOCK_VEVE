"""
Comprehensive Unit Tests for ReportService, AnalyticsService, and ExportService

Tests all methods with high coverage.
"""

from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth.models import User

from inventory.models import (
    Product, Client, PointOfSale, Category, Supplier,
    Inventory, Invoice, InvoiceItem, StockMovement,
    MonthlyProfitReport
)
from inventory.services import ReportService, AnalyticsService, ExportService


class ReportServiceTestCase(TestCase):
    """Tests for ReportService"""
    
    def setUp(self):
        """Set up test data"""
        self.service = ReportService()
        self.user = User.objects.create_user(username='test_rep', password='pass')
        
        # Create test data
        self.category = Category.objects.create(name='Test Category Rep')
        self.pos = PointOfSale.objects.create(name='Test POS Rep', code='POSREP001', address='123 St')
        self.client = Client.objects.create(name='Test Client Rep', email='client@test.com')
        
        self.product = Product.objects.create(
            name='Test Product Rep',
            sku='PRODREP001',
            category=self.category,
            purchase_price=Decimal('1000'),
            selling_price=Decimal('1500')
        )
        
        # Create inventory
        Inventory.objects.create(product=self.product, point_of_sale=self.pos, quantity=100)
    
    def test_generate_sales_report(self):
        """Test sales report generation"""
        # Create invoices
        for i in range(3):
            invoice = Invoice.objects.create(
                client=self.client,
                point_of_sale=self.pos,
                created_by=self.user,
                status='paid',
                date_issued=date.today(),
                date_due=date.today(),
                subtotal=Decimal('10000'),
                total_amount=Decimal('11800')
            )
            InvoiceItem.objects.create(
                invoice=invoice,
                product=self.product,
                quantity=10,
                unit_price=Decimal('1000'),
                purchase_price=Decimal('800')
            )
        
        report = self.service.generate_sales_report(
            start_date=date.today() - timedelta(days=7),
            end_date=date.today()
        )
        
        self.assertIn('summary', report)
        self.assertEqual(report['summary']['invoice_count'], 3)
        self.assertGreater(report['summary']['total_sales'], 0)
    
    def test_generate_stock_report(self):
        """Test stock report generation"""
        report = self.service.generate_stock_report()
        
        self.assertIn('summary', report)
        self.assertGreater(report['summary']['total_items'], 0)
        self.assertGreater(report['summary']['total_quantity'], 0)
    
    def test_generate_financial_report(self):
        """Test financial report generation"""
        # Create monthly report
        MonthlyProfitReport.objects.create(
            month=date.today().month,
            year=date.today().year,
            point_of_sale=self.pos,
            total_sales_brut=Decimal('100000'),
            total_cost_of_goods=Decimal('60000'),
            total_expenses=Decimal('10000'),
            gross_profit=Decimal('40000'),
            net_interest=Decimal('30000')
        )
        
        report = self.service.generate_financial_report(
            month=date.today().month,
            year=date.today().year
        )
        
        self.assertIn('summary', report)
        self.assertEqual(report['summary']['total_sales'], Decimal('100000'))
    
    def test_generate_movement_report(self):
        """Test movement report generation"""
        # Create stock movements
        StockMovement.objects.create(
            product=self.product,
            movement_type='entry',
            quantity=50,
            from_point_of_sale=self.pos,
            user=self.user
        )
        
        report = self.service.generate_movement_report(
            start_date=date.today() - timedelta(days=7),
            end_date=date.today()
        )
        
        self.assertIn('summary', report)
        self.assertGreater(report['summary']['total_movements'], 0)


class AnalyticsServiceTestCase(TestCase):
    """Tests for AnalyticsService"""
    
    def setUp(self):
        """Set up test data"""
        self.service = AnalyticsService()
        self.user = User.objects.create_user(username='test_ana', password='pass')
        
        self.category = Category.objects.create(name='Test Category Ana')
        self.pos = PointOfSale.objects.create(name='Test POS Ana', code='POSANA001', address='123 St')
        self.client = Client.objects.create(name='Test Client Ana', email='client@test.com')
        
        self.product = Product.objects.create(
            name='Test Product Ana',
            sku='PRODANA001',
            category=self.category,
            purchase_price=Decimal('1000'),
            selling_price=Decimal('1500')
        )
        
        Inventory.objects.create(product=self.product, point_of_sale=self.pos, quantity=100)
    
    def test_calculate_sales_trends(self):
        """Test sales trends calculation"""
        # Create invoices over several days
        for i in range(5):
            Invoice.objects.create(
                client=self.client,
                point_of_sale=self.pos,
                created_by=self.user,
                status='paid',
                date_issued=date.today() - timedelta(days=i),
                date_due=date.today() - timedelta(days=i),
                total_amount=Decimal('10000')
            )
        
        trends = self.service.calculate_sales_trends(days=7)
        
        self.assertIn('daily_sales', trends)
        self.assertIn('trend', trends)
    
    def test_predict_stock_needs(self):
        """Test stock prediction"""
        # Create exit movements
        for i in range(10):
            StockMovement.objects.create(
                product=self.product,
                movement_type='exit',
                quantity=5,
                from_point_of_sale=self.pos,
                user=self.user
            )
        
        prediction = self.service.predict_stock_needs(
            product=self.product,
            days_ahead=30
        )
        
        self.assertIn('product', prediction)
        self.assertGreater(prediction['avg_daily_sales'], 0)
    
    def test_calculate_kpis(self):
        """Test KPI calculation"""
        # Create test data
        invoice = Invoice.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user,
            status='paid',
            date_issued=date.today(),
            date_due=date.today(),
            total_amount=Decimal('10000'),
            total_profit=Decimal('3000')
        )
        
        kpis = self.service.calculate_kpis(
            start_date=date.today() - timedelta(days=7),
            end_date=date.today()
        )
        
        self.assertIn('sales', kpis)
        self.assertIn('inventory', kpis)
        self.assertGreater(kpis['sales']['total_revenue'], 0)
    
    def test_analyze_product_performance(self):
        """Test product performance analysis"""
        # Create invoice with items
        invoice = Invoice.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user,
            status='paid',
            date_issued=date.today(),
            date_due=date.today()
        )
        
        InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product,
            quantity=10,
            unit_price=Decimal('1500'),
            purchase_price=Decimal('1000')
        )
        
        analysis = self.service.analyze_product_performance(
            start_date=date.today() - timedelta(days=7),
            end_date=date.today()
        )
        
        self.assertIn('top_products', analysis)
    
    def test_get_top_selling_products(self):
        """Test getting top selling products"""
        # Create sales data
        invoice = Invoice.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user,
            status='paid',
            date_issued=date.today(),
            date_due=date.today()
        )
        
        InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product,
            quantity=20,
            unit_price=Decimal('1500'),
            purchase_price=Decimal('1000')
        )
        
        top_products = self.service.get_top_selling_products(days=30, limit=10)
        
        self.assertGreater(len(top_products), 0)
    
    def test_get_customer_insights(self):
        """Test customer insights"""
        # Create invoices
        for i in range(3):
            Invoice.objects.create(
                client=self.client,
                point_of_sale=self.pos,
                created_by=self.user,
                status='paid',
                date_issued=date.today(),
                date_due=date.today(),
                total_amount=Decimal('5000')
            )
        
        insights = self.service.get_customer_insights(days=90)
        
        self.assertIn('total_customers', insights)
        self.assertIn('top_customers', insights)


class ExportServiceTestCase(TestCase):
    """Tests for ExportService"""
    
    def setUp(self):
        """Set up test data"""
        self.service = ExportService()
        self.user = User.objects.create_user(username='test_exp', password='pass')
        
        self.category = Category.objects.create(name='Test Category Exp')
        self.pos = PointOfSale.objects.create(name='Test POS Exp', code='POSEXP001', address='123 St')
        self.client = Client.objects.create(name='Test Client Exp', email='client@test.com')
        
        self.product = Product.objects.create(
            name='Test Product Exp',
            sku='PRODEXP001',
            category=self.category,
            purchase_price=Decimal('1000'),
            selling_price=Decimal('1500')
        )
        
        Inventory.objects.create(product=self.product, point_of_sale=self.pos, quantity=100)
    
    def test_export_products_to_excel(self):
        """Test product export"""
        data = self.service.export_products_to_excel()
        
        self.assertGreater(len(data), 0)
        self.assertIn('SKU', data[0])
        self.assertIn('Nom', data[0])
    
    def test_export_invoices_to_excel(self):
        """Test invoice export"""
        Invoice.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            created_by=self.user,
            status='paid',
            date_issued=date.today(),
            date_due=date.today(),
            total_amount=Decimal('10000')
        )
        
        data = self.service.export_invoices_to_excel()
        
        self.assertGreater(len(data), 0)
        self.assertIn('Numéro', data[0])
    
    def test_export_stock_to_excel(self):
        """Test stock export"""
        data = self.service.export_stock_to_excel()
        
        self.assertGreater(len(data), 0)
        self.assertIn('Produit', data[0])
        self.assertIn('Quantité', data[0])
    
    def test_export_movements_to_excel(self):
        """Test movements export"""
        StockMovement.objects.create(
            product=self.product,
            movement_type='entry',
            quantity=50,
            from_point_of_sale=self.pos,
            user=self.user
        )
        
        data = self.service.export_movements_to_excel()
        
        self.assertGreater(len(data), 0)
        self.assertIn('Type', data[0])
        self.assertIn('Quantité', data[0])
