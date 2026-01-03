from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from decimal import Decimal


class Category(models.Model):
    """Catégorie de produits"""
    name = models.CharField(max_length=100, unique=True, verbose_name="Nom")
    description = models.TextField(blank=True, verbose_name="Description")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")

    class Meta:
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"
        ordering = ['name']

    def __str__(self):
        return self.name

    def get_product_count(self):
        """Retourne le nombre de produits dans cette catégorie"""
        return self.product_set.count()


class Supplier(models.Model):
    """Fournisseur"""
    name = models.CharField(max_length=200, unique=True, verbose_name="Nom")
    contact_person = models.CharField(max_length=200, blank=True, verbose_name="Personne de contact")
    email = models.EmailField(blank=True, verbose_name="Email")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    address = models.TextField(blank=True, verbose_name="Adresse")
    city = models.CharField(max_length=100, blank=True, verbose_name="Ville")
    country = models.CharField(max_length=100, default="RDC", verbose_name="Pays")
    notes = models.TextField(blank=True, verbose_name="Notes")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")

    class Meta:
        verbose_name = "Fournisseur"
        verbose_name_plural = "Fournisseurs"
        ordering = ['name']

    def __str__(self):
        return self.name

    def get_total_purchases(self):
        """Retourne le montant total des achats"""
        from django.db.models import Sum
        total = self.receipt_set.aggregate(total=Sum('total_amount'))['total']
        return total or Decimal('0.00')


class Client(models.Model):
    """Client"""
    CLIENT_TYPES = [
        ('individual', 'Particulier'),
        ('company', 'Entreprise'),
    ]
    
    name = models.CharField(max_length=200, verbose_name="Nom")
    client_type = models.CharField(max_length=20, choices=CLIENT_TYPES, default='individual', verbose_name="Type")
    contact_person = models.CharField(max_length=200, blank=True, verbose_name="Personne de contact")
    email = models.EmailField(blank=True, verbose_name="Email")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    address = models.TextField(blank=True, verbose_name="Adresse")
    city = models.CharField(max_length=100, blank=True, verbose_name="Ville")
    tax_id = models.CharField(max_length=50, blank=True, verbose_name="Numéro fiscal")
    notes = models.TextField(blank=True, verbose_name="Notes")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")

    class Meta:
        verbose_name = "Client"
        verbose_name_plural = "Clients"
        ordering = ['name']

    def __str__(self):
        return self.name

    def get_total_purchases(self):
        """Retourne le montant total des achats"""
        from django.db.models import Sum
        total = self.invoice_set.filter(status='paid').aggregate(total=Sum('total_amount'))['total']
        return total or Decimal('0.00')


class Product(models.Model):
    """Produit en stock"""
    name = models.CharField(max_length=200, verbose_name="Nom du produit")
    sku = models.CharField(max_length=50, unique=True, verbose_name="Code SKU")
    description = models.TextField(blank=True, verbose_name="Description")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, verbose_name="Catégorie")
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Fournisseur")
    purchase_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0, 
        verbose_name="Prix d'achat"
    )
    margin = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0, 
        verbose_name="Marge bénéficiaire",
        help_text="Marge bénéficiaire en montant (GNF)"
    )
    selling_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Prix de vente (Détail)",
        help_text="Prix de vente unitaire au détail"
    )
    
    # --- Champs pour la vente en gros ---
    units_per_box = models.PositiveIntegerField(
        default=1, 
        verbose_name="Unités par colis/casier/carton",
        help_text="Nombre d'articles dans un colis, casier ou carton"
    )
    wholesale_purchase_price = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0, 
        verbose_name="Prix d'achat (Gros)"
    )
    wholesale_margin = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0, 
        verbose_name="Marge (Gros)"
    )
    wholesale_selling_price = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0, 
        verbose_name="Prix de vente (Gros)"
    )
    # ------------------------------------
    image = models.ImageField(upload_to='products/', blank=True, null=True, verbose_name="Image")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")

    class Meta:
        verbose_name = "Produit"
        verbose_name_plural = "Produits"
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['sku']),
            models.Index(fields=['category', 'name']),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku})"

    def generate_unique_sku(self):
        """Génère un SKU unique basé sur la catégorie"""
        if not self.category:
            return None
            
        # 1. Extraire le préfixe (3 premières lettres de la catégorie, nettoyées)
        import re
        prefix = re.sub(r'[^A-Z]', '', self.category.name.upper())[:3]
        if len(prefix) < 3:
            # Compléter si le nom est trop court ou sans lettres
            prefix = (prefix + "PRD")[:3]
            
        # 2. Trouver le prochain numéro séquentiel
        # On compte les produits existants dans cette catégorie pour avoir une base
        base_count = Product.objects.filter(category=self.category).count()
        sequence = base_count + 1
        
        while True:
            new_sku = f"{prefix}-{sequence:04d}"
            # Vérifier l'unicité
            if not Product.objects.filter(sku=new_sku).exists():
                return new_sku
            sequence += 1

    def save(self, *args, **kwargs):
        # Génération automatique du SKU si vide
        if not self.sku:
            self.sku = self.generate_unique_sku()
            
        # Logique de calcul automatique des prix (Bidirectionnel)
        from decimal import Decimal
        
        # Ensure prices are Decimal
        # DecimalField already stores values as Decimal, but this ensures consistency
        # and handles potential None values by converting them to Decimal('0') for calculations.
        pp = self.purchase_price if self.purchase_price is not None else Decimal('0')
        sp = self.selling_price if self.selling_price is not None else Decimal('0')
        
        if pp > Decimal('0'): # Détail
            if sp > Decimal('0'):
                self.margin = (sp - pp).quantize(Decimal('0.01'))
            elif self.margin:
                self.selling_price = (pp + self.margin).quantize(Decimal('0.01'))

        # Calculs pour le gros
        w_pp = self.wholesale_purchase_price or (pp * self.units_per_box)
        w_sp = self.wholesale_selling_price
        
        if w_pp > Decimal('0'):
            if w_sp > Decimal('0'):
                self.wholesale_margin = (w_sp - w_pp).quantize(Decimal('0.01'))
            elif self.wholesale_margin:
                self.wholesale_selling_price = (w_pp + self.wholesale_margin).quantize(Decimal('0.01'))
            elif not w_sp: # Par défaut, si rien n'est saisi, utiliser PUA gros * (1 + marge detail %)
                # Ou simplement utiliser le prix de detail * unites si pas de config spécifique
                self.wholesale_selling_price = (self.selling_price * self.units_per_box).quantize(Decimal('0.01'))
                self.wholesale_margin = (self.wholesale_selling_price - w_pp).quantize(Decimal('0.01'))
        
        self.wholesale_purchase_price = w_pp
        
        super().save(*args, **kwargs)

    def get_total_stock_quantity(self):
        """Retourne la quantité totale en stock sur tous les points de vente"""
        from django.db.models import Sum
        total = self.inventory_set.aggregate(total=Sum('quantity'))['total']
        return total or 0

    def get_profit(self):
        """Retourne le bénéfice unitaire (Prix de vente - Prix d'achat)"""
        if self.selling_price and self.purchase_price:
            return self.selling_price - self.purchase_price
        return Decimal('0.00')

    def get_inventory(self):
        """
        OBSOLÈTE: Méthode conservée pour compatibilité mais dépréciée.
        Retourne le premier inventaire trouvé ou None.
        Pour le multi-magasin, utilisez inventory_set.all() ou get_total_stock_quantity().
        """
        return self.inventory_set.first()

    def get_stock_status(self):
        """Retourne le statut du stock global"""
        total_quantity = self.get_total_stock_quantity()
        
        # On prend le seuil de réapprovisionnement du premier inventaire trouvé comme référence
        # ou une valeur par défaut si aucun inventaire n'existe
        first_inventory = self.inventory_set.first()
        reorder_level = first_inventory.reorder_level if first_inventory else 10
        
        if total_quantity == 0:
            return 'out_of_stock'
        elif total_quantity <= reorder_level:
            return 'low_stock'
        else:
            return 'in_stock'

    def get_analysis_data(self):
        """Retourne les données d'analyse (Colis, Unités, Analyse) pour le stock global"""
        total_quantity = self.get_total_stock_quantity()
        if self.units_per_box > 1:
            colis = total_quantity // self.units_per_box
            unites = total_quantity % self.units_per_box
            analysis = f"{colis} Colis, {unites} Unité(s)"
        else:
            colis = 0
            unites = total_quantity
            analysis = f"{total_quantity} Unité(s)"
        return {
            'colis': colis,
            'unites': unites,
            'analysis': analysis
        }


