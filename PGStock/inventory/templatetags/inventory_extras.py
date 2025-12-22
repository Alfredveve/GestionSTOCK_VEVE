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
def format_currency(amount, currency_code='GNF'):
    """Format amount with currency symbol - Always displays in GNF format"""
    try:
        amount = float(amount)
        # Format with 2 decimals
        formatted = f"{amount:.2f}"
        # Split into integer and decimal parts
        parts = formatted.split('.')
        integer_part = parts[0]
        decimal_part = parts[1] if len(parts) > 1 else '00'
        
        # Add spaces as thousand separators
        integer_with_spaces = ''
        for i, digit in enumerate(reversed(integer_part)):
            if i > 0 and i % 3 == 0:
                integer_with_spaces = ' ' + integer_with_spaces
            integer_with_spaces = digit + integer_with_spaces
        
        return f"{integer_with_spaces},{decimal_part}GNF"
    except (ValueError, TypeError):
        return "0,00GNF"


@register.filter
def get_item(dictionary, key):
    """
    Custom template filter to get an item from a dictionary.
    Usage: {{ dict|get_item:key }}
    """
    if dictionary is None:
        return None
    return dictionary.get(str(key))
