"""
Système de permissions pour GestionSTOCK

Ce module fournit des décorateurs, mixins et utilitaires pour gérer
les permissions des trois rôles : ADMIN, SUPERUSER, STAFF
"""

from functools import wraps
from django.contrib.auth.decorators import user_passes_test
from django.core.exceptions import PermissionDenied
from django.shortcuts import redirect
from django.contrib import messages
from django.db.models import Q


# ==================== FONCTIONS DE VÉRIFICATION DE RÔLE ====================

def is_admin(user):
    """
    Vérifie si l'utilisateur est un administrateur.
    ADMIN = is_superuser=True OU membre du groupe 'Admin'
    """
    if not user.is_authenticated:
        return False
    return user.is_superuser or user.groups.filter(name='Admin').exists()


def is_superuser_or_admin(user):
    """
    Vérifie si l'utilisateur est SUPERUSER ou ADMIN.
    SUPERUSER = membre du groupe 'SUPERUSER'
    ADMIN = is_superuser=True ou membre du groupe 'Admin'
    """
    if not user.is_authenticated:
        return False
    return user.is_superuser or user.groups.filter(name__in=['SUPERUSER', 'Admin']).exists()


def is_staff_or_above(user):
    """
    Vérifie si l'utilisateur est STAFF, SUPERUSER ou ADMIN.
    STAFF = membre du groupe 'STAFF' ou 'Staff' ou is_staff=True
    """
    if not user.is_authenticated:
        return False
    return (
        user.is_superuser or 
        user.is_staff or
        user.groups.filter(name__in=['SUPERUSER', 'STAFF', 'Staff', 'Admin']).exists()
    )


def get_user_role(user):
    """
    Retourne le rôle de l'utilisateur.
    
    Returns:
        str: 'ADMIN', 'SUPERUSER', 'STAFF', ou None
    """
    if not user.is_authenticated:
        return None
    
    if user.is_superuser or user.groups.filter(name='Admin').exists():
        return 'ADMIN'
    
    if user.groups.filter(name='SUPERUSER').exists():
        return 'SUPERUSER'
    
    if user.is_staff or user.groups.filter(name__in=['STAFF', 'Staff']).exists():
        return 'STAFF'
    
    return None


def get_user_pos(user):
    """
    Retourne le point de vente assigné à l'utilisateur.
    
    Returns:
        PointOfSale ou None
    """
    if not user.is_authenticated:
        return None
    
    if hasattr(user, 'profile') and user.profile.point_of_sale:
        return user.profile.point_of_sale
    
    return None


# ==================== DÉCORATEURS DE PERMISSIONS ====================

def admin_required(view_func):
    """
    Décorateur pour restreindre l'accès aux ADMIN uniquement.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('inventory:login')
        if not is_admin(request.user):
            messages.error(request, "⛔ Accès refusé. Cette action nécessite les privilèges d'administrateur.")
            return redirect('inventory:login')
        return view_func(request, *args, **kwargs)
    
    return wrapper


def superuser_required(view_func):
    """
    Décorateur pour restreindre l'accès aux SUPERUSER et ADMIN.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('inventory:login')
        if not is_superuser_or_admin(request.user):
            messages.error(request, "⛔ Accès refusé. Cette action nécessite les privilèges de super-utilisateur.")
            return redirect('inventory:login')
        return view_func(request, *args, **kwargs)
    
    return wrapper


def staff_required(view_func):
    """
    Décorateur pour restreindre l'accès aux utilisateurs authentifiés (STAFF et au-dessus).
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('inventory:login')
        if not is_staff_or_above(request.user):
            messages.error(request, "⛔ Accès refusé. Vous devez être membre du personnel.")
            return redirect('inventory:login')
        return view_func(request, *args, **kwargs)
    
    return wrapper


def permission_required_with_message(permission_check_func, error_message=None):
    """
    Décorateur générique pour vérifier les permissions avec message personnalisé.
    
    Args:
        permission_check_func: Fonction qui prend (user) et retourne bool
        error_message: Message d'erreur personnalisé
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not permission_check_func(request.user):
                msg = error_message or "⛔ Accès refusé. Vous n'avez pas les permissions nécessaires."
                messages.error(request, msg)
                return redirect('inventory:dashboard')
            return view_func(request, *args, **kwargs)
        
        from django.contrib.auth.decorators import login_required
        return login_required(wrapper)
    
    return decorator