class PointOfSale(models.Model):
    """Point de vente / Magasin"""
    name = models.CharField(max_length=200, unique=True, verbose_name="Nom du point de vente")
    code = models.CharField(max_length=20, unique=True, verbose_name="Code")
    address = models.TextField(blank=True, verbose_name="Adresse")
    city = models.CharField(max_length=100, blank=True, verbose_name="Ville")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    manager = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name="Responsable"
    )
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    is_warehouse = models.BooleanField(
        default=False, 
        verbose_name="Est un entrepôt",
        help_text="Cocher si c'est un entrepôt central plutôt qu'un point de vente"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Point de vente"
        verbose_name_plural = "Points de vente"
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    def get_total_inventory_value(self):
        """Calcule la valeur totale du stock dans ce point de vente"""
        from django.db.models import Sum, F
        total = self.inventory_set.aggregate(
            total=Sum(F('quantity') * F('product__selling_price'))
        )['total']
        return total or Decimal('0.00')
    
    def get_product_count(self):
        """Retourne le nombre de produits différents en stock"""
        return self.inventory_set.filter(quantity__gt=0).count()


class Inventory(models.Model):
    """Inventaire des produits par point de vente"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, verbose_name="Produit")
    point_of_sale = models.ForeignKey(
        PointOfSale, 
        on_delete=models.CASCADE, 
        verbose_name="Point de vente"
    )
    quantity = models.IntegerField(default=0, validators=[MinValueValidator(0)], verbose_name="Quantité")
    reorder_level = models.IntegerField(
        default=10, 
        validators=[MinValueValidator(0)],
        verbose_name="Seuil de réapprovisionnement"
    )
    location = models.CharField(max_length=100, blank=True, verbose_name="Emplacement")
    last_updated = models.DateTimeField(auto_now=True, verbose_name="Dernière mise à jour")

    class Meta:
        verbose_name = "Inventaire"
        verbose_name_plural = "Inventaires"
        unique_together = [['product', 'point_of_sale']]  # Un produit unique par POS
        indexes = [
            models.Index(fields=['product', 'point_of_sale']),
            models.Index(fields=['point_of_sale']),
        ]

    def __str__(self):
        return f"{self.product.name} @ {self.point_of_sale.code} - {self.quantity} unités"
    
    @classmethod
    def get_total_stock(cls, product):
        """Retourne le stock total d'un produit sur tous les points de vente"""
        from django.db.models import Sum
        total = cls.objects.filter(product=product).aggregate(total=Sum('quantity'))['total']
        return total or 0

    def get_quantity_display(self):
        """Retourne la quantité formatée en Colis/Unités"""
        if self.product.units_per_box > 1:
            colis = self.quantity // self.product.units_per_box
            unites = self.quantity % self.product.units_per_box
            return f"{colis} Colis, {unites} Unité(s)"
        return f"{self.quantity} Unité(s)"

    def get_status(self):
        """Retourne le statut du stock (in_stock, low_stock, out_of_stock)"""
        if self.quantity == 0:
            return 'out_of_stock'
        elif self.quantity <= self.reorder_level:
            return 'low_stock'
        else:
            return 'in_stock'

    def get_status_display(self):
        """Retourne le libellé du statut"""
        status = self.get_status()
        status_map = {
            'in_stock': 'En stock',
            'low_stock': 'Stock faible',
            'out_of_stock': 'Rupture de stock'
        }
        return status_map.get(status, 'Inconnu')

    def is_low_stock(self):
        """Vérifie si le stock est faible"""
        return self.quantity <= self.reorder_level and self.quantity > 0

    def is_out_of_stock(self):
        """Vérifie si le stock est épuisé"""
        return self.quantity == 0

    def get_analysis_data(self):
        """Retourne les données d'analyse (Colis, Unités, Analyse) pour cet inventaire"""
        if self.product.units_per_box > 1:
            colis = self.quantity // self.product.units_per_box
            unites = self.quantity % self.product.units_per_box
            analysis = f"{colis} Colis, {unites} Unité(s)"
        else:
            colis = 0
            unites = self.quantity
            analysis = f"{self.quantity} Unité(s)"
        return {
            'colis': colis,
            'unites': unites,
            'analysis': analysis
        }



import logging
logger = logging.getLogger(__name__)

class StockMovement(models.Model):

    """Mouvement de stock (Entrée/Sortie/Ajustement/Transfert)"""
    MOVEMENT_TYPES = [
        ('entry', 'Entrée'),
        ('exit', 'Sortie'),
        ('adjustment', 'Ajustement'),
        ('transfer', 'Transfert'),
        ('return', 'Retour'),
        ('defective', 'Défectueux'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, verbose_name="Produit")
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES, verbose_name="Type de mouvement")
    quantity = models.IntegerField(validators=[MinValueValidator(1)], verbose_name="Quantité")
    is_wholesale = models.BooleanField(default=False, verbose_name="En gros lot")
    
    # Point de vente source et destination
    from_point_of_sale = models.ForeignKey(
        PointOfSale,
        on_delete=models.CASCADE,
        related_name='outgoing_movements',
        verbose_name="De (Point de vente)",
        help_text="Point de vente d'origine (pour sorties et transferts)"
    )
    to_point_of_sale = models.ForeignKey(
        PointOfSale,
        on_delete=models.CASCADE,
        related_name='incoming_movements',
        null=True,
        blank=True,
        verbose_name="Vers (Point de vente)",
        help_text="Point de vente de destination (pour transferts uniquement)"
    )
    
    reference = models.CharField(max_length=100, blank=True, verbose_name="Référence")
    notes = models.TextField(blank=True, verbose_name="Notes")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Utilisateur")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date du mouvement")

    class Meta:
        verbose_name = "Mouvement de stock"
        verbose_name_plural = "Mouvements de stock"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', 'from_point_of_sale']),
            models.Index(fields=['movement_type', 'created_at']),
        ]

    def __str__(self):
        if self.movement_type == 'transfer' and self.to_point_of_sale:
            return f"Transfert: {self.product.name} ({self.quantity}) - {self.from_point_of_sale.code} → {self.to_point_of_sale.code}"
        return f"{self.get_movement_type_display()} - {self.product.name} ({self.quantity}) @ {self.from_point_of_sale.code}"
    
    def clean(self):
        """Validation des mouvements de stock multi-points de vente"""
        from django.core.exceptions import ValidationError
        
        # Vérifier que les champs requis sont présents
        # Note: On utilise product_id pour éviter RelatedObjectDoesNotExist si le produit n'est pas encore défini
        if not hasattr(self, 'product_id') or not self.product_id or not self.movement_type or self.quantity is None or not self.from_point_of_sale_id:
            return  # Laisser Django gérer la validation des champs requis
        
        # Pour les transferts, vérifier que to_point_of_sale est défini
        if self.movement_type == 'transfer':
            if not self.to_point_of_sale:
                raise ValidationError("Un point de vente de destination est requis pour les transferts.")
            if self.from_point_of_sale == self.to_point_of_sale:
                raise ValidationError("Impossible de transférer vers le même point de vente.")
        
        # Pour les sorties, vérifier le stock minimum par point de vente
        if self.movement_type in ['exit', 'transfer', 'defective']:
            try:
                inventory = Inventory.objects.get(
                    product=self.product,
                    point_of_sale=self.from_point_of_sale
                )
                
                # Gérer le cas où quantity ou reorder_level pourrait être None
                current_quantity = inventory.quantity if inventory.quantity is not None else 0
                min_quantity = inventory.reorder_level if inventory.reorder_level is not None else 0
                
                stock_after_movement = current_quantity - self.quantity
                
                # [FIX] Autoriser les corrections/annulations même si en dessous du stock minimum
                is_correction = self.notes and ("Correction" in self.notes or "Annulation" in self.notes)
                
                if stock_after_movement < min_quantity and not is_correction:
                    # Formatter les stocks pour l'affichage
                    def format_qty(qty, product):
                        if product.units_per_box > 1:
                            colis = qty // product.units_per_box
                            unites = qty % product.units_per_box
                            return f"{colis} Colis, {unites} Unité(s) ({qty} total)"
                        return f"{qty} Unité(s)"

                    raise ValidationError(
                        f"❌ Opération refusée au {self.from_point_of_sale.code}: "
                        f"Cette sortie ramènerait le stock à {format_qty(stock_after_movement, self.product)}, "
                        f"en dessous du stock minimum requis de {format_qty(min_quantity, self.product)}. "
                        f"Stock actuel : {format_qty(current_quantity, self.product)}. "
                        f"Quantité maximum autorisée à sortir : {format_qty(max(0, current_quantity - min_quantity), self.product)}."
                    )
            except Inventory.DoesNotExist:
                raise ValidationError(
                    f"❌ Impossible de faire une sortie : aucun inventaire existant pour "
                    f"le produit '{self.product.name}' au point de vente '{self.from_point_of_sale.code}'."
                )

    def save(self, *args, **kwargs):
        """Mise à jour automatique de l'inventaire multi-points de vente"""
        # Valider avant de sauvegarder
        if not kwargs.pop('skip_validation', False):
            self.clean()
        
        is_new = self.pk is None
        
        # Empêcher la modification des mouvements existants
        if not is_new:
            # On autorise uniquement la modification de certains champs non critiques si nécessaire (ex: notes)
            # Mais pour la cohérence stricte, on bloque tout pour l'instant.
            # Sauf si on passe un flag spécial (pour les admins/devs si besoin urgent)
            if not kwargs.pop('force_update', False):
                from django.core.exceptions import ValidationError
                raise ValidationError("Les mouvements de stock ne peuvent pas être modifiés une fois créés. Créez un mouvement de correction à la place.")
        
        # Force is_wholesale=True for entries as per user request
        if is_new and self.movement_type == 'entry':
            self.is_wholesale = True

        super().save(*args, **kwargs)
        
        if is_new:
            # Mise à jour de l'inventaire au point de vente source
            inventory_from, created = Inventory.objects.get_or_create(
                product=self.product,
                point_of_sale=self.from_point_of_sale,
                defaults={'quantity': 0}
            )
            
            # Calculer la quantité réelle en unités
            actual_move_qty = self.quantity
            if self.is_wholesale:
                actual_move_qty = self.quantity * self.product.units_per_box
                
            # Logique selon le type de mouvement
            if self.movement_type == 'entry':
                inventory_from.quantity += actual_move_qty
                
            elif self.movement_type in ['exit', 'defective']:
                inventory_from.quantity = max(0, inventory_from.quantity - actual_move_qty)
                
            elif self.movement_type == 'transfer':
                # Diminuer le stock du point de vente source
                inventory_from.quantity = max(0, inventory_from.quantity - actual_move_qty)
                
                # Augmenter le stock du point de vente destination
                if self.to_point_of_sale:
                    inventory_to, created = Inventory.objects.get_or_create(
                        product=self.product,
                        point_of_sale=self.to_point_of_sale,
                        defaults={'quantity': 0}
                    )
                    inventory_to.quantity += actual_move_qty
                    inventory_to.save()
                
            elif self.movement_type == 'return':
                inventory_from.quantity += actual_move_qty
                
            elif self.movement_type == 'adjustment':
                inventory_from.quantity = actual_move_qty
            
            inventory_from.save()
            
            logger.info(
                f"STOCK UPDATE: Product {self.product.name} ({self.product.sku}) "
                f"Action {self.movement_type} Quantity {self.quantity} "
                f"({'Gros' if self.is_wholesale else 'Détail'}) "
                f"at {self.from_point_of_sale.name}. "
                f"New Stock Level: {inventory_from.quantity}"
            )


    def delete(self, *args, **kwargs):
        from django.core.exceptions import ValidationError
        if not kwargs.pop('force_delete', False):
            raise ValidationError("Les mouvements de stock ne peuvent pas être supprimés. Créez un mouvement de correction à la place.")
        super().delete(*args, **kwargs)


