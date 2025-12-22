"""
Mixins réutilisables pour les vues Django du projet GestionSTOCK

Ces mixins permettent de standardiser les patterns communs à travers toutes les applications.
"""

from django.views.generic import CreateView, UpdateView
from django.contrib import messages
from django.db import transaction
from django.shortcuts import redirect
from django.utils.translation import gettext as _


class FormsetMixin:
    """
    Mixin pour gérer les formsets dans les vues CreateView et UpdateView.
    
    Attributes:
        formset_class: La classe de formset à utiliser
        formset_context_name: Le nom de la variable dans le contexte (défaut: 'formset')
    """
    formset_class = None
    formset_context_name = 'formset'
    
    def get_formset_class(self):
        """Retourne la classe de formset à utiliser"""
        if self.formset_class is None:
            raise NotImplementedError(
                "FormsetMixin requires either a definition of "
                "'formset_class' or an implementation of 'get_formset_class()'"
            )
        return self.formset_class
    
    def get_formset_kwargs(self):
        """Retourne les kwargs pour instancier le formset"""
        kwargs = {}
        if hasattr(self, 'object') and self.object:
            kwargs['instance'] = self.object
        return kwargs
    
    def get_formset(self, formset_class=None):
        """Retourne une instance du formset"""
        if formset_class is None:
            formset_class = self.get_formset_class()
        
        kwargs = self.get_formset_kwargs()
        
        if self.request.method in ('POST', 'PUT'):
            kwargs.update({
                'data': self.request.POST,
                'files': self.request.FILES,
            })
        
        return formset_class(**kwargs)
    
    def get_context_data(self, **kwargs):
        """Ajoute le formset au contexte"""
        context = super().get_context_data(**kwargs)
        if self.formset_context_name not in context:
            context[self.formset_context_name] = self.get_formset()
        return context


class FormsetCreateMixin(FormsetMixin):
    """
    Mixin pour CreateView avec gestion de formset.
    Gère automatiquement la transaction atomique et la sauvegarde du formset.
    """
    
    def form_valid(self, form):
        """Sauvegarde le formulaire principal et le formset dans une transaction atomique"""
        context = self.get_context_data()
        formset = context[self.formset_context_name]
        
        with transaction.atomic():
            # Sauvegarder l'objet principal
            self.object = form.save(commit=False)
            
            # Hook pour modifier l'objet avant sauvegarde
            self.pre_save_object(self.object)
            
            self.object.save()
            
            # Sauvegarder le formset
            if formset.is_valid():
                formset.instance = self.object
                formset.save()
                
                # Hook pour actions post-sauvegarde
                self.post_save_formset(formset)
                
                # Message de succès
                if hasattr(self, 'success_message') and self.success_message:
                    messages.success(self.request, self.success_message)
                
                return redirect(self.get_success_url())
            else:
                # Si le formset est invalide, on annule tout (transaction.atomic rollback)
                transaction.set_rollback(True)
        
        # Réafficher le formulaire avec les erreurs
        return self.render_to_response(self.get_context_data(form=form))
    
    def pre_save_object(self, obj):
        """Hook appelé avant la sauvegarde de l'objet principal"""
        pass
    
    def post_save_formset(self, formset):
        """Hook appelé après la sauvegarde du formset"""
        pass


class FormsetUpdateMixin(FormsetMixin):
    """
    Mixin pour UpdateView avec gestion de formset.
    Similaire à FormsetCreateMixin mais pour les mises à jour.
    """
    
    def form_valid(self, form):
        """Met à jour le formulaire principal et le formset dans une transaction atomique"""
        context = self.get_context_data()
        formset = context[self.formset_context_name]
        
        with transaction.atomic():
            # Sauvegarder l'objet principal
            self.object = form.save(commit=False)
            
            # Hook pour modifier l'objet avant sauvegarde
            self.pre_save_object(self.object)
            
            self.object.save()
            
            # Sauvegarder le formset
            if formset.is_valid():
                formset.save()
                
                # Hook pour actions post-sauvegarde
                self.post_save_formset(formset)
                
                # Message de succès
                if hasattr(self, 'success_message') and self.success_message:
                    messages.success(self.request, self.success_message)
                
                return redirect(self.get_success_url())
            else:
                # Si le formset est invalide, on annule tout
                transaction.set_rollback(True)
        
        # Réafficher le formulaire avec les erreurs
        return self.render_to_response(self.get_context_data(form=form))
    
    def pre_save_object(self, obj):
        """Hook appelé avant la sauvegarde de l'objet principal"""
        pass
    
    def post_save_formset(self, formset):
        """Hook appelé après la sauvegarde du formset"""
        pass


class FilterMixin:
    """
    Mixin pour ajouter des capacités de filtrage aux ListView.
    
    Attributes:
        filter_fields: Liste des champs sur lesquels filtrer (défaut: ['q'])
        search_fields: Liste des champs de recherche pour le paramètre 'q'
    """
    filter_fields = ['q']
    search_fields = []
    
    def get_queryset(self):
        """Applique les filtres au queryset"""
        queryset = super().get_queryset()
        
        # Filtrage par recherche textuelle
        query = self.request.GET.get('q')
        if query and self.search_fields:
            from django.db.models import Q
            q_objects = Q()
            for field in self.search_fields:
                q_objects |= Q(**{f"{field}__icontains": query})
            queryset = queryset.filter(q_objects)
        
        # Autres filtres
        for field in self.filter_fields:
            if field == 'q':
                continue
            value = self.request.GET.get(field)
            if value:
                queryset = queryset.filter(**{field: value})
        
        return queryset
    
    def get_context_data(self, **kwargs):
        """Ajoute les paramètres de filtrage au contexte"""
        context = super().get_context_data(**kwargs)
        
        # Ajouter les valeurs de filtrage au contexte
        for field in self.filter_fields:
            context[f'{field}_filter'] = self.request.GET.get(field, '')
        
        return context


class SuccessMessageMixin:
    """
    Mixin pour ajouter automatiquement un message de succès après une action.
    Compatible avec CreateView, UpdateView, DeleteView.
    """
    success_message = None
    
    def get_success_message(self):
        """Retourne le message de succès"""
        return self.success_message
    
    def form_valid(self, form):
        """Ajoute le message de succès après validation du formulaire"""
        response = super().form_valid(form)
        success_message = self.get_success_message()
        if success_message:
            messages.success(self.request, success_message)
        return response
    
    def delete(self, request, *args, **kwargs):
        """Ajoute le message de succès après suppression"""
        response = super().delete(request, *args, **kwargs)
        success_message = self.get_success_message()
        if success_message:
            messages.success(self.request, success_message)
        return response
