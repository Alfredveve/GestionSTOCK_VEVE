"""
Commande de gestion pour configurer les permissions et groupes d'utilisateurs
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission, User
from django.contrib.contenttypes.models import ContentType
from inventory.models import UserProfile, PointOfSale


class Command(BaseCommand):
    help = 'Configure les groupes et permissions pour GestionSTOCK'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-test-users',
            action='store_true',
            help='Créer des utilisateurs de test pour chaque rôle',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🔧 Configuration des permissions...'))
        
        # Créer les groupes
        self.create_groups()
        
        # Créer des utilisateurs de test si demandé
        if options['create_test_users']:
            self.create_test_users()
        
        self.stdout.write(self.style.SUCCESS('✅ Configuration terminée!'))

    def create_groups(self):
        """Crée les groupes SUPERUSER et STAFF avec leurs permissions"""
        
        # Créer les groupes
        superuser_group, created = Group.objects.get_or_create(name='SUPERUSER')
        if created:
            self.stdout.write(self.style.SUCCESS('  ✓ Groupe SUPERUSER créé'))
        else:
            self.stdout.write('  ℹ Groupe SUPERUSER existe déjà')
        
        staff_group, created = Group.objects.get_or_create(name='STAFF')
        if created:
            self.stdout.write(self.style.SUCCESS('  ✓ Groupe STAFF créé'))
        else:
            self.stdout.write('  ℹ Groupe STAFF existe déjà')
        
        # Configurer les permissions pour SUPERUSER
        app_label = 'inventory'
        superuser_permissions = []
        
        superuser_models = [
            'category', 'supplier', 'client', 'product', 'inventory', 
            'pointofsale', 'stockmovement', 'invoice', 'invoiceitem',
            'receipt', 'receiptitem', 'payment', 'quote', 'quoteitem',
            'settings', 'userprofile'
        ]
        
        for model_name in superuser_models:
            try:
                content_type = ContentType.objects.get(app_label=app_label, model=model_name)
                for perm_type in ['add', 'change', 'view', 'delete']:
                    try:
                        perm = Permission.objects.get(
                            content_type=content_type,
                            codename=f'{perm_type}_{model_name}'
                        )
                        superuser_permissions.append(perm)
                    except Permission.DoesNotExist:
                        pass
            except ContentType.DoesNotExist:
                pass
        
        superuser_group.permissions.set(superuser_permissions)
        self.stdout.write(self.style.SUCCESS(f'  ✓ {len(superuser_permissions)} permissions assignées à SUPERUSER'))
        
        # Configurer les permissions pour STAFF
        staff_permissions = []
        
        # STAFF peut voir tout
        view_models = [
            'category', 'supplier', 'client', 'product', 'inventory',
            'pointofsale', 'stockmovement', 'invoice', 'invoiceitem',
            'receipt', 'receiptitem', 'payment', 'quote', 'quoteitem'
        ]
        
        for model_name in view_models:
            try:
                content_type = ContentType.objects.get(app_label=app_label, model=model_name)
                perm = Permission.objects.get(
                    content_type=content_type,
                    codename=f'view_{model_name}'
                )
                staff_permissions.append(perm)
            except (ContentType.DoesNotExist, Permission.DoesNotExist):
                pass
        
        # STAFF peut ajouter/modifier certains objets
        staff_modify_models = ['invoice', 'invoiceitem', 'payment', 'client']
        
        for model_name in staff_modify_models:
            try:
                content_type = ContentType.objects.get(app_label=app_label, model=model_name)
                for perm_type in ['add', 'change']:
                    try:
                        perm = Permission.objects.get(
                            content_type=content_type,
                            codename=f'{perm_type}_{model_name}'
                        )
                        staff_permissions.append(perm)
                    except Permission.DoesNotExist:
                        pass
            except ContentType.DoesNotExist:
                pass
        
        staff_group.permissions.set(staff_permissions)
        self.stdout.write(self.style.SUCCESS(f'  ✓ {len(staff_permissions)} permissions assignées à STAFF'))

    def create_test_users(self):
        """Crée des utilisateurs de test pour chaque rôle"""
        
        self.stdout.write(self.style.SUCCESS('\n👥 Création des utilisateurs de test...'))
        
        # Créer un point de vente de test si nécessaire
        pos, _ = PointOfSale.objects.get_or_create(
            code='TEST-POS',
            defaults={
                'name': 'Point de Vente Test',
                'is_active': True
            }
        )
        
        # Utilisateur ADMIN
        admin_user, created = User.objects.get_or_create(
            username='admin_test',
            defaults={
                'email': 'admin@test.com',
                'is_superuser': True,
                'is_staff': True,
                'first_name': 'Admin',
                'last_name': 'Test'
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS('  ✓ Utilisateur ADMIN créé (admin_test / admin123)'))
        else:
            self.stdout.write('  ℹ Utilisateur ADMIN existe déjà')
        
        # Utilisateur SUPERUSER
        superuser, created = User.objects.get_or_create(
            username='superuser_test',
            defaults={
                'email': 'superuser@test.com',
                'is_staff': False,
                'first_name': 'Super',
                'last_name': 'User'
            }
        )
        if created:
            superuser.set_password('super123')
            superuser.save()
            superuser.groups.add(Group.objects.get(name='SUPERUSER'))
            self.stdout.write(self.style.SUCCESS('  ✓ Utilisateur SUPERUSER créé (superuser_test / super123)'))
        else:
            superuser.groups.add(Group.objects.get(name='SUPERUSER'))
            self.stdout.write('  ℹ Utilisateur SUPERUSER existe déjà')
        
        # Utilisateur STAFF
        staff_user, created = User.objects.get_or_create(
            username='staff_test',
            defaults={
                'email': 'staff@test.com',
                'is_staff': False,
                'first_name': 'Staff',
                'last_name': 'Member'
            }
        )
        if created:
            staff_user.set_password('staff123')
            staff_user.save()
            staff_user.groups.add(Group.objects.get(name='STAFF'))
            
            # Assigner un point de vente
            profile, _ = UserProfile.objects.get_or_create(user=staff_user)
            profile.point_of_sale = pos
            profile.save()
            
            self.stdout.write(self.style.SUCCESS('  ✓ Utilisateur STAFF créé (staff_test / staff123)'))
            self.stdout.write(self.style.SUCCESS(f'    Assigné au POS: {pos.name}'))
        else:
            staff_user.groups.add(Group.objects.get(name='STAFF'))
            self.stdout.write('  ℹ Utilisateur STAFF existe déjà')
        
        self.stdout.write(self.style.SUCCESS('\n📋 Résumé des utilisateurs de test:'))
        self.stdout.write('  • admin_test / admin123 (ADMIN)')
        self.stdout.write('  • superuser_test / super123 (SUPERUSER)')
        self.stdout.write('  • staff_test / staff123 (STAFF)')