class Invoice(models.Model):
    """Facture client"""
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('sent', 'Envoyée'),
        ('paid', 'Payée'),
        ('cancelled', 'Annulée'),
    ]
    
    INVOICE_TYPES = [
        ('retail', 'Vente au détail'),
        ('wholesale', 'Vente en gros'),
    ]

    invoice_number = models.CharField(max_length=50, unique=True, verbose_name="Numéro de facture")
    client = models.ForeignKey(Client, on_delete=models.PROTECT, verbose_name="Client")
    invoice_type = models.CharField(max_length=20, choices=INVOICE_TYPES, default='retail', verbose_name="Type de vente")
    point_of_sale = models.ForeignKey(
        PointOfSale,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        verbose_name="Point de vente",
        help_text="Point de vente d'où provient cette facture"
    )
    date_issued = models.DateField(verbose_name="Date d'émission")
    date_due = models.DateField(verbose_name="Date d'échéance")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name="Statut")
    subtotal = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Sous-total")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=16, verbose_name="Taux TVA (%)")
    tax_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Montant TVA")
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Remise (Montant)")
    total_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Total TTC")
    total_profit = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Bénéfice Total")
    notes = models.TextField(blank=True, verbose_name="Notes")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Créé par")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    stock_deducted = models.BooleanField(default=False, verbose_name="Stock déduit", help_text="Indique si le stock a déjà été déduit pour cette facture")
    apply_tax = models.BooleanField(default=True, verbose_name="Appliquer TVA")

    class Meta:
        verbose_name = "Facture"
        verbose_name_plural = "Factures"
        ordering = ['-date_issued']

    def __str__(self):
        return f"Facture {self.invoice_number} - {self.client.name}"

    def calculate_totals(self):
        """Calcule les totaux de la facture"""
        from decimal import Decimal, ROUND_HALF_UP
        items = self.invoiceitem_set.all()
        # Calculer le sous-total et quantifier à 2 décimales
        self.subtotal = sum(item.get_total() for item in items)
        self.subtotal = Decimal(str(self.subtotal)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # Calculer la TVA et quantifier à 2 décimales si applicable
        if self.apply_tax:
            tax_rate_decimal = Decimal(str(self.tax_rate))
            self.tax_amount = (self.subtotal * (tax_rate_decimal / Decimal('100'))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        else:
            self.tax_amount = Decimal('0.00')
            
        # Calculer le total et quantifier à 2 décimales
        self.total_amount = (self.subtotal + self.tax_amount - self.discount_amount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # Calculer le bénéfice total (Somme des marges des lignes - remise globale)
        self.total_profit = sum(item.margin for item in items) - self.discount_amount
        self.total_profit = Decimal(str(self.total_profit)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # S'assurer que le total n'est pas négatif
        if self.total_amount < Decimal('0.00'):
            self.total_amount = Decimal('0.00')
            
        self.save()

    def generate_invoice_number(self):
        """Génère un numéro de facture unique"""
        from datetime import datetime
        year = datetime.now().year
        last_invoice = Invoice.objects.filter(invoice_number__startswith=f'INV-{year}').order_by('-invoice_number').first()
        if last_invoice:
            last_num = int(last_invoice.invoice_number.split('-')[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        return f'INV-{year}-{new_num:05d}'

    def get_amount_paid(self):
        """Retourne le montant total payé"""
        from django.db.models import Sum
        from decimal import ROUND_HALF_UP
        total = self.payment_set.aggregate(total=Sum('amount'))['total']
        if total:
            # Quantifier à 2 décimales pour éviter les erreurs d'arrondi
            return Decimal(str(total)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return Decimal('0.00')

    def get_remaining_amount(self):
        """Retourne le solde à payer (Decimal)"""
        from decimal import ROUND_HALF_UP
        
        # Si la facture est marquée comme payée, le solde est 0
        if self.status == 'paid':
            return Decimal('0.00')
            
        balance = self.total_amount - self.get_amount_paid()
        # Quantifier à 2 décimales
        balance = Decimal(str(balance)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        # Si le solde est très proche de zéro (erreur d'arrondi), le mettre à zéro
        if abs(balance) < Decimal('0.01'):
            balance = Decimal('0.00')
        return balance

    def get_balance(self):
        """Retourne le solde à payer formaté (String)"""
        balance = self.get_remaining_amount()
        
        # Récupérer la devise depuis les paramètres
        try:
            settings = Settings.objects.first()
            currency = settings.currency if settings else 'GNF'
        except:
            currency = 'GNF'
            
        # Si payé ou solde nul, retourner 0.00 avec devise
        if balance == Decimal('0.00'):
            return f"0.00 {currency}"
            
        return f"{balance} {currency}"

    def is_overdue(self):
        """Vérifie si la facture est en retard"""
        from datetime import date
        return self.status != 'paid' and self.date_due < date.today()

    def update_status(self):
        """Met à jour le statut de la facture en fonction des paiements"""
        balance = self.get_remaining_amount()
        # Utiliser == pour zéro exact grâce à la quantification dans get_balance
        if balance == Decimal('0.00') and self.status != 'paid':
            self.status = 'paid'
            self.save()
            try:
                self.deduct_stock()
            except Exception:
                # Log error silently or handle it, but don't break the payment flow
                pass
        elif Decimal('0.00') < balance < self.total_amount and self.status == 'sent':
            # Optionnel: ajouter un statut 'partial' si désiré, sinon garder 'sent'
            pass
    
    def deduct_stock(self):
        """Déduit le stock pour cette facture (appelé quand la facture est payée/envoyée)"""
        # Éviter de déduire deux fois
        if self.stock_deducted:
            return
        
        # Vérifier qu'on a un point de vente
        if not self.point_of_sale:
            raise ValueError("Impossible de déduire le stock : aucun point de vente associé à cette facture.")
        
        # Créer un mouvement de stock pour chaque item de la facture
        items = self.invoiceitem_set.all()
        for item in items:
            StockMovement.objects.create(
                product=item.product,
                movement_type='exit',
                quantity=item.quantity,
                is_wholesale=item.is_wholesale,
                from_point_of_sale=self.point_of_sale,
                reference=f"Facture {self.invoice_number}",
                notes=f"Sortie automatique ({'Gros' if item.is_wholesale else 'Détail'}) pour facture {self.invoice_number}",
                user=self.created_by
            )
        
        # Marquer comme déduit
        self.stock_deducted = True
        self.save(update_fields=['stock_deducted'])

    def restore_stock(self):
        """Restaure le stock pour cette facture (appelé quand la facture est annulée)"""
        # Si le stock n'a pas été déduit, rien à faire
        if not self.stock_deducted:
            return
        
        # Vérifier qu'on a un point de vente
        if not self.point_of_sale:
            raise ValueError("Impossible de restaurer le stock : aucun point de vente associé à cette facture.")
        
        # Créer un mouvement de retour pour chaque item de la facture
        items = self.invoiceitem_set.all()
        for item in items:
            StockMovement.objects.create(
                product=item.product,
                movement_type='return',
                quantity=item.quantity,
                is_wholesale=item.is_wholesale,
                from_point_of_sale=self.point_of_sale,
                reference=f"Annulation Facture {self.invoice_number}",
                notes=f"Retour automatique ({'Gros' if item.is_wholesale else 'Détail'}) suite à annulation facture {self.invoice_number}",
                user=self.created_by
            )
        
        # Marquer comme non déduit
        self.stock_deducted = False
        self.save(update_fields=['stock_deducted'])


class InvoiceItem(models.Model):
    """Ligne de facture"""
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, verbose_name="Facture")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, verbose_name="Produit")
    quantity = models.IntegerField(validators=[MinValueValidator(1)], verbose_name="Quantité")
    unit_price = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="Prix unitaire")
    is_wholesale = models.BooleanField(default=False, verbose_name="Vendu en gros lot")
    discount = models.DecimalField(max_digits=5, decimal_places=2, default=0, null=True, blank=True, verbose_name="Remise (%)")
    total = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="Total")
    purchase_price = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Prix d'achat unitaire")
    margin = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Marge")

    class Meta:
        verbose_name = "Ligne de facture"
        verbose_name_plural = "Lignes de facture"

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"

    def get_total(self):
        """Calcule le total de la ligne"""
        from decimal import Decimal, ROUND_HALF_UP
        subtotal = self.quantity * self.unit_price
        
        # Gérer le cas où discount est None
        discount_value = self.discount if self.discount is not None else Decimal('0')
        discount_decimal = Decimal(str(discount_value))
        
        discount_amount = subtotal * (discount_decimal / Decimal('100'))
        total = subtotal - discount_amount
        # Quantifier à 2 décimales
        return Decimal(str(total)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def save(self, *args, **kwargs):
        self.total = self.get_total()
        
        # Fixer le prix d'achat au moment de la vente pour l'historique
        if not hasattr(self, 'purchase_price') or not self.purchase_price :
            if self.is_wholesale:
                self.purchase_price = self.product.wholesale_purchase_price
            else:
                self.purchase_price = self.product.purchase_price
        
        # Calculer la marge de cette ligne
        # Marge = Total ligne - (Quantité * Prix d'achat)
        from decimal import Decimal
        cost = Decimal(str(self.quantity)) * Decimal(str(self.purchase_price))
        self.margin = self.total - cost
        
        super().save(*args, **kwargs)


class Receipt(models.Model):
    """Bon de réception fournisseur"""
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('received', 'Reçu'),
        ('validated', 'Validé'),
    ]
    
    receipt_number = models.CharField(max_length=50, unique=True, verbose_name="Numéro de bon")
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, verbose_name="Fournisseur")
    point_of_sale = models.ForeignKey(
        PointOfSale,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        verbose_name="Point de vente",
        help_text="Point de vente où les marchandises sont reçues"
    )
    date_received = models.DateField(verbose_name="Date de réception")
    supplier_reference = models.CharField(max_length=100, blank=True, verbose_name="Référence fournisseur")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name="Statut")
    total_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Montant total")
    notes = models.TextField(blank=True, verbose_name="Notes")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Créé par")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    stock_added = models.BooleanField(default=False, verbose_name="Stock ajouté", help_text="Indique si le stock a déjà été ajouté pour ce bon")
    delivery_costs = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Frais de livraison", help_text="Frais de transport, douane, etc. à repartir sur le coût des produits")

    class Meta:
        verbose_name = "Bon de réception"
        verbose_name_plural = "Bons de réception"
        ordering = ['-date_received']

    def __str__(self):
        return f"Bon {self.receipt_number} - {self.supplier.name}"

    def calculate_total(self):
        """Calcule le total du bon"""
        from decimal import Decimal, ROUND_HALF_UP
        items = self.receiptitem_set.all()
        total = sum(item.get_total() for item in items)
        # Quantifier à 2 décimales
        self.total_amount = Decimal(str(total)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        self.save()

    def generate_receipt_number(self):
        """Génère un numéro de bon unique"""
        from datetime import datetime
        year = datetime.now().year
        last_receipt = Receipt.objects.filter(receipt_number__startswith=f'REC-{year}').order_by('-receipt_number').first()
        if last_receipt:
            last_num = int(last_receipt.receipt_number.split('-')[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        return f'REC-{year}-{new_num:05d}'
    
    def distribute_delivery_costs(self):
        """
        Répartit les frais de livraison sur les articles du bon au prorata de leur valeur.
        Met à jour le coût unitaire (unit_cost) de chaque ligne.
        Cette méthode doit être appelée AVANT l'ajout en stock.
        """
        from decimal import Decimal, ROUND_HALF_UP
        if self.delivery_costs <= 0:
            return

        items = self.receiptitem_set.all()
        # Calculer la valeur totale de la marchandise (hors frais)
        # On s'assure de tout convertir en Decimal pour éviter les erreurs de type
        total_merchandise = sum(Decimal(str(item.quantity)) * Decimal(str(item.unit_cost)) for item in items)
        
        if total_merchandise == Decimal('0'):
            return

        delivery_costs_decimal = Decimal(str(self.delivery_costs))

        # Répartir les frais
        for item in items:
            # Valeur de la ligne
            quantity_decimal = Decimal(str(item.quantity))
            unit_cost_decimal = Decimal(str(item.unit_cost))
            line_value = quantity_decimal * unit_cost_decimal
            
            # Part des frais pour cette ligne = (Valeur Ligne / Total Marchandise) * Frais
            line_share = (line_value / total_merchandise) * delivery_costs_decimal
            
            # Coût supplémentaire par unité
            if item.quantity > 0:
                cost_per_unit_increase = line_share / quantity_decimal
                
                # Mise à jour du coût unitaire
                # On force la conversion en string puis decimal pour éviter tout float résiduel
                raw_new_cost = unit_cost_decimal + cost_per_unit_increase
                item.unit_cost = Decimal(str(raw_new_cost)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                
                item.save()
        
        # Recalculer le total
        self.calculate_total()

    def add_stock(self):
        """Ajoute le stock pour ce bon de réception (appelé quand le bon est reçu/validé)"""
        # Éviter d'ajouter deux fois
        if self.stock_added:
            return
        
        # Vérifier qu'on a un point de vente
        if not self.point_of_sale:
            raise ValueError("Impossible d'ajouter le stock : aucun point de vente associé à ce bon de réception.")
        
        # Appliquer la répartition des frais avant d'ajouter en stock
        # UNIQUEMENT si cela n'a pas déjà été fait (difficile à savoir, donc on le fait ici pour être sûr au moment de la validation)
        # Note: Idéalement on devrait le faire une seule fois.
        self.distribute_delivery_costs()

        # Créer un mouvement de stock pour chaque item du bon
        items = self.receiptitem_set.all()
        for item in items:
            StockMovement.objects.create(
                product=item.product,
                movement_type='entry',
                quantity=item.quantity,
                is_wholesale=item.is_wholesale,
                from_point_of_sale=self.point_of_sale,
                reference=f"Bon {self.receipt_number}",
                notes=f"Entrée automatique ({'Gros' if item.is_wholesale else 'Détail'}) pour bon de réception {self.receipt_number}",
                user=self.created_by
            )
        
        # Marquer comme ajouté
        self.stock_added = True
        self.save(update_fields=['stock_added'])

    def revert_stock(self):
        """Annule l'ajout de stock pour ce bon (appelé quand le bon est annulé/brouillon)"""
        # Si le stock n'a pas été ajouté, rien à faire
        if not self.stock_added:
            return
        
        # Vérifier qu'on a un point de vente
        if not self.point_of_sale:
            raise ValueError("Impossible d'annuler le stock : aucun point de vente associé à ce bon.")
        
        # Créer un mouvement de correction (sortie/ajustement) pour chaque item
        # On utilise 'adjustment' ou 'exit' pour retirer le stock ajouté par erreur
        items = self.receiptitem_set.all()
        for item in items:
            StockMovement.objects.create(
                product=item.product,
                movement_type='exit',
                quantity=item.quantity,
                is_wholesale=item.is_wholesale,
                from_point_of_sale=self.point_of_sale,
                reference=f"Annulation Bon {self.receipt_number}",
                notes=f"Correction automatique ({'Gros' if item.is_wholesale else 'Détail'}) suite à annulation bon {self.receipt_number}",
                user=self.created_by
            )
        
        # Marquer comme non ajouté
        self.stock_added = False
        self.save(update_fields=['stock_added'])


class ReceiptItem(models.Model):
    """Ligne de bon de réception"""
    receipt = models.ForeignKey(Receipt, on_delete=models.CASCADE, verbose_name="Bon de réception")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, verbose_name="Produit")
    quantity = models.IntegerField(validators=[MinValueValidator(1)], verbose_name="Quantité")
    unit_cost = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="Coût unitaire")
    is_wholesale = models.BooleanField(default=True, verbose_name="Reçu en gros lot")
    total = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="Total")

    class Meta:
        verbose_name = "Ligne de bon de réception"
        verbose_name_plural = "Lignes de bon de réception"

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"

    def get_total(self):
        """Calcule le total de la ligne"""
        from decimal import Decimal, ROUND_HALF_UP
        total = self.quantity * self.unit_cost
        # Quantifier à 2 décimales
        return Decimal(str(total)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def save(self, *args, **kwargs):
        self.total = self.get_total()
        super().save(*args, **kwargs)


class Payment(models.Model):
    """Paiement reçu pour une facture"""
    PAYMENT_METHODS = [
        ('cash', 'Espèces'),
        ('bank_transfer', 'Virement bancaire'),
        ('check', 'Chèque'),
        ('mobile_money', 'Mobile Money'),
        ('card', 'Carte bancaire'),
        ('other', 'Autre'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, verbose_name="Facture")
    amount = models.DecimalField(max_digits=20, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], verbose_name="Montant")
    payment_date = models.DateField(verbose_name="Date de paiement")
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='cash', verbose_name="Mode de paiement")
    reference = models.CharField(max_length=100, blank=True, verbose_name="Référence")
    notes = models.TextField(blank=True, verbose_name="Notes")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Enregistré par")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date d'enregistrement")

    class Meta:
        verbose_name = "Paiement"
        verbose_name_plural = "Paiements"
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"Paiement de {self.amount} pour {self.invoice.invoice_number}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Mettre à jour le statut de la facture
        self.invoice.update_status()


class PasswordResetCode(models.Model):
    """Code de réinitialisation de mot de passe"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Utilisateur")
    code = models.CharField(max_length=6, verbose_name="Code de vérification")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    expires_at = models.DateTimeField(verbose_name="Date d'expiration")
    used = models.BooleanField(default=False, verbose_name="Utilisé")

    class Meta:
        verbose_name = "Code de réinitialisation"
        verbose_name_plural = "Codes de réinitialisation"
        ordering = ['-created_at']

    def __str__(self):
        return f"Code pour {self.user.username}"

    def is_valid(self):
        """Vérifie si le code est valide (non expiré et non utilisé)"""
        from django.utils import timezone
        return not self.used and self.expires_at > timezone.now()


class UserProfile(models.Model):
    """Profil utilisateur étendu"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile', verbose_name="Utilisateur")
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, verbose_name="Photo de profil")
    point_of_sale = models.ForeignKey(
        PointOfSale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Point de vente assigné",
        help_text="Point de vente où travaille cet utilisateur"
    )
    
    class Meta:
        verbose_name = "Profil utilisateur"
        verbose_name_plural = "Profils utilisateurs"

    def __str__(self):
        return f"Profil de {self.user.username}"

# Signal pour créer/mettre à jour le profil automatiquement
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()
    else:
        UserProfile.objects.create(user=instance)

class Settings(models.Model):
    """Paramètres globaux de l'application"""
    CURRENCY_CHOICES = [
        ('GNF', 'Franc Guinéen (GNF)'),
    ]
    
    company_name = models.CharField(max_length=200, default="GestionSTOCK", verbose_name="Nom de l'entreprise")
    company_logo = models.ImageField(upload_to='company_logos/', blank=True, null=True, verbose_name="Logo de l'entreprise")
    language = models.CharField(max_length=10, choices=[('fr', 'Français'), ('en', 'English')], default='fr', verbose_name="Langue")
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='GNF', verbose_name="Devise")
    email_notifications = models.BooleanField(default=True, verbose_name="Notifications par email")
    
    class Meta:
        verbose_name = "Paramètres"
        verbose_name_plural = "Paramètres"

    def __str__(self):
        return "Paramètres de l'application"

    def save(self, *args, **kwargs):
        if not self.pk and Settings.objects.exists():
            # If you want to ensure only one instance, you can do it here
            # or just rely on the view to always get the first one.
            return Settings.objects.first()
        return super(Settings, self).save(*args, **kwargs)


