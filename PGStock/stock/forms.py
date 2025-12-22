from django import forms
from .models import StockMovement
from inventory.models import Product, PointOfSale

class StockMovementForm(forms.ModelForm):
    class Meta:
        model = StockMovement
        fields = ['product', 'movement_type', 'quantity', 'from_point_of_sale', 'to_point_of_sale', 'reference', 'notes']
        widgets = {
            'comments': forms.Textarea(attrs={'rows': 2, 'class': 'form-control'}),
            'product': forms.Select(attrs={'class': 'form-select select2'}), # select2 if available
            'movement_type': forms.Select(attrs={'class': 'form-select'}),
            'from_point_of_sale': forms.Select(attrs={'class': 'form-select'}),
            'to_point_of_sale': forms.Select(attrs={'class': 'form-select'}),
            'reference': forms.TextInput(attrs={'class': 'form-control'}),
            'notes': forms.Textarea(attrs={'rows': 2, 'class': 'form-control'}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control', 'min': '1'}),
        }

    def clean(self):
        cleaned_data = super().clean()
        m_type = cleaned_data.get('movement_type')
        to_pos = cleaned_data.get('to_point_of_sale')
        
        if m_type == 'transfer' and not to_pos:
            self.add_error('to_point_of_sale', "Le point de vente de destination est requis pour un transfert.")
        
        return cleaned_data
