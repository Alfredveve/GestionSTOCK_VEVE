from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db.models import Count
from django.db import connection

class Command(BaseCommand):
    help = 'Affiche l\'état de la base de données et identifie les doublons'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("--- État de la Base de Données ---"))
        
        # 1. Database Info
        with connection.cursor() as cursor:
            cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
            tables = cursor.fetchall()
            self.stdout.write(f"Nombre de tables : {len(tables)}")
            
            # Show top 5 tables by size (Postgres specific)
            try:
                cursor.execute("""
                    SELECT relname AS "table",
                           pg_size_pretty(pg_total_relation_size(relid)) AS "size"
                    FROM pg_catalog.pg_statio_user_tables
                    ORDER BY pg_total_relation_size(relid) DESC
                    LIMIT 5;
                """)
                top_tables = cursor.fetchall()
                self.stdout.write("\nTop 5 tables par taille :")
                for table, size in top_tables:
                    self.stdout.write(f"  - {table}: {size}")
            except:
                pass # Fallback for non-postgres if needed

        # 2. Duplicate Users (logic from find_duplicates.py)
        self.stdout.write(self.style.MIGRATE_HEADING("\n--- Doublons d'Emails ---"))
        duplicates = User.objects.values('email').annotate(count=Count('id')).filter(count__gt=1).exclude(email='')
        
        if not duplicates:
            self.stdout.write(self.style.SUCCESS("Aucun email en double trouvé."))
        else:
            for entry in duplicates:
                email = entry['email']
                count = entry['count']
                self.stdout.write(f"Email: {email} ({count} fois)")
                users = User.objects.filter(email=email).order_by('date_joined')
                for user in users:
                    self.stdout.write(f"  - ID: {user.id}, Username: {user.username}, Staff: {user.is_staff}")

        # 3. App Stats
        from inventory.models import Product, Invoice
        from sales.models import Order
        
        self.stdout.write(self.style.MIGRATE_HEADING("\n--- Statistiques Applicatives ---"))
        self.stdout.write(f"Produits : {Product.objects.count()}")
        self.stdout.write(f"Commandes : {Order.objects.count()}")
        self.stdout.write(f"Factures : {Invoice.objects.count()}")