class Quote(models.Model):
    """Devis client"""
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('sent', 'Envoyé'),
        ('accepted', 'Accepté'),
        ('rejected', 'Rejeté'),
        ('converted', 'Converti en facture'),
    ]
    
    QUOTE_TYPES = [
        ('retail', 'Vente au détail'),
        ('wholesale', 'Vente en gros'),
    ]
    
    quote_number = models.CharField(max_length=50, unique=True, verbose_name="Numéro de devis")
    client = models.ForeignKey(Client, on_delete=models.PROTECT, verbose_name="Client")
    quote_type = models.CharField(max_length=20, choices=QUOTE_TYPES, default='retail', verbose_name="Type de devis")
    date_issued = models.DateField(verbose_name="Date d'émission")
    valid_until = models.DateField(verbose_name="Date de validité")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name="Statut")
    subtotal = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Sous-total")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=16, verbose_name="Taux TVA (%)")
    tax_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Montant TVA")
    total_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Total TTC")
    notes = models.TextField(blank=True, verbose_name="Notes")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Créé par")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")

    class Meta:
        verbose_name = "Devis"
        verbose_name_plural = "Devis"
        ordering = ['-date_issued']

    def __str__(self):
        return f"Devis {self.quote_number} - {self.client.name}"

    def calculate_totals(self):
        """Calcule les totaux du devis"""
        from decimal import Decimal, ROUND_HALF_UP
        items = self.quoteitem_set.all()
        # Calculer le sous-total et quantifier à 2 décimales
        self.subtotal = sum(item.get_total() for item in items)
        self.subtotal = Decimal(str(self.subtotal)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        # Calculer la TVA et quantifier à 2 décimales
        self.tax_amount = (self.subtotal * (self.tax_rate / 100)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        # Calculer le total et quantifier à 2 décimales
        self.total_amount = (self.subtotal + self.tax_amount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        self.save()

    def generate_quote_number(self):
        """Génère un numéro de devis unique"""
        from datetime import datetime
        year = datetime.now().year
        last_quote = Quote.objects.filter(quote_number__startswith=f'QUO-{year}').order_by('-quote_number').first()
        if last_quote:
            last_num = int(last_quote.quote_number.split('-')[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        return f'QUO-{year}-{new_num:05d}'

    def convert_to_invoice(self):
        """Convertit le devis en facture"""
        if self.status == 'converted':
            return None
        
        # Créer la facture
        invoice = Invoice.objects.create(
            client=self.client,
            invoice_type=self.quote_type,
            date_issued=self.date_issued,
            date_due=self.valid_until,
            status='draft',
            subtotal=self.subtotal,
            tax_rate=self.tax_rate,
            tax_amount=self.tax_amount,
            total_amount=self.total_amount,
            notes=f"Converti du devis {self.quote_number}\n{self.notes}",
            created_by=self.created_by
        )
        
        # Générer le numéro de facture
        invoice.invoice_number = invoice.generate_invoice_number()
        invoice.save()
        
        # Copier les items
        for quote_item in self.quoteitem_set.all():
            InvoiceItem.objects.create(
                invoice=invoice,
                product=quote_item.product,
                quantity=quote_item.quantity,
                unit_price=quote_item.unit_price,
                is_wholesale=quote_item.is_wholesale,
                discount=quote_item.discount,
                total=quote_item.total
            )
        
        # Mettre à jour le statut du devis
        self.status = 'converted'
        self.save()
        
        return invoice


class QuoteItem(models.Model):
    """Ligne de devis"""
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, verbose_name="Devis")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, verbose_name="Produit")
    quantity = models.IntegerField(validators=[MinValueValidator(1)], verbose_name="Quantité")
    unit_price = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="Prix unitaire")
    is_wholesale = models.BooleanField(default=False, verbose_name="Vendu en gros lot")
    discount = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name="Remise (%)")
    total = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="Total")

    class Meta:
        verbose_name = "Ligne de devis"
        verbose_name_plural = "Lignes de devis"

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"

    def get_total(self):
        """Calcule le total de la ligne"""
        from decimal import Decimal, ROUND_HALF_UP
        subtotal = self.quantity * self.unit_price
        discount_amount = subtotal * (self.discount / 100)
        total = subtotal - discount_amount
        # Quantifier à 2 décimales
        return Decimal(str(total)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def save(self, *args, **kwargs):
        self.total = self.get_total()
        super().save(*args, **kwargs)


class ExpenseCategory(models.Model):
    """Catégorie de dépense (Salaires, Loyer, Électricité/eau, Marketing, Transport, etc.)"""
    name = models.CharField(max_length=100, unique=True, verbose_name="Nom de la catégorie")
    description = models.TextField(blank=True, verbose_name="Description")

    class Meta:
        verbose_name = "Catégorie de dépense"
        verbose_name_plural = "Catégories de dépenses"
        ordering = ['name']

    def __str__(self):
        return self.name


class Expense(models.Model):
    """Dépense ou charge supportée par un point de vente"""
    reference = models.CharField(max_length=50, unique=True, verbose_name="Référence")
    category = models.ForeignKey(ExpenseCategory, on_delete=models.PROTECT, verbose_name="Catégorie")
    point_of_sale = models.ForeignKey(PointOfSale, on_delete=models.CASCADE, verbose_name="Point de vente")
    amount = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="Montant")
    date = models.DateField(verbose_name="Date de la dépense")
    description = models.TextField(verbose_name="Description/Notes")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Créé par")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Dépense"
        verbose_name_plural = "Dépenses"
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.reference} - {self.category.name} ({self.amount})"


