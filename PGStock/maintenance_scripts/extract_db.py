from inventory.models import Quote, Invoice
import sys

with open('db_extraction.txt', 'w', encoding='utf-8') as f:
    f.write("--- QUOTES ---\n")
    for q in Quote.objects.all():
        f.write(f"ID: {q.pk}, Num: {q.quote_number}, Status: {q.status}\n")
        
    f.write("\n--- INVOICES ---\n")
    for i in Invoice.objects.all():
        # Check if invoice notes mention a quote number
        quote_ref = next((q.quote_number for q in Quote.objects.all() if q.quote_number in (i.notes or "")), None)
        if quote_ref:
            f.write(f"ID: {i.pk}, Num: {i.invoice_number}, Refers to: {quote_ref}, Status: {i.status}, Notes: {i.notes}\n")
        elif i.notes and "Devis" in i.notes:
            f.write(f"ID: {i.pk}, Num: {i.invoice_number}, Notes: {i.notes}\n")
