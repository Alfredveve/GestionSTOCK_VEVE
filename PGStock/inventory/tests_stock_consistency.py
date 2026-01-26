from django.test import TestCase
from django.contrib.auth.models import User
from decimal import Decimal
from .models import Category, Product, PointOfSale, Inventory, StockMovement

class StockConsistencyTests(TestCase):
    def setUp(self):
        # Create User
        self.user = User.objects.create_user(username='testadmin_cons', password='password')
        
        # Create Basic Setup
        self.category = Category.objects.create(name="Electronics Cons")
        self.product = Product.objects.create(
            name="iPhone 15 Cons",
            sku="IPH-15-CONS",
            category=self.category,
            selling_price=Decimal('1000.00'),
            purchase_price=Decimal('800.00')
        )
        
        # Create Points of Sale
        self.pos_main = PointOfSale.objects.create(name="Store Main Cons", code="CONS_MAIN", manager_name="Manager Main")
        self.pos_warehouse = PointOfSale.objects.create(name="Store WH Cons", code="CONS_WH", manager_name="Manager WH")
        
        # Initialize Inventory
        self.inv_main = Inventory.objects.create(product=self.product, point_of_sale=self.pos_main, quantity=0, reorder_level=0)
        self.inv_wh = Inventory.objects.create(product=self.product, point_of_sale=self.pos_warehouse, quantity=0, reorder_level=0)

    def test_initial_stock_consistency(self):
        """Test that initial total stock is 0 and matches sum of POS"""
        total_stock = self.product.get_total_stock_quantity()
        sum_pos_stock = self.inv_main.quantity + self.inv_wh.quantity
        
        self.assertEqual(total_stock, 0)
        self.assertEqual(total_stock, sum_pos_stock)

    def test_entry_movement_consistency(self):
        """Test that adding stock to one POS increases total correctly"""
        # Add 10 units to Main Store
        StockMovement.objects.create(
            product=self.product,
            movement_type='entry',
            quantity=10,
            from_point_of_sale=self.pos_main,
            user=self.user
        )
        
        # Refresh from DB
        self.inv_main.refresh_from_db()
        self.inv_wh.refresh_from_db()
        
        # Verify POS stocks
        self.assertEqual(self.inv_main.quantity, 10)
        self.assertEqual(self.inv_wh.quantity, 0)
        
        # Verify Total Stock
        total_stock = self.product.get_total_stock_quantity()
        sum_pos_stock = self.inv_main.quantity + self.inv_wh.quantity
        
        self.assertEqual(total_stock, 10)
        self.assertEqual(total_stock, sum_pos_stock)

    def test_transfer_movement_consistency(self):
        """Test that transferring stock keeps total constant but shifts distribution"""
        # Setup: 20 units in Warehouse
        self.inv_wh.quantity = 20
        self.inv_wh.save()
        
        initial_total = self.product.get_total_stock_quantity()
        self.assertEqual(initial_total, 20)
        
        # Transfer 5 units from Warehouse to Main Store
        StockMovement.objects.create(
            product=self.product,
            movement_type='transfer',
            quantity=5,
            from_point_of_sale=self.pos_warehouse,
            to_point_of_sale=self.pos_main,
            user=self.user
        )
        
        # Refresh
        self.inv_main.refresh_from_db()
        self.inv_wh.refresh_from_db()
        
        # Verify POS stocks
        self.assertEqual(self.inv_wh.quantity, 15)  # 20 - 5
        self.assertEqual(self.inv_main.quantity, 5)   # 0 + 5
        
        # Verify Total Stock (Should still be 20)
        new_total = self.product.get_total_stock_quantity()
        sum_pos_stock = self.inv_main.quantity + self.inv_wh.quantity
        
        self.assertEqual(new_total, 20)
        self.assertEqual(new_total, sum_pos_stock)
        self.assertEqual(new_total, initial_total)

    def test_exit_movement_consistency(self):
        """Test that removing stock decreases total correctly"""
        # Setup: 10 units in Main
        self.inv_main.quantity = 10
        self.inv_main.save()
        
        # Sell 3 units
        StockMovement.objects.create(
            product=self.product,
            movement_type='exit',
            quantity=3,
            from_point_of_sale=self.pos_main,
            user=self.user
        )
        
        # Refresh
        self.inv_main.refresh_from_db()
        
        # Verify
        self.assertEqual(self.inv_main.quantity, 7)
        
        total_stock = self.product.get_total_stock_quantity()
        self.assertEqual(total_stock, 7)

    def test_complex_scenario(self):
        """Test a sequence of operations"""
        # 1. Entry 50 to Warehouse
        StockMovement.objects.create(product=self.product, movement_type='entry', quantity=50, from_point_of_sale=self.pos_warehouse, user=self.user)
        
        # 2. Transfer 20 to Main
        StockMovement.objects.create(product=self.product, movement_type='transfer', quantity=20, from_point_of_sale=self.pos_warehouse, to_point_of_sale=self.pos_main, user=self.user)
        
        # 3. Sale (Exit) 5 from Main
        StockMovement.objects.create(product=self.product, movement_type='exit', quantity=5, from_point_of_sale=self.pos_main, user=self.user)
        
        # Refresh
        self.inv_main.refresh_from_db()
        self.inv_wh.refresh_from_db()
        
        # Expected:
        # Warehouse: 50 - 20 = 30
        # Main: 0 + 20 - 5 = 15
        # Total: 45
        
        self.assertEqual(self.inv_wh.quantity, 30)
        self.assertEqual(self.inv_main.quantity, 15)
        self.assertEqual(self.product.get_total_stock_quantity(), 45)
        self.assertEqual(self.product.get_total_stock_quantity(), self.inv_wh.quantity + self.inv_main.quantity)
