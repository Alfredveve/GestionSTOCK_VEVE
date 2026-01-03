
import os
import django
from decimal import Decimal

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from inventory.models import Product, Category, PointOfSale, Client, Invoice, InvoiceItem, MonthlyProfitReport
from inventory.services.finance_service import FinanceService
from django.utils import timezone

def reproduce_and_verify():
    print("Starting verification of profit calculation fixes...")
    
    # 1. Setup data
    ts = timezone.now().strftime("%Y%m%d%H%M%S")
    cat, _ = Category.objects.get_or_create(name="Repro Category")
    pos = PointOfSale.objects.create(name=f"Repro POS {ts}", code=f"RP{ts[-4:]}")
    client = Client.objects.create(name=f"Repro Client {ts}")
    
    # Product setup
    # Unit: Buy 800, Sell 1000 -> Profit 200
    # Wholesale (Box 12): Buy 9000 (750/u), Sell 11000 -> Profit 2000
    sku = f"SKU-VERIF-{ts}"
    product = Product.objects.create(
        sku=sku,
        name="Test Wholesale Product",
        category=cat,
        purchase_price=Decimal('800.00'),
        selling_price=Decimal('1000.00'),
        units_per_box=12,
        wholesale_purchase_price=Decimal('9000.00'),
        wholesale_selling_price=Decimal('11000.00'),
    )
    
    today = timezone.now().date()
    month = today.month
    year = today.year
    
    # 2. TEST CASE 1: Wholesale Sale (Paid)
    print("\n--- Test Case 1: Wholesale Sale (Paid) ---")
    invoice = Invoice.objects.create(
        client=client,
        point_of_sale=pos,
        date_issued=today,
        date_due=today,
        status='paid',
        invoice_type='wholesale',
        invoice_number=f"INV-WH-{ts}"
    )
    
    # Create item (signal should trigger but we assume service calculation is key)
    # Note: InvoiceItem.save() helps calculate margin now
    item = InvoiceItem.objects.create(
        invoice=invoice,
        product=product,
        quantity=1,
        unit_price=Decimal('11000.00'),
        is_wholesale=True
    )
    invoice.calculate_totals() # Updates invoice.total_profit
    
    print(f"Invoice Profit: {invoice.total_profit}")
    if invoice.total_profit == Decimal('2000.00'):
        print("[PASS] Invoice profit calculated correctly (11000 - 9000 = 2000)")
    else:
        print(f"[FAIL] Invoice profit incorrect: {invoice.total_profit}")

    # Generate Report via Service (or signal)
    FinanceService.generate_monthly_report(month, year, pos)
    report = MonthlyProfitReport.objects.get(point_of_sale=pos, month=month, year=year)
    
    print(f"Report Net Interest: {report.net_interest}")
    # Gross Sales: 11000
    # COGS: 9000
    # Gross Profit: 2000
    # Net Interest (no expenses): 2000
    
    if report.total_cost_of_goods == Decimal('9000.00'):
        print("[PASS] COGS Correct for Wholesale (9000)")
    else:
        print(f"[FAIL] COGS Incorrect: {report.total_cost_of_goods} (Expected 9000)")
        
    if report.net_interest == Decimal('2000.00'):
        print("[PASS] Net Interest Correct (2000)")
    else:
        print(f"[FAIL] Net Interest Incorrect: {report.net_interest}")

    # 3. TEST CASE 2: Sent Invoice (unpaid) inclusion
    print("\n--- Test Case 2: Sent Invoice Inclusion ---")
    invoice_sent = Invoice.objects.create(
        client=client,
        point_of_sale=pos,
        date_issued=today,
        date_due=today,
        status='sent', # Should now be included
        invoice_type='retail',
        invoice_number=f"INV-SENT-{ts}"
    )
    
    # 5 units retail: Buy 800, Sell 1000 -> Profit 200 * 5 = 1000
    item_sent = InvoiceItem.objects.create(
        invoice=invoice_sent,
        product=product,
        quantity=5,
        unit_price=Decimal('1000.00'),
        is_wholesale=False
    )
    invoice_sent.calculate_totals()
    
    # Update Report
    FinanceService.generate_monthly_report(month, year, pos)
    report.refresh_from_db()
    
    print(f"Report Net Interest after SENT invoice: {report.net_interest}")
    # Previous Profit: 2000
    # New Profit: 1000
    # Total Expected: 3000
    
    if report.net_interest == Decimal('3000.00'):
        print("[PASS] Sent invoice included in profit report")
    else:
        print(f"[FAIL] Sent invoice NOT included properly. Got {report.net_interest}, expected 3000")

    # 4. TEST CASE 3: Item History Consistency
    print("\n--- Test Case 3: History Audit ---")
    # Verify the item has purchase_price stored
    item.refresh_from_db()
    if item.purchase_price == Decimal('9000.00'):
        print("[PASS] Purchase price stored on InvoiceItem")
    else:
        print(f"[FAIL] Purchase price NOT stored on InvoiceItem: {item.purchase_price}")

    # Change product purchase price
    product.wholesale_purchase_price = Decimal('9500.00')
    product.save()
    
    # Verify invoice item didn't change (audit trail preserved)
    item.refresh_from_db()
    if item.purchase_price == Decimal('9000.00'):
        print("[PASS] History preserved: Item purchase price didn't change after product update")
    else:
        print("[FAIL] History NOT preserved!")

    # 5. TEST CASE 4: Retail Sale Calculation
    print("\n--- Test Case 4: Retail Sale Calculation ---")
    invoice_retail = Invoice.objects.create(
        client=client,
        point_of_sale=pos,
        date_issued=today,
        date_due=today,
        status='paid',
        invoice_type='retail',
        invoice_number=f"INV-RET-{ts}"
    )
    
    # Sell 10 units retail
    # Unit Buy: 800, Unit Sell: 1000 => Margin: 200 per unit
    # Total Margin: 200 * 10 = 2000
    item_retail = InvoiceItem.objects.create(
        invoice=invoice_retail,
        product=product,
        quantity=10,
        unit_price=Decimal('1000.00'),
        is_wholesale=False
    )
    invoice_retail.calculate_totals()
    
    print(f"Retail Invoice Profit: {invoice_retail.total_profit}")
    
    # Verify Item details
    item_retail.refresh_from_db()
    print(f"Retail Item Purchase Price: {item_retail.purchase_price}")
    print(f"Retail Item Margin: {item_retail.margin}")
    
    if item_retail.purchase_price == Decimal('800.00'):
         print("[PASS] Retail Item tracked correct Unit Purchase Price (800)")
    else:
         print(f"[FAIL] Retail Item Purchase Price Error: {item_retail.purchase_price}")
         
    if invoice_retail.total_profit == Decimal('2000.00'):
        print("[PASS] Retail Profit Calculated Correctly (2000)")
    else:
        print(f"[FAIL] Retail Profit Error: {invoice_retail.total_profit}")

if __name__ == "__main__":
    reproduce_and_verify()
