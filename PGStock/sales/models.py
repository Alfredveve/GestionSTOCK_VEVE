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
        ('draft', _('Brouillon')),
        ('sent', _('Envoyée')),
        ('pending', _('En attente')),
        ('validated', _('Validée')),
        ('processing', _('En préparation')),
        ('shipped', _('Expédiée')),
        ('delivered', _('Livrée')),
        ('paid', _('Payée')),
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
    amount_paid = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name=_("Montant payé"))
    payment_method = models.CharField(max_length=50, blank=True, null=True, verbose_name=_("Mode de paiement"))
    
    # Stock management
    stock_deducted = models.BooleanField(default=False, verbose_name=_("Stock déduit"), help_text=_("Indique si le stock a déjà été déduit pour cette commande"))
    
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
        from decimal import ROUND_HALF_UP
        self.subtotal = sum(item.total_price for item in items)
        self.subtotal = self.subtotal.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        # Taxe simple pour l'exemple (18% par défaut, à configurer)
        self.tax_amount = (self.subtotal * Decimal('0.18')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        self.total_amount = (self.subtotal + self.tax_amount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # Mettre à jour le statut du paiement
        if self.amount_paid >= self.total_amount:
            self.payment_status = 'paid'
        elif self.amount_paid > 0:
            self.payment_status = 'partial'
        else:
            self.payment_status = 'unpaid'
            
        self.save()
    
    def deduct_stock(self):
        """Déduit le stock pour cette commande (appelé quand la commande est créée)"""
        print(f"DEBUG: Entering deduct_stock for Order {self.order_number}")
        # Éviter de déduire deux fois
        if self.stock_deducted:
            print(f"DEBUG: Stock already deducted for Order {self.order_number}")
            return
        
        # Vérifier qu'on a un point de vente
        if not self.point_of_sale:
            print(f"DEBUG: No POS for Order {self.order_number}")
            raise ValueError("Impossible de déduire le stock : aucun point de vente associé à cette commande.")
        
        # Import StockMovement here to avoid circular imports
        from inventory.models import StockMovement
        
        # Créer un mouvement de stock pour chaque item de la commande
        items = self.items.all()
        for item in items:
            # Determine if wholesale based on unit price
            is_wholesale = (item.unit_price == item.product.wholesale_selling_price)
            
            StockMovement.objects.create(
                product=item.product,
                movement_type='exit',
                quantity=item.quantity,
                is_wholesale=is_wholesale,
                from_point_of_sale=self.point_of_sale,
                reference=f"Commande {self.order_number}",
                notes=f"Sortie automatique ({'Gros' if is_wholesale else 'Détail'}) pour commande {self.order_number}",
                user=self.created_by
            )
        
        # Marquer comme déduit
        self.stock_deducted = True
        self.save(update_fields=['stock_deducted'])
    
    def restore_stock(self):
        """Restaure le stock pour cette commande (appelé quand la commande est annulée)"""
        # Si le stock n'a pas été déduit, rien à faire
        if not self.stock_deducted:
            return
        
        # Vérifier qu'on a un point de vente
        if not self.point_of_sale:
            raise ValueError("Impossible de restaurer le stock : aucun point de vente associé à cette commande.")
        
        # Import StockMovement here to avoid circular imports
        from inventory.models import StockMovement
        
        # Créer un mouvement de retour pour chaque item de la commande
        items = self.items.all()
        for item in items:
            # Determine if wholesale based on unit price
            is_wholesale = (item.unit_price == item.product.wholesale_selling_price)
            
            StockMovement.objects.create(
                product=item.product,
                movement_type='return',
                quantity=item.quantity,
                is_wholesale=is_wholesale,
                from_point_of_sale=self.point_of_sale,
                reference=f"Annulation Commande {self.order_number}",
                notes=f"Retour automatique suite à l'annulation de la commande {self.order_number}",
                user=self.created_by
            )
        
        # Marquer comme non déduit
        self.stock_deducted = False
        self.save(update_fields=['stock_deducted'])


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
        
        from decimal import ROUND_HALF_UP
        self.total_price = ((price * qty) * (1 - (disc / 100))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        super().save(*args, **kwargs)
        
        # Mettre à jour le total de la commande parente
        self.order.update_totals()
