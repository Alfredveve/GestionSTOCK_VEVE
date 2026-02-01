import os
import django
import sys

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from sales.models import Order

def verify():
    all_o = Order.objects.all()
    print(f"Total: {all_o.count()}")
    
    print(f"DB Unpaid: {Order.objects.filter(payment_status='unpaid').count()}")
    print(f"DB Partial: {Order.objects.filter(payment_status='partial').count()}")
    print(f"DB Paid: {Order.objects.filter(payment_status='paid').count()}")
    
    c_part = [o for o in all_o if o.amount_paid > 0 and o.amount_paid < o.total_amount]
    c_unpaid = [o for o in all_o if o.amount_paid == 0]
    
    print(f"Calc Unpaid: {len(c_unpaid)}")
    print(f"Calc Partial: {len(c_part)}")
    
    # Fix?
    # if len(c_part) > 0:
    #     for o in c_part:
    #         o.update_totals()
    #         print(f"Updated {o.order_number}")

if __name__ == "__main__":
    verify()
