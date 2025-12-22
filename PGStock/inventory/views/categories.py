from django.views.generic import ListView, CreateView, UpdateView, DeleteView
from django.contrib.messages.views import SuccessMessageMixin
from django.urls import reverse_lazy
from django.db.models import Count, Q
from django.shortcuts import redirect
from django.contrib import messages
from django.db.models import ProtectedError

from ..models import Category
from ..forms import CategoryForm
from ..permissions import StaffRequiredMixin, SuperuserRequiredMixin, AdminRequiredMixin

class CategoryListView(StaffRequiredMixin, ListView):
    model = Category
    template_name = 'inventory/category/category_list.html'
    context_object_name = 'categories'
    paginate_by = 12

    def get_queryset(self):
        queryset = Category.objects.annotate(product_count=Count('product'))
        query = self.request.GET.get('q')
        if query:
            queryset = queryset.filter(
                Q(name__icontains=query) | Q(description__icontains=query)
            )
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['query'] = self.request.GET.get('q', '')
        return context

class CategoryCreateView(SuperuserRequiredMixin, SuccessMessageMixin, CreateView):
    model = Category
    form_class = CategoryForm
    template_name = 'inventory/category/category_form.html'
    success_url = reverse_lazy('inventory:category_list')
    success_message = "Catégorie créée avec succès!"

class CategoryUpdateView(SuperuserRequiredMixin, SuccessMessageMixin, UpdateView):
    model = Category
    form_class = CategoryForm
    template_name = 'inventory/category/category_form.html'
    success_url = reverse_lazy('inventory:category_list')
    success_message = "Catégorie modifiée avec succès!"

class CategoryDeleteView(AdminRequiredMixin, DeleteView):
    model = Category
    template_name = 'inventory/category/category_confirm_delete.html'
    success_url = reverse_lazy('inventory:category_list')
    context_object_name = 'category'

    def delete(self, request, *args, **kwargs):
        try:
            response = super().delete(request, *args, **kwargs)
            messages.success(request, "Catégorie supprimée avec succès!")
            return response
        except ProtectedError:
            messages.error(request, "Impossible de supprimer cette catégorie car elle contient des produits.")
            return redirect('inventory:category_list')
