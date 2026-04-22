from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Permission
from django.contrib.contenttypes.models import ContentType

class Command(BaseCommand):
    help = 'Crée un super-utilisateur par défaut et répare les permissions si nécessaire'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='admin', help='Nom d\'utilisateur')
        parser.add_argument('--password', type=str, default='veve', help='Mot de passe')
        parser.add_argument('--email', type=str, default='admin@pgstock.com', help='Email')

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        email = options['email']

        user, created = User.objects.get_or_create(
            username=username,
            defaults={'email': email, 'is_superuser': True, 'is_staff': True}
        )

        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Utilisateur "{username}" créé avec succès.'))
        else:
            self.stdout.write(self.style.WARNING(f'L\'utilisateur "{username}" existe déjà.'))

        # Fix permissions (logic from fix_admin_permissions.py)
        if user.is_superuser:
            self.stdout.write("Vérification des permissions...")
            # For a superuser, they already have all permissions, 
            # but ensure they are actually marked as superuser
            if not user.is_superuser or not user.is_staff:
                user.is_superuser = True
                user.is_staff = True
                user.save()
                self.stdout.write(self.style.SUCCESS(f'Droits admin restaurés pour {username}.'))
