from django.shortcuts import render
from django.views.generic import ListView, CreateView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.contrib import messages
from django.utils.translation import gettext as _

from .models import StockMovement
from .forms import StockMovementForm

class StockMovementListView(LoginRequiredMixin, ListView):
    model = StockMovement
    template_name = 'stock/movement_list.html'
    context_object_name = 'movements'
    ordering = ['-created_at']
    paginate_by = 20

class StockMovementCreateView(LoginRequiredMixin, CreateView):
    model = StockMovement
    form_class = StockMovementForm
    template_name = 'stock/movement_form.html'
    success_url = reverse_lazy('stock:movement_list')

    def form_valid(self, form):
        form.instance.user = self.request.user
        messages.success(self.request, _("Mouvement de stock enregistré."))
        return super().form_valid(form)

class StockMovementDetailView(LoginRequiredMixin, DetailView):
    """Vue de détail pour un mouvement de stock"""
    model = StockMovement
    template_name = 'stock/movement_detail.html'
    context_object_name = 'movement'
