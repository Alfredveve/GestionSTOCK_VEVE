from django.db import migrations

def fix_pos_sequence(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        with schema_editor.connection.cursor() as cursor:
            cursor.execute("SELECT setval(pg_get_serial_sequence('inventory_pointofsale', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM inventory_pointofsale;")
    elif schema_editor.connection.vendor == 'sqlite':
        # SQLite handles this automatically or doesn't have the same sequence issue
        pass

class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0030_alter_category_options_alter_expense_options_and_more'),
    ]

    operations = [
        migrations.RunPython(fix_pos_sequence),
    ]