class MonthlyProfitReport(models.Model):
    """Rapport de profit mensuel par point de vente (Intérêt net)"""
    month = models.IntegerField(verbose_name="Mois (1-12)")
    year = models.IntegerField(verbose_name="Année")
    point_of_sale = models.ForeignKey(PointOfSale, on_delete=models.CASCADE, verbose_name="Point de vente")
    
    # Revenus
    total_sales_brut = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Ventes Brutes (Avant Remises)")
    total_discounts = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Total Remises Accordées")
    
    # Coûts
    total_cost_of_goods = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Coût d'Achat Total (COGS)")
    total_expenses = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Total Charges (Loyer, Salaires, etc.)")
    
    # Intérêts
    gross_profit = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Bénéfice Brut")
    net_interest = models.DecimalField(max_digits=20, decimal_places=2, default=0, verbose_name="Intérêt Net")
    
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Rapport de profit mensuel"
        verbose_name_plural = "Rapports de profit mensuels"
        unique_together = [['month', 'year', 'point_of_sale']]
        ordering = ['-year', '-month', 'point_of_sale']

    def __str__(self):
        return f"Profit {self.month}/{self.year} - {self.point_of_sale.name}"

    def calculate_totals(self):
        """Met à jour les calculs du rapport"""
        # Gross Profit = Total Sales (After Item Discounts) - COGS
        # Net Interest = Gross Profit - Global Discounts - Expenses
        # Note: In our model, InvoiceItem.total already subtracts item-level discounts.
        # But Invoice.discount_amount is global.
        self.gross_profit = self.total_sales_brut - self.total_discounts - self.total_cost_of_goods
        self.net_interest = self.gross_profit - self.total_expenses
        # We don't save here to avoid recursion if called from save


