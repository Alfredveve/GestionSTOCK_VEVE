from django.test import TransactionTestCase
import uuid
from decimal import Decimal
from datetime import date
from django.contrib.auth.models import User
from inventory.models import (
    PointOfSale, Product, Category, Client, Invoice, InvoiceItem, 
    ExpenseCategory, Expense, MonthlyProfitReport
)
from inventory.services.finance_service import FinanceService

class FinanceCalculationTests(TransactionTestCase):
    reset_sequences = True
    def setUp(self):
        import uuid
        self.uid = str(uuid.uuid4())[:8]
        
        # Create a user with unique username
        self.user, _ = User.objects.get_or_create(username=f'user_{self.uid}', defaults={'password': 'password'})
        
        # Create Point of Sale
        self.pos, _ = PointOfSale.objects.get_or_create(
            name=f"Shop {self.uid}",
            defaults={
                'code': f"POS_{self.uid}",
                'manager': self.user
            }
        )
        
        # Create Category
        self.category, _ = Category.objects.get_or_create(name=f"Cat {self.uid}")
        
        # Create Products
        # Product 1: High margin
        self.product1, _ = Product.objects.get_or_create(
            sku=f"PHM_{self.uid}",
            defaults={
                'name': "Product High Margin",
                'category': self.category,
                'purchase_price': Decimal('100.00'),
                'selling_price': Decimal('200.00'), # Margin = 100
                'units_per_box': 1
            }
        )
        
        # Product 2: Low margin
        self.product2, _ = Product.objects.get_or_create(
            sku=f"PLM_{self.uid}",
            defaults={
                'name': "Product Low Margin",
                'category': self.category,
                'purchase_price': Decimal('500.00'),
                'selling_price': Decimal('550.00'), # Margin = 50
                'units_per_box': 1
            }
        )
        
        # Create Client
        self.client, _ = Client.objects.get_or_create(name=f"Client {self.uid}")
        
        # Create Expense Category
        self.expense_category, _ = ExpenseCategory.objects.get_or_create(name=f"ExpCat {self.uid}")

    def test_gross_profit_calculation(self):
        """
        Test that Gross Profit is correctly calculated based on invoices.
        Gross Profit = Sum(Invoice Total Profit)
        where Invoice Total Profit = Sum(Item Margin) - Global Discount
        """
        # Create an invoice
        invoice = Invoice.objects.create(
            invoice_number=f"INV-{str(uuid.uuid4())[:8]}",
            client=self.client,
            point_of_sale=self.pos,
            date_issued=date(2024, 1, 15),
            date_due=date(2024, 1, 15),
            status='paid', # Must be paid or sent to be included in report
            created_by=self.user,
            discount_amount=Decimal('20.00') # Global discount
        )
        
        # Add items
        # Item 1: 2 units of Product 1. Margin = 2 * (200 - 100) = 200
        InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product1,
            quantity=2,
            unit_price=self.product1.selling_price,
            purchase_price=self.product1.purchase_price
        )
        
        # Item 2: 1 unit of Product 2. Margin = 1 * (550 - 500) = 50
        InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product2,
            quantity=1,
            unit_price=self.product2.selling_price,
            purchase_price=self.product2.purchase_price
        )
        
        # Calculate totals
        invoice.calculate_totals()
        
        # Update status to trigger any side effects if needed (though filter uses 'paid' or 'sent')
        invoice.status = 'paid'
        invoice.save()
        
        # Expected Invoice Profit:
        # Item 1 Margin: 200
        # Item 2 Margin: 50
        # Total Item Margin: 250
        # Global Discount: 20
        # Expected Total Profit: 230
        
        self.assertEqual(invoice.total_profit, Decimal('230.00'), "Invoice total profit incorrect")
        
        # Generate Report
        report = FinanceService.generate_monthly_report(1, 2024, self.pos)
        
        self.assertEqual(report.gross_profit, Decimal('230.00'), "Report Gross Profit incorrect")

    def test_net_interest_calculation(self):
        """
        Test that Net Interest is correctly calculated.
        Net Interest = Gross Profit - Total Expenses
        """
        # 1. Setup Gross Profit (Same as above) = 230.00
        invoice = Invoice.objects.create(
            invoice_number=f"INV-N-{str(uuid.uuid4())[:8]}",
            client=self.client,
            point_of_sale=self.pos,
            date_issued=date(2024, 1, 15),
            date_due=date(2024, 1, 15),
            status='paid',
            created_by=self.user,
            discount_amount=Decimal('20.00')
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product1,
            quantity=2,
            unit_price=self.product1.selling_price,
            purchase_price=self.product1.purchase_price
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product2,
            quantity=1,
            unit_price=self.product2.selling_price,
            purchase_price=self.product2.purchase_price
        )
        invoice.calculate_totals()
        
        # 2. Add Expenses
        # Expense 1: 50.00
        Expense.objects.create(
            reference="EXP001",
            category=self.expense_category,
            point_of_sale=self.pos,
            amount=Decimal('50.00'),
            date=date(2024, 1, 10),
            description="Rent",
            created_by=self.user
        )
        
        # Expense 2: 30.00
        Expense.objects.create(
            reference="EXP002",
            category=self.expense_category,
            point_of_sale=self.pos,
            amount=Decimal('30.00'),
            date=date(2024, 1, 20),
            description="Utilities",
            created_by=self.user
        )
        
        # Total Expenses = 80.00
        
        # 3. Generate Report
        report = FinanceService.generate_monthly_report(1, 2024, self.pos)
        
        # Expected:
        # Gross Profit = 230.00
        # Expenses = 80.00
        # Net Interest = 150.00
        
        self.assertEqual(report.total_expenses, Decimal('80.00'), "Total Expenses incorrect")
        self.assertEqual(report.gross_profit, Decimal('230.00'), "Gross Profit incorrect")
        self.assertEqual(report.net_interest, Decimal('150.00'), "Net Interest incorrect")

    def test_report_updates_with_new_data(self):
        """Test that the report updates correctly when new invoices or expenses are added."""
        # Initial State: 1 Invoice (Profit 100), 1 Expense (50)
        # Gross: 100, Net: 50
        
        invoice = Invoice.objects.create(
            invoice_number=f"INV-U1-{str(uuid.uuid4())[:8]}",
            client=self.client,
            point_of_sale=self.pos,
            date_issued=date(2024, 2, 1),
            date_due=date(2024, 2, 1),
            status='paid',
            created_by=self.user
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product1,
            quantity=1,
            unit_price=self.product1.selling_price, # 200
            purchase_price=self.product1.purchase_price # 100
        )
        invoice.calculate_totals() # Profit = 100
        
        Expense.objects.create(
            reference="EXP003",
            category=self.expense_category,
            point_of_sale=self.pos,
            amount=Decimal('50.00'),
            date=date(2024, 2, 5),
            description="Initial Expense",
            created_by=self.user
        )
        
        report = FinanceService.generate_monthly_report(2, 2024, self.pos)
        self.assertEqual(report.gross_profit, Decimal('100.00'))
        self.assertEqual(report.net_interest, Decimal('50.00'))
        
        # Update: Add another expense (20.00)
        Expense.objects.create(
            reference="EXP004",
            category=self.expense_category,
            point_of_sale=self.pos,
            amount=Decimal('20.00'),
            date=date(2024, 2, 10),
            description="Additional Expense",
            created_by=self.user
        )
        
        # Recalculate
        report = FinanceService.generate_monthly_report(2, 2024, self.pos)
        self.assertEqual(report.total_expenses, Decimal('70.00'))
        self.assertEqual(report.net_interest, Decimal('30.00')) # 100 - 70
        
        # Update: Add another invoice (Profit 50)
        invoice2 = Invoice.objects.create(
            invoice_number=f"INV-U2-{str(uuid.uuid4())[:8]}",
            client=self.client,
            point_of_sale=self.pos,
            date_issued=date(2024, 2, 15),
            date_due=date(2024, 2, 15),
            status='paid',
            created_by=self.user
        )
        InvoiceItem.objects.create(
            invoice=invoice2,
            product=self.product2,
            quantity=1,
            unit_price=self.product2.selling_price, # 550
            purchase_price=self.product2.purchase_price # 500
        )
        invoice2.calculate_totals() # Profit = 50
        
        # Recalculate
        report = FinanceService.generate_monthly_report(2, 2024, self.pos)
        self.assertEqual(report.gross_profit, Decimal('150.00')) # 100 + 50
        self.assertEqual(report.net_interest, Decimal('80.00')) # 150 - 70
