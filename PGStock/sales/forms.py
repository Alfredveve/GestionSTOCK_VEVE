from django import forms
from django.forms import inlineformset_factory
from .models import Order, OrderItem
from inventory.models import Client, Product

class OrderForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = ['client', 'order_type', 'date_delivery_expected', 'notes']
        widgets = {
            'date_delivery_expected': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'notes': forms.Textarea(attrs={'rows': 3, 'class': 'form-control'}),
            'client': forms.Select(attrs={'class': 'form-select'}),
            'order_type': forms.Select(attrs={'class': 'form-select'}),
        }

class OrderItemForm(forms.ModelForm):
    class Meta:
        model = OrderItem
        fields = ['product', 'quantity', 'unit_price', 'discount']
        widgets = {
            'product': forms.Select(attrs={'class': 'form-select product-select'}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control quantity-input', 'min': '1'}),
            'unit_price': forms.NumberInput(attrs={'class': 'form-control price-input', 'step': '0.01'}),
            'discount': forms.NumberInput(attrs={'class': 'form-control discount-input', 'step': '0.01'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Optimisation: charger uniquement les produits actifs
        # self.fields['product'].queryset = Product.objects.filter(active=True) 

OrderItemFormSet = inlineformset_factory(
    Order, 
    OrderItem, 
    form=OrderItemForm,
    extra=1,
    can_delete=True
)
