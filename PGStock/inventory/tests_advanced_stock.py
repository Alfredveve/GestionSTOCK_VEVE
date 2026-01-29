from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date
from .models import (
    Category, Product, PointOfSale, Inventory, StockMovement,
    Invoice, InvoiceItem, Receipt, ReceiptItem, Client, Supplier
)

class StockReversionTests(TestCase):
    """Tests for stock reversion when cancelling invoices/receipts"""
    
    def setUp(self):
        self.user = User.objects.create_user(username='testuser_adv', password='password')
        self.category = Category.objects.create(name="Electronics Adv")
        self.product = Product.objects.create(
            name="Test Product Adv",
            sku="TEST-ADV-001",
            category=self.category,
            selling_price=Decimal('100.00'),
            purchase_price=Decimal('80.00')
        )
        self.pos = PointOfSale.objects.create(name="Test Store Adv", code="TEST_STORE_ADV", manager_name="Test Manager")
        self.client = Client.objects.create(name="Test Client Adv")
        self.supplier = Supplier.objects.create(name="Test Supplier Adv")
        
        # Initialize inventory
        self.inventory = Inventory.objects.create(
            product=self.product,
            point_of_sale=self.pos,
            quantity=50,
            reorder_level=0
        )
    
    def test_invoice_cancellation_restores_stock(self):
        """Test that cancelling an invoice restores the stock"""
        initial_stock = self.inventory.quantity
        
        # Create and validate invoice
        invoice = Invoice.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            date_issued=date(2023, 1, 1),
            date_due=date(2023, 1, 1),
            status='draft',
            created_by=self.user
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product,
            quantity=10,
            unit_price=Decimal('100.00'),
            total=Decimal('1000.00')
        )
        
        # Validate invoice (deduct stock)
        invoice.status = 'paid'
        invoice.deduct_stock()
        invoice.save()
        
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, initial_stock - 10)
        
        # Cancel invoice (restore stock)
        invoice.status = 'cancelled'
        invoice.restore_stock()
        invoice.save()
        
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, initial_stock)
        self.assertFalse(invoice.stock_deducted)
    
    def test_receipt_revert_removes_stock(self):
        """Test that reverting a receipt removes the added stock"""
        initial_stock = self.inventory.quantity
        
        # Create and validate receipt
        receipt = Receipt.objects.create(
            supplier=self.supplier,
            point_of_sale=self.pos,
            date_received=date(2023, 1, 1),
            status='draft',
            created_by=self.user
        )
        ReceiptItem.objects.create(
            receipt=receipt,
            product=self.product,
            quantity=20,
            unit_cost=Decimal('80.00'),
            total=Decimal('1600.00')
        )
        
        # Validate receipt (add stock)
        receipt.status = 'received'
        receipt.add_stock()
        receipt.save()
        
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, initial_stock + 20)
        
        # Revert to draft (remove stock)
        receipt.status = 'draft'
        receipt.revert_stock()
        receipt.save()
        
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, initial_stock)
        self.assertFalse(receipt.stock_added)


class StockMovementImmutabilityTests(TestCase):
    """Tests for StockMovement immutability"""
    
    def setUp(self):
        self.user = User.objects.create_user(username='testuser_imm', password='password')
        self.category = Category.objects.create(name="Electronics Imm")
        self.product = Product.objects.create(
            name="Test Product Imm",
            sku="TEST-IMM-002",
            category=self.category,
            selling_price=Decimal('100.00'),
            purchase_price=Decimal('80.00')
        )
        self.pos = PointOfSale.objects.create(name="Test Store Imm", code="TEST_STORE_IMM", manager_name="Test Manager")
        Inventory.objects.create(
            product=self.product,
            point_of_sale=self.pos,
            quantity=50,
            reorder_level=0
        )
    
    def test_cannot_update_stock_movement(self):
        """Test that updating a StockMovement raises ValidationError"""
        movement = StockMovement.objects.create(
            product=self.product,
            movement_type='entry',
            quantity=10,
            from_point_of_sale=self.pos,
            user=self.user
        )
        
        # Try to update
        movement.quantity = 999
        with self.assertRaises(ValidationError) as context:
            movement.save()
        
        self.assertIn("ne peuvent pas être modifiés", str(context.exception))
    
    def test_cannot_delete_stock_movement(self):
        """Test that deleting a StockMovement raises ValidationError"""
        movement = StockMovement.objects.create(
            product=self.product,
            movement_type='entry',
            quantity=10,
            from_point_of_sale=self.pos,
            user=self.user
        )
        
        with self.assertRaises(ValidationError) as context:
            movement.delete()
        
        self.assertIn("ne peuvent pas être supprimés", str(context.exception))
    
    def test_force_update_allowed(self):
        """Test that force_update flag allows updates (for admin/dev use)"""
        movement = StockMovement.objects.create(
            product=self.product,
            movement_type='entry',
            quantity=10,
            from_point_of_sale=self.pos,
            user=self.user
        )
        
        # Force update should work
        movement.notes = "Updated notes"
        movement.save(force_update=True)
        
        movement.refresh_from_db()
        self.assertEqual(movement.notes, "Updated notes")


class DecimalCalculationTests(TestCase):
    """Tests for Decimal type safety in calculations"""
    
    def setUp(self):
        self.user = User.objects.create_user(username='testuser_dec', password='password')
        self.category = Category.objects.create(name="Electronics Dec")
        self.product = Product.objects.create(
            name="Test Product Dec",
            sku="TEST-DEC-003",
            category=self.category,
            selling_price=Decimal('99.99'),
            purchase_price=Decimal('80.00')
        )
        self.pos = PointOfSale.objects.create(name="Test Store Dec", code="TEST_STORE_DEC", manager_name="Test Manager")
        self.client = Client.objects.create(name="Test Client Dec")
    
    def test_invoice_calculation_with_tax(self):
        """Test that invoice calculations handle Decimal correctly"""
        invoice = Invoice.objects.create(
            client=self.client,
            point_of_sale=self.pos,
            date_issued=date(2023, 1, 1),
            date_due=date(2023, 1, 1),
            status='draft',
            created_by=self.user
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product,
            quantity=3,
            unit_price=Decimal('99.99'),
            discount=Decimal('5.00'),
            total=Decimal('0.00')
        )
        
        # Calculate totals
        invoice.calculate_totals()
        
        # Verify no TypeError and results are Decimal
        self.assertIsInstance(invoice.subtotal, Decimal)
        self.assertIsInstance(invoice.total_amount, Decimal)
        
        # Verify calculation correctness
        # Total = Subtotal - Discount
        # Item Subtotal = 3 * 99.99 = 299.97
        # Item Discount (5%) = 299.97 * 0.05 = 14.9985 -> 15.00
        # Item Total = 299.97 - 15.00 = 284.97
        expected_total = Decimal('284.97')
        self.assertEqual(invoice.subtotal, expected_total)
        self.assertEqual(invoice.total_amount, expected_total)
