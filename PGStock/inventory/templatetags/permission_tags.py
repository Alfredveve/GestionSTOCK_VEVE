"""
Template tags personnalisés pour les permissions
"""

from django import template
from django.contrib.auth.models import User
from inventory.permissions import (
    get_user_role, 
    can_modify_object, 
    can_delete_object,
    can_create_object,
    get_user_permissions_context,
    can_view_finances as check_finances_perm
)

register = template.Library()


@register.simple_tag
def user_role(user):
    """
    Retourne le rôle de l'utilisateur.
    
    Usage: {% user_role user %}
    """
    return get_user_role(user)


@register.simple_tag
def user_permissions(user):
    """
    Retourne un dictionnaire de permissions pour l'utilisateur.
    
    Usage: {% user_permissions user as perms %}
    """
    return get_user_permissions_context(user)


@register.filter
def can_create(user, model_name):
    """
    Vérifie si l'utilisateur peut créer un objet du type spécifié.
    
    Usage: {{ user|can_create:"Product" }}
    """
    try:
        from inventory import models
        model_class = getattr(models, model_name)
        return can_create_object(user, model_class)
    except (AttributeError, ImportError):
        return False


@register.filter
def can_modify(user, obj):
    """
    Vérifie si l'utilisateur peut modifier un objet.
    
    Usage: {{ user|can_modify:product }}
    """
    if obj is None:
        return False
    return can_modify_object(user, obj)


@register.filter
def can_delete(user, obj):
    """
    Vérifie si l'utilisateur peut supprimer un objet.
    
    Usage: {{ user|can_delete:product }}
    """
    if obj is None:
        return False
    return can_delete_object(user, obj)


@register.filter
def has_role(user, role_name):
    """
    Vérifie si l'utilisateur a un rôle spécifique.
    
    Usage: {{ user|has_role:"ADMIN" }}
    """
    return get_user_role(user) == role_name.upper()


@register.filter
def is_admin(user):
    """
    Vérifie si l'utilisateur est ADMIN.
    
    Usage: {{ user|is_admin }}
    """
    return get_user_role(user) == 'ADMIN'


@register.filter
def is_superuser(user):
    """
    Vérifie si l'utilisateur est SUPERUSER ou ADMIN.
    
    Usage: {{ user|is_superuser }}
    """
    role = get_user_role(user)
    return role in ['ADMIN', 'SUPERUSER']


@register.filter
def is_staff(user):
    """
    Vérifie si l'utilisateur est STAFF, SUPERUSER ou ADMIN.
    
    Usage: {{ user|is_staff }}
    """
    role = get_user_role(user)
    return role in ['ADMIN', 'SUPERUSER', 'STAFF']


@register.filter
def can_view_finances(user):
    """
    Vérifie si l'utilisateur peut voir les finances.
    
    Usage: {{ user|can_view_finances }}
    """
    return check_finances_perm(user)


@register.inclusion_tag('inventory/partials/role_badge.html')
def role_badge(user):
    """
    Affiche un badge avec le rôle de l'utilisateur.
    
    Usage: {% role_badge user %}
    """
    role = get_user_role(user)
    
    badge_classes = {
        'ADMIN': 'badge-error',
        'SUPERUSER': 'badge-warning',
        'STAFF': 'badge-success',
    }
    
    badge_icons = {
        'ADMIN': '👑',
        'SUPERUSER': '⭐',
        'STAFF': '👤',
    }
    
    return {
        'role': role,
        'badge_class': badge_classes.get(role, 'badge-ghost'),
        'badge_icon': badge_icons.get(role, ''),
    }


@register.simple_tag
def can_access_module(user, module_name):
    """
    Vérifie si l'utilisateur peut accéder à un module spécifique.
    
    Usage: {% can_access_module user "users" %}
    """
    role = get_user_role(user)
    
    # Définir les modules accessibles par rôle
    module_access = {
        'users': ['ADMIN'],
        'settings': ['ADMIN'],
        'reports': ['ADMIN', 'SUPERUSER'],
        'products': ['ADMIN', 'SUPERUSER', 'STAFF'],
        'inventory': ['ADMIN', 'SUPERUSER', 'STAFF'],
        'invoices': ['ADMIN', 'SUPERUSER', 'STAFF'],
        'receipts': ['ADMIN', 'SUPERUSER', 'STAFF'],
        'clients': ['ADMIN', 'SUPERUSER', 'STAFF'],
        'suppliers': ['ADMIN', 'SUPERUSER', 'STAFF'],
        'stock_movements': ['ADMIN', 'SUPERUSER', 'STAFF'],
        'payments': ['ADMIN', 'SUPERUSER', 'STAFF'],
        'pos': ['ADMIN', 'SUPERUSER', 'STAFF'],
    }
    
    allowed_roles = module_access.get(module_name, [])
    return role in allowed_roles


@register.filter
def mask_amount(value, user):
    """
    Masque un montant pour les utilisateurs STAFF.
    Les ADMIN et SUPERUSER voient le montant réel.
    
    Usage: {{ amount|mask_amount:user }}
    """
    if check_finances_perm(user):
        return value
    return "### ###,##"


@register.filter
def mask_currency(value, user):
    """
    Masque un montant avec la devise pour les utilisateurs STAFF.
    Les ADMIN et SUPERUSER voient le montant réel.
    
    Usage: {{ amount|mask_currency:user }}
    """
    if check_finances_perm(user):
        try:
            # Conversion en float pour gérer les calculs ou chaînes numériques
            amount = float(value)
            
            # Formatage : 0 décimale si entier, 2 sinon
            if amount.is_integer():
                 formatted = f"{int(amount)}"
                 decimal_part = ""
            else:
                # Formatage avec 2 décimales et arrondi
                formatted = f"{amount:.2f}"
                parts = formatted.split('.')
                formatted = parts[0]
                decimal_part = f",{parts[1]}"
                
            # Ajout des espaces comme séparateurs de milliers
            integer_with_spaces = ''
            for i, digit in enumerate(reversed(formatted)):
                if i > 0 and i % 3 == 0:
                    integer_with_spaces = ' ' + integer_with_spaces
                integer_with_spaces = digit + integer_with_spaces
            
            return f"{integer_with_spaces}{decimal_part} GNF"
        except (ValueError, TypeError):
            # En cas d'erreur, retourner la valeur brute avec GNF
            return f"{value} GNF"
    return "### ###,## GNF"