# ==================== MIXINS POUR VUES BASÉES SUR CLASSES ====================

class AdminRequiredMixin:
    """
    Mixin pour restreindre l'accès aux ADMIN uniquement.
    """
    def dispatch(self, request, *args, **kwargs):
        if not is_admin(request.user):
            messages.error(request, "⛔ Accès refusé. Cette action nécessite les privilèges d'administrateur.")
            return redirect('inventory:dashboard')
        return super().dispatch(request, *args, **kwargs)


class SuperuserRequiredMixin:
    """
    Mixin pour restreindre l'accès aux SUPERUSER et ADMIN.
    """
    def dispatch(self, request, *args, **kwargs):
        if not is_superuser_or_admin(request.user):
            messages.error(request, "⛔ Accès refusé. Cette action nécessite les privilèges de super-utilisateur.")
            return redirect('inventory:dashboard')
        return super().dispatch(request, *args, **kwargs)


class StaffRequiredMixin:
    """
    Mixin pour restreindre l'accès aux utilisateurs authentifiés (STAFF et au-dessus).
    """
    def dispatch(self, request, *args, **kwargs):
        if not is_staff_or_above(request.user):
            messages.error(request, "⛔ Accès refusé. Vous devez être membre du personnel.")
            return redirect('inventory:dashboard')
        return super().dispatch(request, *args, **kwargs)


class POSFilterMixin:
    """
    Mixin pour filtrer automatiquement les querysets par point de vente pour STAFF.
    
    Usage:
        class MyView(POSFilterMixin, ListView):
            model = Invoice
            pos_field = 'point_of_sale'  # Nom du champ ForeignKey vers PointOfSale
    """
    pos_field = 'point_of_sale'  # Peut être surchargé dans la vue
    
    def get_queryset(self):
        queryset = super().get_queryset()
        return filter_queryset_by_pos(queryset, self.request.user, self.pos_field)


# ==================== UTILITAIRES DE FILTRAGE ====================

def filter_queryset_by_pos(queryset, user, pos_field='point_of_sale'):
    """
    Filtre un queryset par point de vente pour les utilisateurs STAFF.
    Les ADMIN et SUPERUSER voient tout.
    
    Args:
        queryset: QuerySet Django à filtrer
        user: Utilisateur Django
        pos_field: Nom du champ ForeignKey vers PointOfSale
    
    Returns:
        QuerySet filtré
    """
    role = get_user_role(user)
    
    # ADMIN et SUPERUSER voient tout
    if role in ['ADMIN', 'SUPERUSER']:
        return queryset
    
    # STAFF ne voit que son point de vente
    if role == 'STAFF':
        user_pos = get_user_pos(user)
        if user_pos:
            # Construire le filtre dynamiquement
            filter_kwargs = {pos_field: user_pos}
            return queryset.filter(**filter_kwargs)
        else:
            # Si pas de POS assigné, ne rien montrer
            return queryset.none()
    
    # Utilisateur sans rôle : ne rien montrer
    return queryset.none()


def can_modify_object(user, obj, check_pos=True):
    """
    Vérifie si un utilisateur peut modifier un objet.
    
    Args:
        user: Utilisateur Django
        obj: Objet à modifier
        check_pos: Si True, vérifie aussi le point de vente pour STAFF
    
    Returns:
        bool
    """
    role = get_user_role(user)
    
    # ADMIN peut tout modifier
    if role == 'ADMIN':
        return True
    
    # SUPERUSER peut modifier (sauf utilisateurs)
    if role == 'SUPERUSER':
        # Ne peut pas modifier les utilisateurs
        from django.contrib.auth.models import User
        if isinstance(obj, User):
            return False
        return True
    
    # STAFF a des restrictions
    if role == 'STAFF':
        # Vérifier le point de vente si demandé
        if check_pos and hasattr(obj, 'point_of_sale'):
            user_pos = get_user_pos(user)
            if user_pos and obj.point_of_sale == user_pos:
                # Peut modifier certains objets de son POS
                from .models import Invoice, Payment, Client
                if isinstance(obj, (Invoice, Payment, Client)):
                    # Vérifications supplémentaires pour les factures
                    if isinstance(obj, Invoice):
                        # Ne peut modifier que les brouillons
                        return obj.status == 'draft'
                    return True
        
        return False
    
    return False


