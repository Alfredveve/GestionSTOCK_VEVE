from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from decimal import Decimal
from datetime import date, timedelta
from inventory.models import Category, Client, Product, Quote, QuoteItem

class QuoteAPITests(APITestCase):
    """Tests pour l'API des Devis (REST Framework)"""

    def setUp(self):
        # Création de l'utilisateur
        self.user = User.objects.create_user(username='testadmin', password='password123', is_staff=True)
        self.client.force_authenticate(user=self.user)
        
        # Données de base
        self.category = Category.objects.create(name="Test Category")
        self.client_obj = Client.objects.create(name="Test Client", phone="123456")
        
        # Produit avec prix fixe pour faciliter les calculs
        self.product = Product.objects.create(
            name="Test Product",
            sku="SKU-T01",
            category=self.category,
            purchase_price=Decimal('500.00'),
            selling_price=Decimal('1000.00'),
            wholesale_selling_price=Decimal('800.00'),
            units_per_box=10
        )
        
        self.list_url = reverse('quote-list')

    def test_create_quote_with_items_success(self):
        """Vérifie la création d'un devis avec des articles via l'API"""
        data = {
            "client": self.client_obj.id,
            "quote_type": "retail",
            "date_issued": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=15)),
            "status": "draft",
            "tax_rate": 18.0,
            "items": [
                {
                    "product": self.product.id,
                    "quantity": 2,
                    "unit_price": 1000.0,
                    "discount": 0
                }
            ]
        }
        
        response = self.client.post(self.list_url, data, format='json')
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Quote.objects.count(), 1)
        self.assertEqual(QuoteItem.objects.count(), 1)
        
        quote = Quote.objects.first()
        self.assertEqual(quote.subtotal, Decimal('2000.00'))
        # Total = 2000 + (2000 * 0.18) = 2360
        self.assertEqual(quote.total_amount, Decimal('2360.00'))
        self.assertEqual(response.data['total_amount'], '2360.00')

    def test_update_quote_items(self):
        """Vérifie la mise à jour des articles d'un devis (remplacement)"""
        # 1. Créer un devis initial
        quote = Quote.objects.create(
            client=self.client_obj,
            quote_number="QUO-001",
            date_issued=date.today(),
            valid_until=date.today() + timedelta(days=7),
            created_by=self.user
        )
        QuoteItem.objects.create(quote=quote, product=self.product, quantity=1, unit_price=1000)
        quote.calculate_totals()
        
        url = reverse('quote-detail', args=[quote.id])
        
        # 2. Mettre à jour avec de nouveaux items
        data = {
            "client": self.client_obj.id,
            "items": [
                {
                    "product": self.product.id,
                    "quantity": 5,
                    "unit_price": 1000.0
                }
            ]
        }
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(quote.quoteitem_set.count(), 1)
        
        item = quote.quoteitem_set.first()
        self.assertEqual(item.quantity, 5)
        
        quote.refresh_from_db()
        self.assertEqual(quote.subtotal, Decimal('5000.00'))

    def test_wholesale_quote_pricing(self):
        """Vérifie le support des devis en gros"""
        data = {
            "client": self.client_obj.id,
            "quote_type": "wholesale",
            "date_issued": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=15)),
            "items": [
                {
                    "product": self.product.id,
                    "quantity": 1,
                    "unit_price": 800.0, # Prix de gros
                    "is_wholesale": True
                }
            ]
        }
        
        response = self.client.post(self.list_url, data, format='json')
        
        self.assertEqual(response.status_code, 201)
        item = QuoteItem.objects.first()
        self.assertTrue(item.is_wholesale)
        self.assertEqual(item.unit_price, Decimal('800.00'))

    def test_read_only_fields_integrity(self):
        """Vérifie que les champs calculés ne peuvent pas être forcés par l'API"""
        data = {
            "client": self.client_obj.id,
            "total_amount": 999999.0, # Tentative de forcer un total faux
            "items": [
                {
                    "product": self.product.id,
                    "quantity": 1,
                    "unit_price": 1000.0,
                    "total": 0.0 # Tentative de forcer un total d'item faux
                }
            ]
        }
        
        response = self.client.post(self.list_url, data, format='json')
        
        self.assertEqual(response.status_code, 201)
        quote = Quote.objects.first()
        # Le système a dû recalculer : 1000 + 16% tax (default model) = 1160
        self.assertEqual(quote.total_amount, Decimal('1160.00'))
        self.assertNotEqual(quote.total_amount, Decimal('999999.00'))
