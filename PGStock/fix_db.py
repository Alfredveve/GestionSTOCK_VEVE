
import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

with connection.cursor() as cursor:
    cursor.execute("ALTER TABLE inventory_product DROP COLUMN quantity_per_carton")
    print("Dropped quantity_per_carton")
    # Also dropping carton_price as it was from the deleted migration 0022
    cursor.execute("ALTER TABLE inventory_product DROP COLUMN carton_price")
    print("Dropped carton_price")
