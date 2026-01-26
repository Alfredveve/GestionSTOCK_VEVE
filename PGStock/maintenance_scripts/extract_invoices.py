from inventory.models import Quote, Invoice
import sys

with open('db_extraction_all_invoices.txt', 'w', encoding='utf-8') as f:
    f.write("--- ALL INVOICES ---\n")
    for i in Invoice.objects.all():
        f.write(f"ID: {i.pk}, Num: {i.invoice_number}, Status: {i.status}, Notes: {repr(i.notes)}\n")
        
    f.write("\n--- QUOTES ---\n")
    for q in Quote.objects.all():
        f.write(f"ID: {q.pk}, Num: {q.quote_number}, Status: {q.status}\n")
