"""
Modèles pour l'application Sales (Ventes)

Les modèles Order et OrderItem sont spécifiques à cette application.
Les modèles Client, Product et PointOfSale sont importés depuis inventory.
"""

from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _
from decimal import Decimal

# Import des modèles depuis inventory (source unique de vérité)
from inventory.models import Client, Product, PointOfSale

class Order(models.Model):
    """
    Commande Client (Vente)
    Gère à la fois le Vente au Détail (Retail) et la Vente en Gros (Wholesale)
    """
    
    ORDER_TYPES = [
        ('retail', _('Vente au Détail')),
        ('wholesale', _('Vente en Gros')),
    ]
    
    STATUS_CHOICES = [
        ('pending', _('En attente')),
        ('validated', _('Validée')),
        ('processing', _('En préparation')),
        ('shipped', _('Expédiée')),
        ('delivered', _('Livrée')),
        ('cancelled', _('Annulée')),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('unpaid', _('Non payée')),
        ('partial', _('Partiellement payée')),
        ('paid', _('Payée')),
    ]

    # Identifiants
    order_number = models.CharField(max_length=50, unique=True, verbose_name=_("Numéro de commande"))
    
    # Relations
    client = models.ForeignKey(Client, on_delete=models.PROTECT, verbose_name=_("Client"))
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name=_("Créé par"))
    point_of_sale = models.ForeignKey(
        PointOfSale, 
        on_delete=models.PROTECT, 
        null=True, 
        blank=True,
        verbose_name=_("Point de vente")
    )

    # Caractéristiques de la commande
    order_type = models.CharField(
        max_length=20, 
        choices=ORDER_TYPES, 
        default='retail',
        verbose_name=_("Type de commande")
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending',
        verbose_name=_("Statut de la commande")
    )
    payment_status = models.CharField(
        max_length=20, 
        choices=PAYMENT_STATUS_CHOICES, 
        default='unpaid',
        verbose_name=_("Statut du paiement")
    )
    
    # Dates
    date_created = models.DateTimeField(auto_now_add=True, verbose_name=_("Date de création"))
    date_updated = models.DateTimeField(auto_now=True, verbose_name=_("Dernière mise à jour"))
    date_delivery_expected = models.DateField(null=True, blank=True, verbose_name=_("Date de livraison prévue"))
    
    # Montants
    subtotal = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_("Sous-total"))
    tax_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_("Montant TVA"))
    total_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_("Total TTC"))
    
    # Autres
    notes = models.TextField(blank=True, verbose_name=_("Notes"))

    class Meta:
        verbose_name = _("Commande")
        verbose_name_plural = _("Commandes")
        ordering = ['-date_created']
        indexes = [
            models.Index(fields=['order_number']),
            models.Index(fields=['status']),
            models.Index(fields=['client']),
            models.Index(fields=['order_type']),
        ]

    def __str__(self):
        return f"{self.order_number} - {self.client.name}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self.generate_order_number()
        super().save(*args, **kwargs)

    def generate_order_number(self):
        from datetime import datetime
        prefix = "CMD" if self.order_type == 'retail' else "GROS"
        year = datetime.now().year
        # Logique simplifiée pour l'exemple, à robustifier en prod avec séquences
        count = Order.objects.filter(date_created__year=year).count() + 1
        return f"{prefix}-{year}-{count:06d}"

    def update_totals(self):
        """Recalcule les totaux en fonction des lignes"""
        items = self.items.all()
        self.subtotal = sum(item.total_price for item in items)
        # Taxe simple pour l'exemple (18% par défaut, à configurer)
        # Idéalement la taxe est calculée par ligne ou via un système de taxes
        self.tax_amount = self.subtotal * Decimal('0.18') 
        self.total_amount = self.subtotal + self.tax_amount
        self.save()


class OrderItem(models.Model):
    """
    Ligne de commande (Détail)
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items', verbose_name=_("Commande"))
    product = models.ForeignKey(Product, on_delete=models.PROTECT, verbose_name=_("Produit"))
    
    quantity = models.PositiveIntegerField(default=1, verbose_name=_("Quantité"))
    unit_price = models.DecimalField(max_digits=20, decimal_places=2, verbose_name=_("Prix unitaire"))
    discount = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name=_("Remise (%)"))
    
    total_price = models.DecimalField(max_digits=20, decimal_places=2, verbose_name=_("Total Ligne"))

    class Meta:
        verbose_name = _("Ligne de commande")
        verbose_name_plural = _("Lignes de commande")

    def __str__(self):
        return f"{self.order.order_number} - {self.product.name}"

    def save(self, *args, **kwargs):
        # Calcul automatique du total ligne
        price = Decimal(self.unit_price)
        qty = Decimal(self.quantity)
        disc = Decimal(self.discount)
        
        self.total_price = (price * qty) * (1 - (disc / 100))
        super().save(*args, **kwargs)
        
        # Mettre à jour le total de la commande parente
        self.order.update_totals()
