from django.shortcuts import render, redirect
from django.views.generic import ListView, CreateView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.db import transaction
from django.contrib import messages
from django.utils.translation import gettext as _

from .models import Receipt
from .forms import ReceiptForm, ReceiptItemFormSet

class ReceiptListView(LoginRequiredMixin, ListView):
    model = Receipt
    template_name = 'purchasing/receipt_list.html'
    context_object_name = 'receipts'
    ordering = ['-date_received']
    paginate_by = 20

class ReceiptCreateView(LoginRequiredMixin, CreateView):
    model = Receipt
    form_class = ReceiptForm
    template_name = 'purchasing/receipt_form.html'
    success_url = reverse_lazy('purchasing:receipt_list')

    def get_context_data(self, **kwargs):
        data = super().get_context_data(**kwargs)
        if self.request.POST:
            data['items'] = ReceiptItemFormSet(self.request.POST)
        else:
            data['items'] = ReceiptItemFormSet()
        return data

    def form_valid(self, form):
        context = self.get_context_data()
        items = context['items']
        
        with transaction.atomic():
            form.instance.created_by = self.request.user
            self.object = form.save()
            
            if items.is_valid():
                items.instance = self.object
                items.save()
                
                # Mise à jour des totaux
                # Dans le modèle Receipt, nous avons une méthode calculate_total() ? 
                # Si non, on la calcule ici basiquement
                total = sum(item.total_cost for item in self.object.items.all())
                self.object.total_amount = total
                self.object.save()
                
                messages.success(self.request, _("Bon de réception créé avec succès !"))
                return super().form_valid(form)
            else:
                pass 
                
        return self.render_to_response(self.get_context_data(form=form))

    def form_invalid(self, form):
        messages.error(self.request, _("Erreur lors de la création du bon."))
        return super().form_invalid(form)

class ReceiptDetailView(LoginRequiredMixin, DetailView):
    model = Receipt
    template_name = 'purchasing/receipt_detail.html'
    context_object_name = 'receipt'
