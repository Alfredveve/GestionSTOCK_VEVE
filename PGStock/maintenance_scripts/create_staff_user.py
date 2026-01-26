"""
Script pour créer un utilisateur STAFF de test et vérifier le masquage des données financières
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

from django.contrib.auth.models import User, Group
from inventory.models import PointOfSale
from inventory.permissions import get_user_role, can_view_finances

def create_staff_test_user():
    """Crée un utilisateur STAFF de test"""
    
    # Vérifier si l'utilisateur existe déjà
    username = 'staff_test'
    if User.objects.filter(username=username).exists():
        print(f"✓ L'utilisateur '{username}' existe déjà")
        user = User.objects.get(username=username)
    else:
        # Créer l'utilisateur
        user = User.objects.create_user(
            username=username,
            password='staff123',
            email='staff@test.com',
            first_name='Staff',
            last_name='Test',
            is_staff=True,  # Marquer comme staff Django
            is_superuser=False
        )
        print(f"✓ Utilisateur '{username}' créé avec succès")
    
    # Ajouter au groupe STAFF
    staff_group, created = Group.objects.get_or_create(name='STAFF')
    if not user.groups.filter(name='STAFF').exists():
        user.groups.add(staff_group)
        print(f"✓ Utilisateur ajouté au groupe STAFF")
    
    # Assigner un point de vente si disponible
    if PointOfSale.objects.exists():
        pos = PointOfSale.objects.first()
        if hasattr(user, 'profile'):
            user.profile.point_of_sale = pos
            user.profile.save()
            print(f"✓ Point de vente '{pos.name}' assigné")
    
    return user

def verify_permissions():
    """Vérifie les permissions des différents utilisateurs"""
    print("\n" + "="*60)
    print("VÉRIFICATION DES PERMISSIONS")
    print("="*60)
    
    # Vérifier l'utilisateur STAFF
    try:
        staff_user = User.objects.get(username='staff_test')
        role = get_user_role(staff_user)
        can_view = can_view_finances(staff_user)
        
        print(f"\n👤 Utilisateur: staff_test")
        print(f"   Rôle: {role}")
        print(f"   Peut voir les finances: {can_view}")
        print(f"   ➜ Montants affichés: {'### ###,## GNF' if not can_view else 'Montants réels'}")
    except User.DoesNotExist:
        print("\n❌ Utilisateur staff_test n'existe pas")
    
    # Vérifier les utilisateurs ADMIN
    admin_users = User.objects.filter(is_superuser=True)
    if admin_users.exists():
        admin = admin_users.first()
        role = get_user_role(admin)
        can_view = can_view_finances(admin)
        
        print(f"\n👤 Utilisateur: {admin.username} (ADMIN)")
        print(f"   Rôle: {role}")
        print(f"   Peut voir les finances: {can_view}")
        print(f"   ➜ Montants affichés: {'Montants réels' if can_view else '### ###,## GNF'}")

def print_login_instructions():
    """Affiche les instructions de connexion"""
    print("\n" + "="*60)
    print("INSTRUCTIONS POUR TESTER LE MASQUAGE")
    print("="*60)
    print("\n1. Ouvrez votre navigateur et allez sur:")
    print("   http://127.0.0.1:8000/accounts/logout/")
    print("\n2. Connectez-vous avec:")
    print("   Username: staff_test")
    print("   Password: staff123")
    print("\n3. Testez les pages suivantes:")
    print("   • http://127.0.0.1:8000/inventory/finance/profit-report/")
    print("     ➜ Devrait être bloqué avec message d'erreur")
    print("\n   • http://127.0.0.1:8000/inventory/finance/expenses/")
    print("     ➜ Devrait être bloqué avec message d'erreur")
    print("\n   • Formulaire de produit (création/édition)")
    print("     ➜ Section 'Tarification & Marges' devrait être masquée")
    print("\n4. Pour voir les montants normalement, reconnectez-vous")
    print("   en tant qu'ADMIN")
    print("="*60)

if __name__ == '__main__':
    print("🔧 Création de l'utilisateur STAFF de test...\n")
    
    user = create_staff_test_user()
    verify_permissions()
    print_login_instructions()
    
    print("\n✅ Configuration terminée!")
