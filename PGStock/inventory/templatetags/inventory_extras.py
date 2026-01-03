from django import template

register = template.Library()

@register.filter
def multiply(value, arg):
    try:
        return float(value) * float(arg)
    except (ValueError, TypeError):
        return 0


@register.filter
def currency_symbol(currency_code):
    """Return the currency symbol for a given currency code"""
    # Application now only uses GNF
    return 'GNF'


@register.filter
def format_currency(amount, user=None):
    """Format amount with currency symbol - Masks for STAFF users"""
    # Import here to avoid circular imports
    from inventory.permissions import can_view_finances
    
    # Check if user can view finances
    # Handle case where user is not a User object (e.g. passed as string 'GNF')
    if hasattr(user, 'is_authenticated') and user and not can_view_finances(user):
        return "### ###,## GNF"
    
    try:
        amount = float(amount)
        # Format with 0 decimals if integer, else 2
        if amount.is_integer():
             formatted = f"{int(amount)}"
             decimal_part = ""
        else:
            formatted = f"{amount:.2f}"
            parts = formatted.split('.')
            formatted = parts[0]
            decimal_part = f",{parts[1]}"
            
        # Add spaces as thousand separators
        integer_with_spaces = ''
        for i, digit in enumerate(reversed(formatted)):
            if i > 0 and i % 3 == 0:
                integer_with_spaces = ' ' + integer_with_spaces
            integer_with_spaces = digit + integer_with_spaces
        
        return f"{integer_with_spaces}{decimal_part} GNF"
    except (ValueError, TypeError):
        return "0 GNF"


@register.filter
def get_item(dictionary, key):
    """
    Custom template filter to get an item from a dictionary.
    Usage: {{ dict|get_item:key }}
    """
    if dictionary is None:
        return None
    return dictionary.get(str(key))


@register.filter
def stock_package_display(quantity, units_per_box):
    """
    Format quantity in Colis and Units.
    Usage: {{ quantity|stock_package_display:units_per_box }}
    """
    try:
        qty = int(quantity)
        upb = int(units_per_box)
        if upb > 1:
            colis = qty // upb
            unites = qty % upb
            return f"{colis} Colis, {unites} Unité(s)"
        return f"{qty} Unité(s)"
    except (ValueError, TypeError):
        return f"{quantity} Unité(s)"
