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
