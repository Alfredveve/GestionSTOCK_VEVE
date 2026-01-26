from django.core.mail import send_mail
from django.conf import settings
from .models import Settings

def check_and_send_low_stock_alert(product):
    """
    Checks if a product's stock is low and sends an email if enabled.
    """
    # Get settings
    app_settings = Settings.objects.first()
    if not app_settings or not app_settings.email_notifications:
        return

    # Check stock
    try:
        inventory = product.inventory_set.first() # Assuming one inventory per product for now
        if not inventory:
            return

        current_stock = inventory.quantity
        reorder_level = inventory.reorder_level
        
        if current_stock <= reorder_level:
            subject = f'⚠️ Alerte Stock Faible: {product.name}'
            message = f'''
            Le produit "{product.name}" (SKU: {product.sku}) a atteint un niveau critique.
            
            Stock actuel: {current_stock}
            Seuil de réapprovisionnement: {reorder_level}
            
            Veuillez passer commande auprès de {product.supplier.name if product.supplier else "votre fournisseur"}.
            '''
            
            try:
                send_mail(
                    subject,
                    message,
                    'noreply@gestionstock.com',
                    ['admin@gestionstock.com'], # In a real app, this would be dynamic
                    fail_silently=True,
                )
                print(f"Email alert sent for {product.name}")
            except Exception as e:
                print(f"Failed to send email alert: {e}")
    except Exception as e:
        print(f"Error checking stock: {e}")

from rest_framework.views import exception_handler
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom exception handler to handle SimpleJWT exceptions gracefully
    and avoid SystemError issues in DRF.
    """
    # Get the exception class name for robust checking
    exc_class_name = exc.__class__.__name__
    print(f"DEBUG: Catching exception in handler: {exc_class_name}")
    
    # Check for SimpleJWT errors or AuthenticationFailed
    # We also catch SystemError because sometimes DRF/SimpleJWT interactions cause 
    # a SystemError when wrapping the original InvalidToken exception.
    is_simplejwt = exc_class_name in ['InvalidToken', 'TokenError', 'AuthenticationFailed'] or \
                   exc.__class__.__module__.startswith('rest_framework_simplejwt')
    
    # Check if a SystemError is actually masking an InvalidToken
    if isinstance(exc, SystemError) and exc.__cause__:
        cause_name = exc.__cause__.__class__.__name__
        if cause_name in ['InvalidToken', 'TokenError'] or \
           exc.__cause__.__class__.__module__.startswith('rest_framework_simplejwt'):
            is_simplejwt = True
            # Use the cause as the main exception for detail extraction
            exc = exc.__cause__

    if isinstance(exc, (InvalidToken, TokenError, AuthenticationFailed)) or is_simplejwt:
        
        detail_msg = "Token is invalid or expired"
        messages = []
        
        if hasattr(exc, 'detail'):
            if isinstance(exc.detail, dict):
                detail_msg = exc.detail.get('detail', detail_msg)
                messages = exc.detail.get('messages', [])
            elif isinstance(exc.detail, str):
                detail_msg = exc.detail
        
        logger.warning(f"Auth error caught: {exc_class_name} - {detail_msg}")
        
        return Response(
            {
                "detail": detail_msg,
                "code": "token_not_valid",
                "messages": messages
            },
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Handle Django's built-in ValidationError
    from django.core.exceptions import ValidationError as DjangoValidationError
    if isinstance(exc, DjangoValidationError):
        data = exc.message_dict if hasattr(exc, 'message_dict') else {'detail': exc.messages}
        return Response(data, status=status.HTTP_400_BAD_REQUEST)

    # Call REST framework's default exception handler for other exceptions
    response = exception_handler(exc, context)
    
    # Log validation errors for debugging
    if exc_class_name == 'ValidationError' and hasattr(exc, 'detail'):
        print(f"DEBUG: ValidationError Details: {exc.detail}")
    
    # Log unhandled exceptions for debugging
    if response is None:
        logger.error(f"Unhandled exception: {exc_class_name} - {str(exc)}")
    
    return response
