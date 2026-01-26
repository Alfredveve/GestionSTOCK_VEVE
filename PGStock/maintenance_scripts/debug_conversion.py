from django.contrib.auth.models import User
from inventory.models import Quote, PointOfSale
from inventory.services import InvoiceService
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

def debug_conversion():
    user = User.objects.first()
    pos = PointOfSale.objects.first()
    quote = Quote.objects.get(pk=2)
    service = InvoiceService()
    
    print(f"Before conversion: Quote status = {quote.status}")
    
    try:
        invoice = service.convert_quote_to_invoice(quote, user, pos)
        print(f"Conversion successful: {invoice.invoice_number}")
        
        # Reload quote from DB
        quote.refresh_from_db()
        print(f"After conversion: Quote status = {quote.status}")
        
    except Exception as e:
        print(f"Conversion failed: {str(e)}")

if __name__ == "__main__":
    debug_conversion()
