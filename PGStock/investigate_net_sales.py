
import os
import django
from decimal import Decimal

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import Product, Category, PointOfSale, Client, Invoice, InvoiceItem, MonthlyProfitReport
from inventory.services.finance_service import FinanceService
from django.utils import timezone

def investigate_discrepancy():
    print("Starting investigation of Net Sales discrepancy...")
    
    # Setup data
    ts = timezone.now().strftime("%Y%m%d%H%M%S")
    cat, _ = Category.objects.get_or_create(name="Investigate Category")
    pos = PointOfSale.objects.create(name=f"Investigate POS {ts}", code=f"IP{ts[-4:]}")
    client = Client.objects.create(name=f"Investigate Client {ts}")
    
    # Product setup
    # Purchase 175,000, Sell 190,000. Profit 15,000.
    product = Product.objects.create(
        name="Test Article",
        sku=f"SKU-INV-{ts}",
        category=cat,
        purchase_price=Decimal('175000.00'),
        selling_price=Decimal('190000.00'),
        wholesale_purchase_price=Decimal('1750000.00'), # Mock
        wholesale_selling_price=Decimal('1900000.00'), # Mock
    )
    
    today = timezone.now().date()
    month = today.month
    year = today.year
    
    # Create Invoice
    invoice = Invoice.objects.create(
        client=client,
        point_of_sale=pos,
        date_issued=today,
        date_due=today,
        status='paid',
        invoice_type='retail',
        invoice_number=f"INV-TEST-{ts}"
    )
    
    # Create Item
    item = InvoiceItem.objects.create(
        invoice=invoice,
        product=product,
        quantity=1,
        unit_price=Decimal('190000.00'),
        is_wholesale=False,
        discount=Decimal('0.00') # No discount initially
    )
    
    invoice.calculate_totals()
    print(f"Invoice Subtotal: {invoice.subtotal}")
    print(f"Invoice Total Amount: {invoice.total_amount}")
    print(f"Invoice Tax Amount: {invoice.tax_amount}")
    
    # Generate Report
    report = FinanceService.generate_monthly_report(month, year, pos)
    
    print(f"Report Total Sales Brut: {report.total_sales_brut}")
    print(f"Report Total Discounts: {report.total_discounts}")
    print(f"Report Net Sales (Brut - Disc): {report.total_sales_brut - report.total_discounts}")
    
    expected_sales = Decimal('190000.00')
    actual_sales = report.total_sales_brut - report.total_discounts
    
    if actual_sales == expected_sales:
        print(f"[PASS] Net Sales matches expected 190,000.")
    else:
        print(f"[FAIL] Net Sales mismatch! Expected {expected_sales}, Got {actual_sales}")
        print(f"Difference: {actual_sales - expected_sales}")

    # Test with Tax Included logic? No, logic is explicit.
    
    # Test with Item Discount
    print("\n--- Testing with Item Discount ---")
    # Discount 10%
    item.discount = Decimal('10.00')
    item.save()
    invoice.calculate_totals()
    print(f"Invoice Subtotal (with 10% disc): {invoice.subtotal}")
    # Subtotal should be 190,000 * 0.9 = 171,000
    
    report = FinanceService.generate_monthly_report(month, year, pos)
    print(f"Report Total Sales Brut: {report.total_sales_brut}")
    print(f"Report Total Discounts: {report.total_discounts}")
    print(f"Report Net Sales: {report.total_sales_brut - report.total_discounts}")
    
    # Logic in Service:
    # SalesBrut += inv.subtotal (171,000)
    # Discounts += item_discount_value (19,000)
    # Net Sales = 171,000 - 19,000 = 152,000.
    # But actual Revenue is 171,000.
    # Double counting discount!
    
    expected_rev = Decimal('171000.00')
    actual_rev = report.total_sales_brut - report.total_discounts
    print(f"Expected Revenue: {expected_rev}")
    print(f"Actual Net Sales: {actual_rev}")
    
    if actual_rev == expected_rev:
         print("[PASS] Discount handling is correct.")
    else:
         print("[FAIL] Discount handling is INCORRECT (Double Counting suspected).")


if __name__ == "__main__":
    investigate_discrepancy()
