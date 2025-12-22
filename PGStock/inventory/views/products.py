from django.views.generic import ListView, CreateView, UpdateView, DeleteView
from django.contrib.messages.views import SuccessMessageMixin
from django.urls import reverse_lazy
from django.db.models import Count, Q, Sum, F
from django.db.models.functions import Coalesce
from django.shortcuts import redirect
from django.contrib import messages
from django.db.models import ProtectedError

from ..models import Product, Category, PointOfSale, Inventory
from ..forms import ProductForm, ProductInventoryFormSet
from ..permissions import StaffRequiredMixin, SuperuserRequiredMixin, AdminRequiredMixin

class ProductListView(StaffRequiredMixin, ListView):
    model = Product
    template_name = 'inventory/product/product_list.html'
    context_object_name = 'products'
    paginate_by = 10

    def get_queryset(self):
        queryset = Product.objects.select_related('category', 'supplier').prefetch_related(
            'inventory_set', 
            'inventory_set__point_of_sale'
        ).annotate(
            total_stock_annotated=Coalesce(Sum('inventory__quantity'), 0)
        ).order_by('name')

        query = self.request.GET.get('q')
        category_id = self.request.GET.get('category')

        if query:
            queryset = queryset.filter(
                Q(name__icontains=query) | 
                Q(sku__icontains=query) | 
                Q(description__icontains=query)
            )
        
        if category_id:
            queryset = queryset.filter(category_id=category_id)
            
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['categories'] = Category.objects.all()
        context['query'] = self.request.GET.get('q', '')
        context['selected_category'] = self.request.GET.get('category', '')
        return context

class ProductCreateView(SuperuserRequiredMixin, CreateView):
    model = Product
    form_class = ProductForm
    template_name = 'inventory/product/product_form.html'
    success_url = reverse_lazy('inventory:product_list')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.POST:
            context['inventory_formset'] = ProductInventoryFormSet(self.request.POST)
        else:
            # Pre-fill formset with all active POS
            active_pos = PointOfSale.objects.filter(is_active=True).order_by('name')
            initial_data = [{'point_of_sale': pos} for pos in active_pos]
            context['inventory_formset'] = ProductInventoryFormSet(
                initial=initial_data, 
                queryset=Inventory.objects.none()
            )
        
        context['active_points_of_sale'] = PointOfSale.objects.filter(is_active=True).order_by('name')
        context['action'] = 'Créer'
        return context

    def form_valid(self, form):
        context = self.get_context_data()
        inventory_formset = context['inventory_formset']
        if inventory_formset.is_valid():
            self.object = form.save()
            inventory_formset.instance = self.object
            inventory_formset.save()
            messages.success(self.request, 'Produit et inventaires créés avec succès!')
            return redirect(self.success_url)
        else:
            return self.render_to_response(self.get_context_data(form=form))

class ProductUpdateView(SuperuserRequiredMixin, UpdateView):
    model = Product
    form_class = ProductForm
    template_name = 'inventory/product/product_form.html'
    success_url = reverse_lazy('inventory:product_list')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.POST:
            context['inventory_formset'] = ProductInventoryFormSet(self.request.POST, instance=self.object)
        else:
            context['inventory_formset'] = ProductInventoryFormSet(instance=self.object)
        
        context['active_points_of_sale'] = PointOfSale.objects.filter(is_active=True).order_by('name')
        context['action'] = 'Modifier'
        return context

    def form_valid(self, form):
        context = self.get_context_data()
        inventory_formset = context['inventory_formset']
        if inventory_formset.is_valid():
            self.object = form.save()
            inventory_formset.save()
            messages.success(self.request, 'Produit modifié avec succès!')
            return redirect(self.success_url)
        else:
             return self.render_to_response(self.get_context_data(form=form))

class ProductDeleteView(AdminRequiredMixin, DeleteView):
    model = Product
    template_name = 'inventory/product/product_confirm_delete.html'
    success_url = reverse_lazy('inventory:product_list')
    context_object_name = 'product'

    def delete(self, request, *args, **kwargs):
        try:
            response = super().delete(request, *args, **kwargs)
            messages.success(request, "Produit supprimé avec succès!")
            return response
        except ProtectedError:
            messages.error(request, "Impossible de supprimer ce produit car il est utilisé dans des factures ou des réceptions.")
            return redirect('inventory:product_list')
