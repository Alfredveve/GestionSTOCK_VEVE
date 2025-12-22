# Generated migration for setting up user groups and permissions

from django.db import migrations
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType


def create_groups_and_permissions(apps, schema_editor):
    """
    Crée les groupes SUPERUSER et STAFF avec leurs permissions appropriées.
    """
    # Créer les groupes
    superuser_group, _ = Group.objects.get_or_create(name='SUPERUSER')
    staff_group, _ = Group.objects.get_or_create(name='STAFF')
    
    # Récupérer tous les content types de l'application inventory
    app_label = 'inventory'
    
    # Permissions pour SUPERUSER (tout sauf User)
    superuser_permissions = []
    
    # Liste des modèles pour SUPERUSER (tous sauf User)
    superuser_models = [
        'category', 'supplier', 'client', 'product', 'inventory', 
        'pointofsale', 'stockmovement', 'invoice', 'invoiceitem',
        'receipt', 'receiptitem', 'payment', 'quote', 'quoteitem',
        'settings', 'userprofile'
    ]
    
    for model_name in superuser_models:
        try:
            content_type = ContentType.objects.get(app_label=app_label, model=model_name)
            # Ajouter les permissions add, change, view
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
    
    # Assigner les permissions au groupe SUPERUSER
    superuser_group.permissions.set(superuser_permissions)
    
    # Permissions pour STAFF (limitées)
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
    
    # Assigner les permissions au groupe STAFF
    staff_group.permissions.set(staff_permissions)


def remove_groups(apps, schema_editor):
    """
    Supprime les groupes créés (pour rollback).
    """
    Group.objects.filter(name__in=['SUPERUSER', 'STAFF']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0010_passwordresetcode'),  # Ajuster selon votre dernière migration
    ]

    operations = [
        migrations.RunPython(create_groups_and_permissions, remove_groups),
    ]
