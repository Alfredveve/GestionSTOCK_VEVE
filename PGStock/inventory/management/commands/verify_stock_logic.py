from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import transaction
from inventory.models import (
    Category, Product, PointOfSale, Inventory, StockMovement, 
    Invoice, InvoiceItem, Receipt, ReceiptItem, Client, Supplier
)
from decimal import Decimal
import sys

class Command(BaseCommand):
    help = 'Simulates comprehensive stock management scenarios to verify logic consistency'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Starting Stock Logic Verification Simulation...'))
        
        try:
            with transaction.atomic():
                self.setup_data()
                self.run_scenarios()
                # We raise an exception at the end to roll back all changes so we don't pollute the DB
                # Remove this line if you want to keep the data
                raise Exception("Simulation complete. Rolling back changes.")
        except Exception as e:
            if str(e) == "Simulation complete. Rolling back changes.":
                self.stdout.write(self.style.SUCCESS('\nSimulation completed successfully (Changes rolled back).'))
            else:
                self.stdout.write(self.style.ERROR(f'\nSimulation FAILED: {str(e)}'))
                import traceback
                traceback.print_exc()

    def setup_data(self):
        self.stdout.write('\n1. Setting up test data...')
        
        # User
        self.user, _ = User.objects.get_or_create(username='sim_admin', defaults={'email': 'admin@sim.com'})
        
        # POS
        self.warehouse, _ = PointOfSale.objects.get_or_create(name="Sim Warehouse", code="SIM_WH", defaults={'is_warehouse': True})
        self.shop, _ = PointOfSale.objects.get_or_create(name="Sim Shop", code="SIM_SHOP", defaults={'is_warehouse': False})
        
        # Category & Product
        self.cat, _ = Category.objects.get_or_create(name="Sim Electronics")
        self.product, _ = Product.objects.get_or_create(
            sku="SIM-IPHONE",
            defaults={
                'name': "Sim iPhone 15",
                'category': self.cat,
                'unit_price': Decimal('1000.00')
            }
        )
        
        # Client & Supplier
        self.client, _ = Client.objects.get_or_create(name="Sim Client")
        self.supplier, _ = Supplier.objects.get_or_create(name="Sim Supplier")
        
        # Reset Inventory for this product
        Inventory.objects.get_or_create(product=self.product, point_of_sale=self.warehouse, defaults={'quantity': 0})
        Inventory.objects.get_or_create(product=self.product, point_of_sale=self.shop, defaults={'quantity': 0})
        Inventory.objects.filter(product=self.product).update(quantity=0)
        
        self.stdout.write(self.style.SUCCESS('   Data setup complete.'))

    def run_scenarios(self):
        self.verify_stock("Initial State", 0, 0)

        # Scenario 1: Reception (Entry)
        self.stdout.write('\n2. Scenario: Reception (Entry)')
        receipt = Receipt.objects.create(
            supplier=self.supplier,
            point_of_sale=self.warehouse,
            date_received="2023-01-01",
            status='draft',
            created_by=self.user
        )
        ReceiptItem.objects.create(receipt=receipt, product=self.product, quantity=100, unit_cost=Decimal('800.00'), total=Decimal('80000.00'))
        
        # Validate Receipt
        receipt.status = 'received'
        receipt.add_stock()
        receipt.save()
        
        self.verify_stock("After Reception (100 in WH)", 100, 0)

        # Scenario 2: Transfer (WH -> Shop)
        self.stdout.write('\n3. Scenario: Transfer (WH -> Shop)')
        StockMovement.objects.create(
            product=self.product,
            movement_type='transfer',
            quantity=20,
            from_point_of_sale=self.warehouse,
            to_point_of_sale=self.shop,
            user=self.user
        )
        
        self.verify_stock("After Transfer (80 in WH, 20 in Shop)", 80, 20)

        # Scenario 3: Sale (Invoice)
        self.stdout.write('\n4. Scenario: Sale (Invoice)')
        invoice = Invoice.objects.create(
            client=self.client,
            point_of_sale=self.shop,
            date_issued="2023-01-02",
            date_due="2023-01-02",
            status='draft',
            created_by=self.user
        )
        InvoiceItem.objects.create(invoice=invoice, product=self.product, quantity=5, unit_price=Decimal('1000.00'), total=Decimal('5000.00'))
        
        # Validate Invoice (Sent/Paid)
        invoice.status = 'paid'
        invoice.deduct_stock()
        invoice.save()
        
        self.verify_stock("After Sale (80 in WH, 15 in Shop)", 80, 15)

        # Scenario 4: Cancel Invoice (Restocking) - THIS IS WHERE WE EXPECT A BUG
        self.stdout.write('\n5. Scenario: Cancel Invoice (Restocking)')
        self.stdout.write('   Cancelling invoice...')
        
        # Simulate cancellation logic (mimicking the View)
        invoice.status = 'cancelled'
        invoice.restore_stock()
        invoice.save()
        
        # We need to manually check if stock was restored. 
        # Based on my analysis, it WON'T be restored automatically by just saving.
        # But let's see what the current state is.
        
        # Forced check to see if logic exists
        inv_shop = Inventory.objects.get(product=self.product, point_of_sale=self.shop)
        if inv_shop.quantity == 20:
             self.stdout.write(self.style.SUCCESS('   [SUCCESS] Stock restored correctly!'))
        else:
             self.stdout.write(self.style.ERROR(f'   [FAIL] Stock NOT restored! Got {inv_shop.quantity}, expected 20'))

        self.verify_stock("After Cancellation (Should be 80 in WH, 20 in Shop)", 80, 20, expect_failure=False)

        # Scenario 5: Immutability Test
        self.stdout.write('\n6. Scenario: StockMovement Immutability')
        movement = StockMovement.objects.last()
        try:
            movement.delete()
            self.stdout.write(self.style.ERROR('   [FAIL] StockMovement deletion should be blocked!'))
        except Exception as e:
            if "ne peuvent pas être supprimés" in str(e):
                self.stdout.write(self.style.SUCCESS('   [SUCCESS] StockMovement deletion blocked as expected.'))
            else:
                self.stdout.write(self.style.WARNING(f'   [WARNING] Blocked with unexpected error: {e}'))

        try:
            movement.quantity = 999
            movement.save()
            self.stdout.write(self.style.ERROR('   [FAIL] StockMovement update should be blocked!'))
        except Exception as e:
            if "ne peuvent pas être modifiés" in str(e):
                self.stdout.write(self.style.SUCCESS('   [SUCCESS] StockMovement update blocked as expected.'))
            else:
                self.stdout.write(self.style.WARNING(f'   [WARNING] Blocked with unexpected error: {e}'))


    def verify_stock(self, stage_name, expected_wh, expected_shop, expect_failure=False):
        wh_qty = Inventory.objects.get(product=self.product, point_of_sale=self.warehouse).quantity
        shop_qty = Inventory.objects.get(product=self.product, point_of_sale=self.shop).quantity
        total = self.product.get_total_stock_quantity()
        
        msg = f"   [{stage_name}] WH: {wh_qty} (Exp: {expected_wh}), Shop: {shop_qty} (Exp: {expected_shop}), Total: {total}"
        
        if wh_qty == expected_wh and shop_qty == expected_shop:
            self.stdout.write(self.style.SUCCESS(msg + " [OK]"))
        else:
            if expect_failure:
                self.stdout.write(self.style.WARNING(msg + " [EXPECTED FAILURE]"))
            else:
                self.stdout.write(self.style.ERROR(msg + " [FAIL]"))
                raise Exception(f"Stock mismatch at {stage_name}")