def can_delete_object(user, obj):
    """
    Vérifie si un utilisateur peut supprimer un objet.
    
    Args:
        user: Utilisateur Django
        obj: Objet à supprimer
    
    Returns:
        bool
    """
    role = get_user_role(user)
    
    # Seul ADMIN peut supprimer
    if role == 'ADMIN':
        return True
    
    # SUPERUSER peut supprimer certains objets
    if role == 'SUPERUSER':
        from django.contrib.auth.models import User
        from .models import Product, Category, PointOfSale, StockMovement
        
        # Ne peut pas supprimer : User, Product, Category, PointOfSale, StockMovement
        forbidden_types = (User, Product, Category, PointOfSale, StockMovement)
        if isinstance(obj, forbidden_types):
            return False
        
        return True
    
    # STAFF ne peut rien supprimer
    return False


def can_create_object(user, model_class):
    """
    Vérifie si un utilisateur peut créer un objet d'un certain type.
    
    Args:
        user: Utilisateur Django
        model_class: Classe du modèle
    
    Returns:
        bool
    """
    role = get_user_role(user)
    
    # ADMIN peut tout créer
    if role == 'ADMIN':
        return True
    
    # SUPERUSER peut créer (sauf utilisateurs)
    if role == 'SUPERUSER':
        from django.contrib.auth.models import User
        if model_class == User:
            return False
        return True
    
    # STAFF peut créer certains objets
    if role == 'STAFF':
        from .models import Invoice, Payment, Client
        allowed_models = (Invoice, Payment, Client)
        return model_class in allowed_models
    
    return False


def validate_discount(user, discount_value):
    """
    Valide le montant de remise selon le rôle de l'utilisateur.
    
    Args:
        user: Utilisateur Django
        discount_value: Valeur de la remise en pourcentage
    
    Returns:
        tuple: (bool, str) - (est_valide, message_erreur)
    """
    role = get_user_role(user)
    
    # ADMIN et SUPERUSER : pas de limite
    if role in ['ADMIN', 'SUPERUSER']:
        return True, ""
    
    # STAFF : limite à 10%
    if role == 'STAFF':
        if discount_value > 10:
            return False, "Le personnel ne peut appliquer que des remises ≤ 10%"
        return True, ""
    
    return False, "Vous n'avez pas les permissions pour appliquer des remises"


# ==================== UTILITAIRES POUR TEMPLATES ====================

def get_user_permissions_context(user):
    """
    Retourne un dictionnaire de contexte avec les permissions de l'utilisateur.
    Utile pour passer aux templates.
    
    Returns:
        dict: Contexte avec les permissions
    """
    role = get_user_role(user)
    
    return {
        'user_role': role,
        'is_admin': role == 'ADMIN',
        'is_superuser': role in ['ADMIN', 'SUPERUSER'],
        'is_staff': role in ['ADMIN', 'SUPERUSER', 'STAFF'],
        'user_pos': get_user_pos(user),
        'can_manage_users': role == 'ADMIN',
        'can_delete_products': role == 'ADMIN',
        'can_modify_settings': role == 'ADMIN',
        'can_create_products': role in ['ADMIN', 'SUPERUSER'],
        'can_manage_stock': role in ['ADMIN', 'SUPERUSER'],
        'can_export_reports': role in ['ADMIN', 'SUPERUSER'],
        'can_view_finances': role in ['ADMIN', 'SUPERUSER'],
    }


def can_view_finances(user):
    """
    Vérifie si l'utilisateur peut voir les données financières sensibles
    (prix d'achat, marges, bénéfices, etc.)
    
    Args:
        user: Utilisateur Django
    
    Returns:
        bool
    """
    role = get_user_role(user)
    return role in ['ADMIN', 'SUPERUSER']
