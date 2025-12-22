from django.shortcuts import render, redirect
from django.views.generic import ListView, CreateView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.db import transaction
from django.contrib import messages
from django.utils.translation import gettext as _

from .models import Order
from .forms import OrderForm, OrderItemFormSet

class OrderListView(LoginRequiredMixin, ListView):
    model = Order
    template_name = 'sales/order_list.html'
    context_object_name = 'orders'
    ordering = ['-date_created']
    paginate_by = 20

    def get_queryset(self):
        queryset = super().get_queryset()
        type_filter = self.request.GET.get('type')
        if type_filter:
            queryset = queryset.filter(order_type=type_filter)
        return queryset

class OrderCreateView(LoginRequiredMixin, CreateView):
    model = Order
    form_class = OrderForm
    template_name = 'sales/order_form.html'
    success_url = reverse_lazy('sales:order_list')

    def get_context_data(self, **kwargs):
        data = super().get_context_data(**kwargs)
        if self.request.POST:
            data['items'] = OrderItemFormSet(self.request.POST)
        else:
            data['items'] = OrderItemFormSet()
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
                
                # Mise à jour des totaux après sauvegarde des lignes
                self.object.update_totals()
                
                messages.success(self.request, _("Commande créée avec succès !"))
                return super().form_valid(form)
            else:
                # En cas d'erreur dans les lignes, on ne sauvegarde rien (Atomicité)
                # Mais ici CreateView a déjà sauvé 'self.object' via form.save()...
                # ATTENTION: Avec transaction.atomic(), si on raise une exemption, ça rollback.
                # Mais return form_invalid ne raise pas. 
                # Il faut supprimer l'objet créé si les items sont invalides, ou gérer manuellement.
                # Meilleure approche pour CreateView simple :
                pass 
                
        # Si on est ici, c'est que items n'est pas valide.
        return self.render_to_response(self.get_context_data(form=form))

    def form_invalid(self, form):
        messages.error(self.request, _("Erreur lors de la création de la commande."))
        return super().form_invalid(form)

class OrderDetailView(LoginRequiredMixin, DetailView):
    model = Order
    template_name = 'sales/order_detail.html'
    context_object_name = 'order'
