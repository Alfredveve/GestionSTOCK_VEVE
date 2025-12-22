from django import forms
from django.forms import inlineformset_factory
from .models import Receipt, ReceiptItem, Supplier
from inventory.models import Product

class ReceiptForm(forms.ModelForm):
    class Meta:
        model = Receipt
        fields = ['supplier', 'date_received', 'supplier_reference', 'delivery_costs', 'notes']
        widgets = {
            'date_received': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'notes': forms.Textarea(attrs={'rows': 3, 'class': 'form-control'}),
            'supplier': forms.Select(attrs={'class': 'form-select'}),
            'supplier_reference': forms.TextInput(attrs={'class': 'form-control'}),
            'delivery_costs': forms.NumberInput(attrs={'class': 'form-control'}),
        }

class ReceiptItemForm(forms.ModelForm):
    class Meta:
        model = ReceiptItem
        fields = ['product', 'quantity', 'unit_cost']
        widgets = {
            'product': forms.Select(attrs={'class': 'form-select product-select'}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control quantity-input', 'min': '1'}),
            'unit_cost': forms.NumberInput(attrs={'class': 'form-control price-input', 'step': '0.01'}),
        }

ReceiptItemFormSet = inlineformset_factory(
    Receipt, 
    ReceiptItem, 
    form=ReceiptItemForm,
    extra=1,
    can_delete=True
)
