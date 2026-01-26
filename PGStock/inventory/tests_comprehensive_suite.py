"""
Comprehensive Test Suite for High-Value Business Logic
Covers:
1. Product Lifecycle & Stock consistency (État du stock, Entrée/Sortie)
2. Warehouse/Receipt Flows (Bons de Réception)
3. Audit History & Filtering (Historique)
"""
from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from decimal import Decimal
from datetime import date, timedelta
from .models import (
    Category, Supplier, Product, PointOfSale, Inventory, StockMovement,
    Invoice, InvoiceItem, Receipt, ReceiptItem, Client
)

class ComprehensiveStockTests(TestCase):
    def setUp(self):
        # 1. User & Auth
        self.user = User.objects.create_superuser(username='admin', password='password', email='admin@test.com')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Fix for Postgres sequence issue after manual ID insertion in migrations
        # This is common when migrations insert data with explicit IDs
        from django.db import connection
        if connection.vendor == 'postgresql':
            with connection.cursor() as cursor:
                cursor.execute("SELECT setval(pg_get_serial_sequence('inventory_pointofsale', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM inventory_pointofsale;")
        
        # 2. Base Data
        self.category = Category.objects.create(name="High Tech")
        self.supplier = Supplier.objects.create(name="Global Supplier")
        self.customer = Client.objects.create(name="VIP Customer")
        
        # Use get_or_create to avoid conflicts with default POS created by migrations
        self.pos_shop, _ = PointOfSale.objects.get_or_create(
            name="Shop Central", 
            defaults={'code': "SHOP-01", 'is_warehouse': False}
        )
        self.pos_warehouse, _ = PointOfSale.objects.get_or_create(
            name="Warehouse Main", 
            defaults={'code': "WH-01", 'is_warehouse': True}
        )
        
        # 3. Product Setup
        self.product = Product.objects.create(
            name="Laptop Pro",
            sku="LAP-001",
            category=self.category,
            supplier=self.supplier,
            purchase_price=Decimal('1000.00'),
            selling_price=Decimal('1500.00'),
            units_per_box=1  # Simple unit for clarity first
        )
        
        # Initialize inventory with reorder_level=0 to avoid "Low Stock" blocking validation
        Inventory.objects.create(product=self.product, point_of_sale=self.pos_shop, quantity=0, reorder_level=0)

    def test_product_lifecycle_stock(self):
        """
        Deep Test for 'État du stock' & 'Entrée/Sortie':
        Scenario:
        1. Initial state (0)
        2. Purchase Entry (+10) -> Check Stock
        3. Sale (Invoice) (-2) -> Check Stock (Deduction)
        4. Customer Return (+1) -> Check Stock (Restoration)
        5. Supplier Return (Exit) (-1) -> Check Stock
        6. Inventory Adjustment -> Set to specific value
        """
        # 1. Initial State
        self.assertEqual(Inventory.get_total_stock(self.product), 0)

        # 2. Purchase Entry (e.g., via direct Movement or simplified Receipt flow)
        # Using StockMovement directly to test core logic first
        StockMovement.objects.create(
            product=self.product,
            movement_type='entry',
            quantity=10,
            from_point_of_sale=self.pos_shop,
            user=self.user,
            notes="Initial Purchase"
        )
        self.assertEqual(Inventory.get_total_stock(self.product), 10)
        
        # Verify POS specific stock
        inv_shop = Inventory.objects.get(product=self.product, point_of_sale=self.pos_shop)
        self.assertEqual(inv_shop.quantity, 10)
        self.assertEqual(inv_shop.get_status(), 'in_stock') # With reorder_level=0, 10 is in stock

        # 3. Sale (Invoice workflow)
        invoice = Invoice.objects.create(
            client=self.customer,
            point_of_sale=self.pos_shop,
            date_issued=date.today(),
            date_due=date.today(),
            status='draft',
            created_by=self.user
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product,
            quantity=2,
            unit_price=self.product.selling_price
        )
        # Verify NO deduction yet (draft)
        self.assertEqual(Inventory.get_total_stock(self.product), 10)
        
        # Mark paid -> triggers deduction
        invoice.status = 'paid'
        invoice.save()
        invoice.deduct_stock() 
        
        self.assertEqual(Inventory.get_total_stock(self.product), 8) # 10 - 2
        self.assertTrue(invoice.stock_deducted)

        # 4. Customer Return (Cancel Invoice)
        # Simulating a full cancellation/return
        invoice.status = 'cancelled'
        invoice.save()
        invoice.restore_stock()
        
        self.assertEqual(Inventory.get_total_stock(self.product), 10) # 8 + 2
        self.assertFalse(invoice.stock_deducted)
        
        # 5. Supplier Return (Defective or Return)
        # Using 'exit' to simulate returning items to supplier or discarding
        move = StockMovement.objects.create(
            product=self.product,
            movement_type='exit',
            quantity=1,
            from_point_of_sale=self.pos_shop,
            user=self.user
        )
        
        self.assertEqual(Inventory.get_total_stock(self.product), 9)

        # 6. Adjustment (Correction)
        StockMovement.objects.create(
            product=self.product,
            movement_type='adjustment',
            quantity=50, # Set absolute value
            from_point_of_sale=self.pos_shop,
            user=self.user
        )
        self.assertEqual(Inventory.get_total_stock(self.product), 50)
        self.assertEqual(Inventory.objects.get(product=self.product, point_of_sale=self.pos_shop).quantity, 50)


    def test_receipt_validation_and_stock_effect(self):
        """
        Deep Test for 'Bons de Réception':
        Scenario:
        1. Create Receipt (Draft) -> No Stock Change
        2. Validation (Add Stock) -> Stock Increases
        3. Double Click Protection -> Stock doesn't increase twice
        4. Revert (Cancel) -> Stock Decreases
        """
        # Initial Stock
        initial_stock = Inventory.get_total_stock(self.product)
        self.assertEqual(initial_stock, 0)

        # 1. Create Receipt
        receipt = Receipt.objects.create(
            receipt_number="REC-TEST-001",
            supplier=self.supplier,
            point_of_sale=self.pos_warehouse,
            date_received=date.today(),
            status='draft',
            created_by=self.user
        )
        ReceiptItem.objects.create(
            receipt=receipt,
            product=self.product,
            quantity=20,
            unit_cost=Decimal('900.00'),
            is_wholesale=False
        )
        
        # Verify NO change
        self.assertEqual(Inventory.get_total_stock(self.product), 0)
        self.assertFalse(receipt.stock_added)

        # 2. Validate (Add Stock)
        receipt.add_stock()
        
        self.assertEqual(Inventory.get_total_stock(self.product), 20)
        self.assertTrue(receipt.stock_added)
        
        # Check Warehouse Stock specifically
        wh_inv = Inventory.objects.get(product=self.product, point_of_sale=self.pos_warehouse)
        self.assertEqual(wh_inv.quantity, 20)

        # 3. Double Click Protection
        receipt.add_stock() # Call again
        self.assertEqual(Inventory.get_total_stock(self.product), 20) # Should NOT be 40

        # 4. Revert
        receipt.revert_stock()
        self.assertEqual(Inventory.get_total_stock(self.product), 0)
        self.assertFalse(receipt.stock_added)


    def test_stock_movement_history_api(self):
        """
        Deep Test for 'Historique' (API Filtering & Data Accuracy):
        Scenario:
        1. Create diverse movements (Entry, Exit, Transfer)
        2. Test API filters:
           - By Product
           - By Movement Type
        3. Verify API response structure matches expectations
        """
        # Create Data
        # 1. Entry
        StockMovement.objects.create(
            product=self.product,
            movement_type='entry',
            quantity=100,
            from_point_of_sale=self.pos_warehouse,
            user=self.user
        )
        # 2. Transfer
        StockMovement.objects.create(
            product=self.product,
            movement_type='transfer',
            quantity=20,
            from_point_of_sale=self.pos_warehouse,
            to_point_of_sale=self.pos_shop,
            user=self.user
        )
        # 3. Exit (Sale)
        StockMovement.objects.create(
            product=self.product,
            movement_type='exit',
            quantity=5,
            from_point_of_sale=self.pos_shop,
            user=self.user
        )
        
        # Test 1: Filter by Product
        url = reverse('stockmovement-list') # Assuming router name
        response = self.client.get(url, {'product': self.product.id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 3) # All 3 involve this product

        # Test 2: Filter by Movement Type 'entry'
        response = self.client.get(url, {'movement_type': 'entry'})
        self.assertEqual(response.status_code, 200)
        # Should be 1 entry
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['movement_type'], 'entry')
        self.assertEqual(response.data['results'][0]['quantity'], 100)

        # Test 3: Filter by Movement Type 'transfer'
        response = self.client.get(url, {'movement_type': 'transfer'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['movement_type'], 'transfer')
        
        # Test 4: Ordering (Recent first)
        response = self.client.get(url, {'ordering': '-created_at'})
        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        # The last created was Exit
        self.assertEqual(results[0]['movement_type'], 'exit')
        # The first created was Entry (so last in list)
        self.assertEqual(results[-1]['movement_type'], 'entry')

    def test_wholesale_unit_conversion_in_receipt(self):
        """
        Test specific logic where Receipt Item is 'Wholesale'
        and should convert to 'Units' in Inventory.
        """
        # Update product to have boxes
        self.product.units_per_box = 10
        self.product.save()
        
        receipt = Receipt.objects.create(
            receipt_number="REC-WHOLESALE-01",
            supplier=self.supplier,
            point_of_sale=self.pos_warehouse,
            date_received=date.today(),
            status='draft',
            created_by=self.user
        )
        # 5 Boxes received
        ReceiptItem.objects.create(
            receipt=receipt,
            product=self.product,
            quantity=5, 
            unit_cost=Decimal('500.00'),
            is_wholesale=True # Important
        )
        
        receipt.add_stock()
        
        # Inventory should be 5 * 10 = 50 units
        inv = Inventory.objects.get(product=self.product, point_of_sale=self.pos_warehouse)
        self.assertEqual(inv.quantity, 50)
        
        # Movement log should reflect this?
        # Let's check the created movement
        move = StockMovement.objects.filter(reference=f"Bon {receipt.receipt_number}").first()
        self.assertIsNotNone(move)
        # Logic in api/models: 
        # actual_move_qty = self.quantity * self.product.units_per_box if is_wholesale else self.quantity
        # The StockMovement stores the "quantity" passed to it.
        # In Receipt.add_stock():
        # StockMovement.create(..., quantity=item.quantity, is_wholesale=item.is_wholesale, ...)
        # So Movement says "5" and "is_wholesale=True".
        # Model.save() calculates actual impact on inventory.
        
        self.assertEqual(move.quantity, 5)
        self.assertTrue(move.is_wholesale)
        # Inventory correct check double confirm
        self.assertEqual(inv.quantity, 50) 
