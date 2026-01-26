from django.test import TestCase
from django.contrib.auth.models import User
from decimal import Decimal
from datetime import date, timedelta
from inventory.models import (
    Category, Client, Product, PointOfSale, Inventory,
    StockMovement, Invoice, InvoiceItem, Quote, QuoteItem,
    Payment, Settings
)

class SalesLogicTests(TestCase):
    """
    Tests approfondis pour la logique des ventes : Devis, Factures, et POS.
    Cible : 97%+ de taux de réussite et couverture exhaustive.
    """

    def setUp(self):
        # Création des données de base
        self.user = User.objects.create_user(username='testuser_unique', password='password123')
        
        # Paramètres par défaut
        self.settings = Settings.objects.create(
            company_name="Test Corp",
            currency="GNF"
        )

        self.category = Category.objects.create(name="Electronique Test")
        
        # Use a very specific code to avoid any clashes with existing migration data
        self.pos_main = PointOfSale.objects.create(
            code="POS-TEST-001",
            name="Magasin de Test Unique",
            is_active=True
        )
        
        self.client = Client.objects.create(
            name="Client Test Unique",
            client_type="individual",
            phone="622000001"
        )
        
        self.product = Product.objects.create(
            name="Smartphone Test",
            sku="SKU-TEST-001",
            category=self.category,
            purchase_price=Decimal('1000000'),
            selling_price=Decimal('1500000'),
            units_per_box=10,
            wholesale_purchase_price=Decimal('9000000'),
            wholesale_selling_price=Decimal('12000000')
        )
        
        # Initialisation du stock
        # Point of Sale get_or_create logic in setup often clashes in Django tests with complex migrations
        self.inventory = Inventory.objects.create(
            product=self.product,
            point_of_sale=self.pos_main,
            quantity=100,
            reorder_level=10
        )

    def test_quote_calculation_and_conversion(self):
        """Test exhaustif des Devis et leur conversion en facture"""
        quote = Quote.objects.create(
            quote_number="QT-TEST-UNIQUE-001",
            client=self.client,
            quote_type='retail',
            date_issued=date.today(),
            valid_until=date.today() + timedelta(days=7),
            status='draft',
            tax_rate=Decimal('18'),
            created_by=self.user
        )
        
        QuoteItem.objects.create(
            quote=quote,
            product=self.product,
            quantity=2,
            unit_price=Decimal('1500000'),
            is_wholesale=False,
            discount=Decimal('10') # 10% de remise
        )
        
        quote.calculate_totals()
        
        # Vérification des calculs
        # Subtotal: 2 * 1500000 = 3000000. Moins 10% = 2700000.
        self.assertEqual(quote.subtotal, Decimal('2700000.00'))
        # Tax: 2700000 * 0.18 = 486000.
        self.assertEqual(quote.tax_amount, Decimal('486000.00'))
        # Total: 2700000 + 486000 = 3186000.
        self.assertEqual(quote.total_amount, Decimal('3186000.00'))
        
        # Conversion en facture
        invoice = quote.convert_to_invoice()
        self.assertIsNotNone(invoice)
        self.assertEqual(invoice.client, self.client)
        self.assertEqual(invoice.total_amount, quote.total_amount)
        self.assertEqual(quote.status, 'converted')
        
        # Vérification des items de facture
        invoice_item = invoice.invoiceitem_set.first()
        self.assertEqual(invoice_item.product, self.product)
        self.assertEqual(invoice_item.quantity, 2)
        self.assertEqual(invoice_item.discount, Decimal('10.00'))

    def test_invoice_stock_lifecycle(self):
        """Test du cycle de vie du stock lié aux factures (déduction/restauration)"""
        invoice = Invoice.objects.create(
            invoice_number="INV-TEST-UNIQUE-001",
            client=self.client,
            point_of_sale=self.pos_main,
            date_issued=date.today(),
            date_due=date.today(),
            status='draft',
            created_by=self.user
        )
        
        InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product,
            quantity=5,
            unit_price=Decimal('1500000'),
            is_wholesale=False
        )
        
        invoice.calculate_totals()
        
        # Initial stock check
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 100)
        
        # Deduct stock
        invoice.deduct_stock()
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 95)
        self.assertTrue(invoice.stock_deducted)
        
        # Restore stock (e.g., on cancellation)
        invoice.restore_stock()
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 100)
        self.assertFalse(invoice.stock_deducted)

    def test_wholesale_pricing_and_stock(self):
        """Test de la logique des prix de gros et déduction de stock associée"""
        invoice = Invoice.objects.create(
            invoice_number="INV-WHOLESALE-TEST-001",
            client=self.client,
            point_of_sale=self.pos_main,
            date_issued=date.today(),
            date_due=date.today(),
            invoice_type='wholesale',
            created_by=self.user
        )
        
        # Vente de 1 carton (10 unités)
        item = InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product,
            quantity=1,
            unit_price=Decimal('12000000'), # Prix carton
            is_wholesale=True
        )
        
        # La marge doit être calculée sur le prix de gros
        # Purchase: 9000000, Sale: 12000000 -> Margin: 3000000
        self.assertEqual(item.margin, Decimal('3000000.00'))
        
        invoice.deduct_stock()
        self.inventory.refresh_from_db()
        # 100 - (1 carton * 10 unités) = 90
        self.assertEqual(self.inventory.quantity, 90)

    def test_payment_and_status_auto_update(self):
        """Test de la mise à jour automatique du statut de facture lors des paiements"""
        invoice = Invoice.objects.create(
            invoice_number="INV-PAY-TEST-001",
            client=self.client,
            point_of_sale=self.pos_main,
            date_issued=date.today(),
            date_due=date.today(),
            total_amount=Decimal('5000'),
            status='sent',
            created_by=self.user
        )
        
        from ..models import InvoiceItem
        InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product,
            quantity=1,
            unit_price=Decimal('5000'),
            total=Decimal('5000')
        )
        
        # Payment partiel
        Payment.objects.create(
            invoice=invoice,
            amount=Decimal('2000'),
            payment_date=date.today(),
            created_by=self.user
        )
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.get_remaining_amount(), Decimal('3000.00'))
        self.assertEqual(invoice.status, 'sent')
        
        # Solde restant
        Payment.objects.create(
            invoice=invoice,
            amount=Decimal('3000'),
            payment_date=date.today(),
            created_by=self.user
        )
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.get_remaining_amount(), Decimal('0.00'))
        self.assertEqual(invoice.status, 'paid')
        # Vérifier que le stock a été déduit automatiquement
        self.assertTrue(invoice.stock_deducted)

    def test_stock_validation_rules(self):
        """Test des règles de validation de stock (bloquer les sorties si stock insuffisant)"""
        # Reorder level est 10. Stock actuel est 100.
        # On essaie de sortir 91 unités (Stock restant: 9, en dessous de 10)
        
        movement = StockMovement(
            product=self.product,
            movement_type='exit',
            quantity=91,
            from_point_of_sale=self.pos_main,
            user=self.user
        )
        
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError) as cm:
            movement.clean()
        
        self.assertIn("Opération refusée au POS-TEST-001", str(cm.exception))
        
        # Correction autorisée si précisée dans les notes
        movement.notes = "Correction inventaire"
        try:
            movement.clean()
        except ValidationError:
            self.fail("ValidationError raised for correction movement")

    def test_pos_multiple_items_calculation(self):
        """Simulation d'une vente POS complexe avec plusieurs articles et taxes"""
        invoice = Invoice.objects.create(
            invoice_number="POS-SIM-TEST-001",
            client=self.client,
            point_of_sale=self.pos_main,
            date_issued=date.today(),
            date_due=date.today(),
            tax_rate=Decimal('18'),
            apply_tax=True,
            discount_amount=Decimal('50000'), # Remise globale
            created_by=self.user
        )
        
        # Item 1: Détail
        InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product,
            quantity=1,
            unit_price=Decimal('1500000'),
            is_wholesale=False
        )
        
        # Item 2: Détail avec remise ligne
        InvoiceItem.objects.create(
            invoice=invoice,
            product=self.product,
            quantity=2,
            unit_price=Decimal('1500000'),
            is_wholesale=False,
            discount=Decimal('5') # 5% de remise
        )
        
        invoice.calculate_totals()
        
        # Calculations:
        # Item 1: 1500000
        # Item 2: 2 * 1500000 * 0.95 = 2850000
        # Subtotal = 1500000 + 2850000 = 4350000
        # Tax = 4350000 * 0.18 = 783000
        # Total = 4350000 + 783000 - 50000 = 5083000
        
        self.assertEqual(invoice.subtotal, Decimal('4350000.00'))
        self.assertEqual(invoice.tax_amount, Decimal('783000.00'))
        self.assertEqual(invoice.total_amount, Decimal('5083000.00'))
