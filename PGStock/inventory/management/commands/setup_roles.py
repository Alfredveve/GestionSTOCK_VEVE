from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from inventory.models import Product, Inventory, Supplier, Client, Invoice, Receipt, StockMovement

class Command(BaseCommand):
    help = 'Creates default roles and permissions'

    def handle(self, *args, **options):
        # Create Groups
        admin_group, created = Group.objects.get_or_create(name='Admin')
        manager_group, created = Group.objects.get_or_create(name='Manager')
        staff_group, created = Group.objects.get_or_create(name='Staff')

        self.stdout.write(self.style.SUCCESS('Groups created/verified'))

        # Define permissions
        # Admin gets everything by default (superuser), but we can add specific permissions to the group too if needed.
        # For now, we rely on is_superuser or specific checks.

        # Manager Permissions
        manager_permissions = [
            'view_product', 'add_product', 'change_product', 'delete_product',
            'view_inventory', 'change_inventory',
            'view_supplier', 'add_supplier', 'change_supplier',
            'view_client', 'add_client', 'change_client',
            'view_invoice', 'view_receipt', 'add_receipt', 'change_receipt',
            'view_stockmovement', 'add_stockmovement',
        ]
        self.assign_permissions(manager_group, manager_permissions)

        # Staff Permissions
        staff_permissions = [
            'view_product',
            'view_client', 'add_client',
            'view_invoice', 'add_invoice', 'change_invoice',
            'view_inventory',
        ]
        self.assign_permissions(staff_group, staff_permissions)

        self.stdout.write(self.style.SUCCESS('Permissions assigned successfully'))

    def assign_permissions(self, group, permission_codenames):
        for codename in permission_codenames:
            try:
                permission = Permission.objects.get(codename=codename)
                group.permissions.add(permission)
            except Permission.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'Permission {codename} not found'))
