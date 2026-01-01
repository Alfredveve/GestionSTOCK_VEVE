from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.models import User, Group
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.forms import inlineformset_factory
import socket

from .models import (
    Category, Supplier, Client, Product, Inventory, PointOfSale,
    StockMovement, Invoice, InvoiceItem, Receipt, ReceiptItem,
    Quote, QuoteItem, Settings, UserProfile, PasswordResetCode
)

# Bootstrap classes
INPUT_CLASSES = 'form-control'
CHECKBOX_CLASSES = 'form-check-input'

# ==================== AUTHENTICATION FORMS ====================

class CustomUserCreationForm(UserCreationForm):
    """Formulaire de création d'utilisateur personnalisé"""
    email = forms.EmailField(required=True, widget=forms.EmailInput(attrs={'class': INPUT_CLASSES}))
    first_name = forms.CharField(required=True, widget=forms.TextInput(attrs={'class': INPUT_CLASSES}))
    last_name = forms.CharField(required=True, widget=forms.TextInput(attrs={'class': INPUT_CLASSES}))
    
    # Honeypot field to catch bots
    honeypot = forms.CharField(required=False, widget=forms.HiddenInput, label="Leave empty")

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'password1', 'password2')
        widgets = {
            'username': forms.TextInput(attrs={'class': INPUT_CLASSES}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].widget.attrs.update({'class': INPUT_CLASSES})
        self.fields['password2'].widget.attrs.update({'class': INPUT_CLASSES})

    def clean_honeypot(self):
        honeypot = self.cleaned_data.get('honeypot')
        if honeypot:
            raise ValidationError("Bot detected.")
        return honeypot

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise ValidationError("Cet email est déjà utilisé par un autre utilisateur.")
        
        # Note: Professional practice suggests avoiding synchronous DNS lookups in web requests.
        # Basic format validation is already handled by EmailField.
        # Domain validation should ideally be done via email confirmation (asynchronous).
            
        return email


class CustomAuthenticationForm(AuthenticationForm):
    """Formulaire de connexion personnalisé"""
    username = forms.CharField(widget=forms.TextInput(attrs={'class': INPUT_CLASSES, 'placeholder': 'Nom d\'utilisateur'}))
    password = forms.CharField(widget=forms.PasswordInput(attrs={'class': INPUT_CLASSES, 'placeholder': 'Mot de passe'}))


# ==================== USER MANAGEMENT FORMS ====================

class UserManageForm(forms.ModelForm):
    """Formulaire de gestion des utilisateurs (Admin)"""
    group = forms.ModelChoiceField(
        queryset=Group.objects.all(),
        required=False,
        widget=forms.Select(attrs={'class': INPUT_CLASSES}),
        label="Groupe"
    )
    password = forms.CharField(
        required=False,
        widget=forms.PasswordInput(attrs={'class': INPUT_CLASSES}),
        label="Mot de passe (laisser vide pour ne pas changer)"
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'is_active', 'is_superuser']
        widgets = {
            'username': forms.TextInput(attrs={'class': INPUT_CLASSES}),
            'email': forms.EmailInput(attrs={'class': INPUT_CLASSES}),
            'first_name': forms.TextInput(attrs={'class': INPUT_CLASSES}),
            'last_name': forms.TextInput(attrs={'class': INPUT_CLASSES}),
            'is_active': forms.CheckboxInput(attrs={'class': CHECKBOX_CLASSES}),
            'is_superuser': forms.CheckboxInput(attrs={'class': CHECKBOX_CLASSES}),
        }

    def clean_email(self):
        email = self.cleaned_data.get('email')
        qs = User.objects.filter(email=email)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise ValidationError("Cet email est déjà utilisé par un autre utilisateur.")
            
        # Domain validation
        try:
            domain = email.split('@')[1]
            socket.gethostbyname(domain)
        except (IndexError, socket.error):
            raise ValidationError(f"Le domaine '{domain}' n'existe pas ou est invalide.")
            
        return email

    def save(self, commit=True):
        user = super().save(commit=False)
        
        # Gérer le mot de passe
        password = self.cleaned_data.get('password')
        if password:
            user.set_password(password)
        
        if commit:
            user.save()
            
            # Gérer le groupe
            group = self.cleaned_data.get('group')
            user.groups.clear()
            if group:
                user.groups.add(group)
        
        return user


class UserProfileForm(forms.ModelForm):
    """Formulaire de profil utilisateur"""
    class Meta:
        model = UserProfile
        fields = ['avatar']
        widgets = {
            'avatar': forms.FileInput(attrs={'class': INPUT_CLASSES}),
        }


# ==================== SETTINGS FORM ====================

class SettingsForm(forms.ModelForm):
    """Formulaire de paramètres"""
    class Meta:
        model = Settings
        fields = ['company_name', 'company_logo', 'language', 'currency', 'email_notifications']
        widgets = {
            'company_name': forms.TextInput(attrs={'class': INPUT_CLASSES}),
            'company_logo': forms.FileInput(attrs={'class': INPUT_CLASSES}),
            'language': forms.Select(attrs={'class': INPUT_CLASSES}),
            'currency': forms.Select(attrs={'class': INPUT_CLASSES}),
            'email_notifications': forms.CheckboxInput(attrs={'class': CHECKBOX_CLASSES}),
        }


# ==================== CATEGORY FORM ====================

class CategoryForm(forms.ModelForm):
    """Formulaire de catégorie"""
    class Meta:
        model = Category
        fields = ['name', 'description']
        widgets = {
            'name': forms.TextInput(attrs={'class': INPUT_CLASSES}),
            'description': forms.Textarea(attrs={'class': INPUT_CLASSES, 'rows': 3}),
        }


# ==================== SUPPLIER FORM ====================

class SupplierForm(forms.ModelForm):
    """Formulaire de fournisseur"""
    class Meta:
        model = Supplier
        fields = ['name', 'contact_person', 'email', 'phone', 'address', 'city', 'country', 'notes']
        widgets = {
            'name': forms.TextInput(attrs={'class': INPUT_CLASSES, 'placeholder': 'Ex: codeshestergn'}),
            'contact_person': forms.TextInput(attrs={'class': INPUT_CLASSES, 'placeholder': 'Ex: BEAVOGUI Alfred Vévé'}),
            'email': forms.EmailInput(attrs={'class': INPUT_CLASSES, 'placeholder': 'Ex: infos@codeshester.ins'}),
            'phone': forms.TextInput(attrs={'class': INPUT_CLASSES, 'placeholder': 'Ex: +224 620 83 35 02'}),
            'address': forms.Textarea(attrs={'class': INPUT_CLASSES, 'rows': 3, 'placeholder': 'Adresse du siège social...'}),
            'city': forms.TextInput(attrs={'class': INPUT_CLASSES, 'placeholder': 'Ex: Conakry'}),
            'country': forms.TextInput(attrs={'class': INPUT_CLASSES, 'placeholder': 'Ex: Guinée'}),
            'notes': forms.Textarea(attrs={'class': INPUT_CLASSES, 'rows': 3, 'placeholder': 'Modalités de paiement, délais de livraison...'}),
        }


# ==================== CLIENT FORM ====================

class ClientForm(forms.ModelForm):
    """Formulaire de client"""
    class Meta:
        model = Client
        fields = ['name', 'client_type', 'contact_person', 'email', 'phone', 'address', 'city', 'tax_id', 'notes']
        labels = {
            'name': 'Nom / Raison Sociale',
            'client_type': 'Type de Client',
            'contact_person': 'Personne de contact',
            'email': 'Email (Secondaire / Principal)',
            'phone': 'N° Téléphone',
            'address': 'Adresse',
            'city': 'Ville',
            'tax_id': 'Identifiant Fiscal (NIF)',
            'notes': 'Notes',
        }
        widgets = {
            'name': forms.TextInput(attrs={'class': INPUT_CLASSES, 'placeholder': 'Ex: BEA Michel ou ETS BEA & FILS SARL'}),
            'client_type': forms.Select(attrs={'class': INPUT_CLASSES, 'data-control': 'select2', 'data-placeholder': 'Sélectionner le type'}),
            'contact_person': forms.TextInput(attrs={'class': INPUT_CLASSES, 'placeholder': 'Ex:Jeannette Gaou BEA (Responsable Achat)'}),
            'email': forms.EmailInput(attrs={'class': INPUT_CLASSES, 'placeholder': 'Ex: infos@codeshester.ins'}),
            'phone': forms.TextInput(attrs={'class': INPUT_CLASSES, 'placeholder': 'Ex: +224 620 83 35 02'}),
            'address': forms.Textarea(attrs={'class': INPUT_CLASSES, 'rows': 3, 'placeholder': 'Adresse complète...'}),
            'city': forms.TextInput(attrs={'class': INPUT_CLASSES, 'placeholder': 'Ex: Conakry'}),
            'tax_id': forms.TextInput(attrs={'class': INPUT_CLASSES, 'placeholder': 'Numéro d\'impôt'}),
            'notes': forms.Textarea(attrs={'class': INPUT_CLASSES, 'rows': 3, 'placeholder': 'Notes supplémentaires...'}),
        }


# ==================== PRODUCT FORM ====================

class ProductForm(forms.ModelForm):
    """Formulaire de produit"""
    class Meta:
        model = Product
        fields = [
            'name', 'sku', 'description', 'category', 'supplier', 
            'purchase_price', 'margin', 'selling_price', 
            'units_per_box', 'wholesale_purchase_price', 'wholesale_margin', 'wholesale_selling_price',
            'image'
        ]
        widgets = {
            'name': forms.TextInput(attrs={'class': INPUT_CLASSES}),
            'sku': forms.TextInput(attrs={'class': INPUT_CLASSES}),
            'description': forms.Textarea(attrs={'class': INPUT_CLASSES, 'rows': 3}),
            'category': forms.Select(attrs={'class': INPUT_CLASSES}),
            'supplier': forms.Select(attrs={'class': INPUT_CLASSES}),
            'purchase_price': forms.NumberInput(attrs={'class': INPUT_CLASSES, 'step': '0.01', 'placeholder': 'PUA Détail'}),
            'margin': forms.NumberInput(attrs={'class': INPUT_CLASSES + ' bg-light', 'readonly': 'readonly', 'step': '0.01'}),
            'selling_price': forms.NumberInput(attrs={'class': INPUT_CLASSES, 'step': '0.01', 'placeholder': 'PUV Détail'}),
            
            'units_per_box': forms.NumberInput(attrs={'class': INPUT_CLASSES, 'min': '1'}),
            'wholesale_purchase_price': forms.NumberInput(attrs={'class': INPUT_CLASSES, 'step': '0.01', 'placeholder': 'PUA Gros'}),
            'wholesale_margin': forms.NumberInput(attrs={'class': INPUT_CLASSES + ' bg-light', 'readonly': 'readonly', 'step': '0.01'}),
            'wholesale_selling_price': forms.NumberInput(attrs={'class': INPUT_CLASSES, 'step': '0.01', 'placeholder': 'PUV Gros'}),
            'image': forms.FileInput(attrs={'class': 'form-control'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['sku'].required = False
        self.fields['sku'].help_text = "Laissez vide pour générer automatiquement un code (ex: ACC-0001)"


# ==================== INVENTORY FORM ====================

class InventoryForm(forms.ModelForm):
    """Formulaire d'inventaire"""
    class Meta:
        model = Inventory
        fields = ['product', 'point_of_sale', 'quantity', 'reorder_level', 'location']
        widgets = {
            'product': forms.Select(attrs={'class': INPUT_CLASSES}),
            'point_of_sale': forms.Select(attrs={'class': INPUT_CLASSES}),
            'quantity': forms.NumberInput(attrs={'class': INPUT_CLASSES}),
            'reorder_level': forms.NumberInput(attrs={'class': INPUT_CLASSES}),
            'location': forms.TextInput(attrs={'class': INPUT_CLASSES}),
        }


# Formset pour gérer les inventaires lors de la création/modification de produits
ProductInventoryFormSet = inlineformset_factory(
    Product,
    Inventory,
    fields=['point_of_sale', 'quantity', 'reorder_level', 'location'],
    extra=0,
    can_delete=False,
    widgets={
        'point_of_sale': forms.Select(attrs={'class': INPUT_CLASSES, 'readonly': 'readonly'}),
        'quantity': forms.NumberInput(attrs={'class': INPUT_CLASSES}),
        'reorder_level': forms.NumberInput(attrs={'class': INPUT_CLASSES}),
        'location': forms.TextInput(attrs={'class': INPUT_CLASSES}),
    }
)


# ==================== POINT OF SALE FORM ====================

class PointOfSaleForm(forms.ModelForm):
    """Formulaire de point de vente"""
    class Meta:
        model = PointOfSale
        fields = ['name', 'code', 'address', 'city', 'phone', 'manager', 'is_active', 'is_warehouse']
        widgets = {
            'name': forms.TextInput(attrs={'class': INPUT_CLASSES}),
            'code': forms.TextInput(attrs={'class': INPUT_CLASSES}),
            'address': forms.Textarea(attrs={'class': INPUT_CLASSES, 'rows': 3}),
            'city': forms.TextInput(attrs={'class': INPUT_CLASSES}),
            'phone': forms.TextInput(attrs={'class': INPUT_CLASSES}),
            'manager': forms.Select(attrs={'class': INPUT_CLASSES}),
            'is_active': forms.CheckboxInput(attrs={'class': CHECKBOX_CLASSES}),
            'is_warehouse': forms.CheckboxInput(attrs={'class': CHECKBOX_CLASSES}),
        }


# ==================== STOCK MOVEMENT FORM ====================

class StockMovementForm(forms.ModelForm):
    """Formulaire de mouvement de stock"""
    class Meta:
        model = StockMovement
        fields = ['product', 'movement_type', 'is_wholesale', 'quantity', 'from_point_of_sale', 'to_point_of_sale', 'reference', 'notes']
        widgets = {
            'product': forms.Select(attrs={'class': INPUT_CLASSES}),
            'movement_type': forms.Select(attrs={'class': INPUT_CLASSES}),
            'quantity': forms.NumberInput(attrs={'class': INPUT_CLASSES}),
            'from_point_of_sale': forms.Select(attrs={'class': INPUT_CLASSES}),
            'to_point_of_sale': forms.Select(attrs={'class': INPUT_CLASSES}),
            'reference': forms.TextInput(attrs={'class': INPUT_CLASSES}),
            'notes': forms.Textarea(attrs={'class': INPUT_CLASSES, 'rows': 3}),
        }


class ReplenishForm(forms.Form):
    """Formulaire de réapprovisionnement d'un point de vente"""
    product = forms.ModelChoiceField(
        queryset=Product.objects.all(),
        widget=forms.Select(attrs={'class': INPUT_CLASSES}),
        label="Produit"
    )
    quantity = forms.IntegerField(
        min_value=1,
        widget=forms.NumberInput(attrs={'class': INPUT_CLASSES}),
        label="Quantité"
    )
    reference = forms.CharField(
        required=False,
        max_length=100,
        widget=forms.TextInput(attrs={'class': INPUT_CLASSES, 'placeholder': 'Ex: REPL-20231206'}),
        label="Référence"
    )
    notes = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={'class': INPUT_CLASSES, 'rows': 3, 'placeholder': 'Notes optionnelles...'}),
        label="Notes"
    )
    
    def __init__(self, *args, **kwargs):
        from_pos = kwargs.pop('from_pos', None)
        super().__init__(*args, **kwargs)
        
        if from_pos:
            # Filter products to only show those available in the source warehouse
            self.fields['product'].queryset = Product.objects.filter(
                inventory__point_of_sale=from_pos,
                inventory__quantity__gt=0
            ).distinct()


# ==================== INVOICE FORMS ====================

class InvoiceForm(forms.ModelForm):
    """Formulaire de facture"""
    class Meta:
        model = Invoice
        fields = ['client', 'invoice_type', 'point_of_sale', 'date_issued', 'date_due', 'status', 'apply_tax', 'tax_rate', 'notes']
        widgets = {
            'client': forms.Select(attrs={'class': INPUT_CLASSES}),
            'invoice_type': forms.Select(attrs={'class': INPUT_CLASSES}),
            'point_of_sale': forms.Select(attrs={'class': INPUT_CLASSES}),
            'date_issued': forms.DateInput(attrs={'class': INPUT_CLASSES, 'type': 'date'}),
            'date_due': forms.DateInput(attrs={'class': INPUT_CLASSES, 'type': 'date'}),
            'status': forms.Select(attrs={'class': INPUT_CLASSES}),
            'apply_tax': forms.CheckboxInput(attrs={'class': CHECKBOX_CLASSES}),
            'tax_rate': forms.NumberInput(attrs={'class': INPUT_CLASSES, 'step': '0.01', 'placeholder': 'Ex: 18 (Laisser vide pour 0%)'}),
            'notes': forms.Textarea(attrs={'class': INPUT_CLASSES, 'rows': 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['tax_rate'].required = False

    def clean_tax_rate(self):
        tax_rate = self.cleaned_data.get('tax_rate')
        if tax_rate is None:
            return 0
        return tax_rate


class InvoiceItemForm(forms.ModelForm):
    """Formulaire de ligne de facture"""
    class Meta:
        model = InvoiceItem
        fields = ['product', 'is_wholesale', 'quantity', 'unit_price', 'discount']
        widgets = {
            'product': forms.Select(attrs={
                'class': INPUT_CLASSES,
                'data-field': 'product',
                'data-autofill': 'true'
            }),
            'is_wholesale': forms.CheckboxInput(attrs={
                'class': 'form-check-input ms-2',
                'data-field': 'is_wholesale',
                'data-calculate': 'true'
            }),
            'quantity': forms.NumberInput(attrs={
                'class': INPUT_CLASSES,
                'min': '1',
                'step': '1',
                'placeholder': 'Qté',
                'data-field': 'quantity',
                'data-calculate': 'true'
            }),
            'unit_price': forms.NumberInput(attrs={
                'class': INPUT_CLASSES,
                'min': '0.01',
                'step': '0.01',
                'placeholder': 'Prix unitaire',
                'data-field': 'unit_price',
                'data-calculate': 'true'
            }),
            'discount': forms.NumberInput(attrs={
                'class': INPUT_CLASSES,
                'min': '0',
                'max': '100',
                'step': '0.01',
                'placeholder': '0',
                'data-field': 'discount',
                'data-calculate': 'true'
            }),
        }
        help_texts = {
            'product': 'Sélectionnez un produit',
            'quantity': 'Quantité',
            'unit_price': 'Prix unitaire',
            'discount': 'Optionnel',
        }
        labels = {
            'product': 'Produit',
            'quantity': 'Quantité',
            'unit_price': 'Prix unitaire',
            'discount': 'Remise (%)',
        }
    
    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        # Make discount field optional
        self.fields['discount'].required = False

    def clean_discount(self):
        discount = self.cleaned_data.get('discount')
        
        if discount is None:
            return 0
            
        if self.user:
            from .permissions import validate_discount
            is_valid, error_message = validate_discount(self.user, discount)
            if not is_valid:
                raise ValidationError(error_message)
                
        return discount





InvoiceItemFormSet = inlineformset_factory(
    Invoice,
    InvoiceItem,
    form=InvoiceItemForm,
    fields=['product', 'is_wholesale', 'quantity', 'unit_price', 'discount'],
    extra=1,
    can_delete=True
)


# ==================== RECEIPT FORMS ====================

class ReceiptForm(forms.ModelForm):
    """Formulaire de bon de réception"""
    class Meta:
        model = Receipt
        fields = ['supplier', 'point_of_sale', 'date_received', 'supplier_reference', 'status', 'delivery_costs', 'notes']
        widgets = {
            'supplier': forms.Select(attrs={'class': INPUT_CLASSES}),
            'point_of_sale': forms.Select(attrs={'class': INPUT_CLASSES}),
            'date_received': forms.DateInput(attrs={'class': INPUT_CLASSES, 'type': 'date'}),
            'supplier_reference': forms.TextInput(attrs={'class': INPUT_CLASSES}),
            'status': forms.Select(attrs={'class': INPUT_CLASSES}),
            'delivery_costs': forms.NumberInput(attrs={'class': INPUT_CLASSES, 'step': '0.01'}),
            'notes': forms.Textarea(attrs={'class': INPUT_CLASSES, 'rows': 3}),
        }


class ReceiptItemForm(forms.ModelForm):
    """Formulaire de ligne de bon de réception"""
    class Meta:
        model = ReceiptItem
        fields = ['product', 'is_wholesale', 'quantity', 'unit_cost']
        widgets = {
            'product': forms.Select(attrs={'class': 'form-select form-select-solid', 'data-control': 'select2'}),
            'is_wholesale': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control form-control-solid', 'placeholder': '0'}),
            'unit_cost': forms.NumberInput(attrs={'class': 'form-control form-control-solid', 'placeholder': '0.00'}),
        }


# ==================== QUOTE FORMS ====================

class QuoteForm(forms.ModelForm):
    """Formulaire de devis"""
    class Meta:
        model = Quote
        fields = ['client', 'quote_type', 'date_issued', 'valid_until', 'status', 'tax_rate', 'notes']
        widgets = {
            'client': forms.Select(attrs={'class': 'form-select form-select-solid form-select-lg', 'data-placeholder': 'Sélectionner un client'}),
            'quote_type': forms.Select(attrs={'class': 'form-select form-select-solid'}),
            'date_issued': forms.DateInput(attrs={'class': 'form-control form-control-solid', 'type': 'date'}),
            'valid_until': forms.DateInput(attrs={'class': 'form-control form-control-solid', 'type': 'date'}),
            'status': forms.Select(attrs={'class': 'form-select form-select-solid'}),
            # added required=False logic via validation, widget remains similar but placeholder hints optional
            'tax_rate': forms.NumberInput(attrs={'class': 'form-control form-control-solid', 'step': '0.01', 'placeholder': 'Ex: 18 (Laisser vide pour 0%)'}),
            'notes': forms.Textarea(attrs={'class': 'form-control form-control-solid', 'rows': 3, 'placeholder': 'Ajoutez des notes ou conditions spécifiques pour ce devis...'}),
        }
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['tax_rate'].required = False

    def clean_tax_rate(self):
        tax_rate = self.cleaned_data.get('tax_rate')
        if tax_rate is None:
            return 0
        return tax_rate


class QuoteItemForm(forms.ModelForm):
    """Formulaire de ligne de devis"""
    class Meta:
        model = QuoteItem
        fields = ['product', 'is_wholesale', 'quantity', 'unit_price', 'discount']
        widgets = {
            'product': forms.Select(attrs={'class': INPUT_CLASSES}),
            'is_wholesale': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'quantity': forms.NumberInput(attrs={
                'class': INPUT_CLASSES, 
                'min': '1',
                'step': '1',
                'placeholder': 'Qté'
            }),
            'unit_price': forms.NumberInput(attrs={
                'class': INPUT_CLASSES, 
                'step': '0.01',
                'min': '0.01',
                'max': '100000000',
                'placeholder': 'Prix (GNF)'
            }),
            'discount': forms.NumberInput(attrs={
                'class': INPUT_CLASSES, 
                'step': '0.01',
                'min': '0',
                'max': '100',
                'placeholder': '0'
            }),
        }


QuoteItemFormSet = inlineformset_factory(
    Quote,
    QuoteItem,
    form=QuoteItemForm,
    fields=['product', 'is_wholesale', 'quantity', 'unit_price', 'discount'],
    extra=1,
    can_delete=True
)


# ==================== PASSWORD RESET FORMS ====================

class PasswordResetRequestForm(forms.Form):
    """Formulaire de demande de réinitialisation de mot de passe"""
    email = forms.EmailField(
        label=_("Adresse email"),
        max_length=254,
        widget=forms.EmailInput(attrs={
            'class': INPUT_CLASSES,
            'placeholder': 'Entrez votre adresse email',
            'autocomplete': 'email'
        })
    )

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if not User.objects.filter(email=email).exists():
            raise ValidationError(_("Aucun utilisateur n'est associé à cette adresse email."))
        return email


class PasswordResetVerifyForm(forms.Form):
    """Formulaire de vérification du code de réinitialisation"""
    code = forms.CharField(
        label=_("Code de vérification"),
        max_length=6,
        min_length=6,
        widget=forms.TextInput(attrs={
            'class': INPUT_CLASSES + ' text-center',
            'placeholder': '000000',
            'autocomplete': 'off',
            'pattern': '[0-9]*',
            'inputmode': 'numeric'
        })
    )


class SetNewPasswordForm(forms.Form):
    """Formulaire de définition d'un nouveau mot de passe"""
    new_password = forms.CharField(
        label=_("Nouveau mot de passe"),
        widget=forms.PasswordInput(attrs={
            'class': INPUT_CLASSES,
            'placeholder': 'Nouveau mot de passe'
        }),
        min_length=8
    )
    confirm_password = forms.CharField(
        label=_("Confirmer le mot de passe"),
        widget=forms.PasswordInput(attrs={
            'class': INPUT_CLASSES,
            'placeholder': 'Confirmer le mot de passe'
        })
    )

    def clean(self):
        cleaned_data = super().clean()
        new_password = cleaned_data.get("new_password")
        confirm_password = cleaned_data.get("confirm_password")

        if new_password and confirm_password:
            if new_password != confirm_password:
                raise ValidationError(_("Les mots de passe ne correspondent pas."))
        return cleaned_data


class ChangePasswordForm(forms.Form):
    """Formulaire de changement de mot de passe"""
    current_password = forms.CharField(
        label=_("Mot de passe actuel"),
        widget=forms.PasswordInput(attrs={
            'class': INPUT_CLASSES,
            'placeholder': 'Mot de passe actuel',
            'autocomplete': 'current-password'
        })
    )
    new_password = forms.CharField(
        label=_("Nouveau mot de passe"),
        min_length=8,
        widget=forms.PasswordInput(attrs={
            'class': INPUT_CLASSES,
            'placeholder': 'Nouveau mot de passe',
            'autocomplete': 'new-password'
        }),
        help_text=_("Minimum 8 caractères")
    )
    confirm_password = forms.CharField(
        label=_("Confirmer le nouveau mot de passe"),
        widget=forms.PasswordInput(attrs={
            'class': INPUT_CLASSES,
            'placeholder': 'Confirmer le mot de passe',
            'autocomplete': 'new-password'
        })
    )
    
    def __init__(self, user, *args, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)
    
    def clean_current_password(self):
        """Valider que le mot de passe actuel est correct"""
        current_password = self.cleaned_data.get('current_password')
        if not self.user.check_password(current_password):
            raise ValidationError(_("Le mot de passe actuel est incorrect."))
        return current_password
    
    def clean(self):
        """Valider que les nouveaux mots de passe correspondent"""
        cleaned_data = super().clean()
        new_password = cleaned_data.get("new_password")
        confirm_password = cleaned_data.get("confirm_password")
        
        if new_password and confirm_password:
            if new_password != confirm_password:
                raise ValidationError(_("Les nouveaux mots de passe ne correspondent pas."))
        
        return cleaned_data


# ==================== PRODUCT IMPORT FORM ====================

class ProductImportForm(forms.Form):
    """Formulaire d'importation de produits depuis Excel"""
    excel_file = forms.FileField(
        label="Fichier Excel",
        help_text="Formats acceptés: .xlsx, .xls (max 5MB)",
        widget=forms.FileInput(attrs={
            'class': 'file-input file-input-bordered w-full',
            'accept': '.xlsx,.xls'
        })
    )
    
    def clean_excel_file(self):
        file = self.cleaned_data.get('excel_file')
        if file:
            # Vérifier l'extension
            if not file.name.endswith(('.xlsx', '.xls')):
                raise ValidationError("Format de fichier non supporté. Utilisez .xlsx ou .xls")
            
            # Vérifier la taille (max 5MB)
            if file.size > 5 * 1024 * 1024:
                raise ValidationError("Le fichier est trop volumineux. Taille maximale: 5MB")
        
        return file
