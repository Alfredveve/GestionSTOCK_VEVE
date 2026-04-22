import os
import django
import sys
from decimal import Decimal

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

import sys
try:
    # Gestion de compatibilité lxml (conflit metaclass Python 3.12)
    lxml_backup = sys.modules.get('lxml')
    sys.modules['lxml'] = None
    import openpyxl
finally:
    if lxml_backup:
        sys.modules['lxml'] = lxml_backup
    elif 'lxml' in sys.modules:
        del sys.modules['lxml']

from inventory.services.import_service import ProductImportService
from inventory.models import Category, Product

def create_test_excel(filename, num_products=30):
    wb = openpyxl.Workbook()
    sheet = wb.active
    # Headers
    sheet.append(['Nom', 'Catégorie', 'Prix Achat', 'Prix Vente', 'SKU'])
    
    # Categories to ensure they exist or are created
    categories = ['Electronique', 'Alimentaire', 'Divers']
    
    for i in range(1, num_products + 1):
        cat = categories[i % len(categories)]
        # Simulation d'une erreur à la ligne 21 (row_idx 21, donc i=19 ou 20 selon start_row)
        # Si start_row=2, i=20 -> row_idx=21
        if i == 20:
             sheet.append([f'Produit Erreur {i}', None, 100 * i, 150 * i, f'TEST-SKU-{i:04d}'])
        else:
             sheet.append([f'Produit Test {i}', cat, 100 * i, 150 * i, f'TEST-SKU-{i:04d}'])
    
    wb.save(filename)
    print(f"File {filename} created with {num_products} products.")

def run_import_test(filename):
    print(f"Starting import from {filename}...")
    with open(filename, 'rb') as f:
        result = ProductImportService.import_products(f)
    
    print("\nImport Results:")
    print(f"Success: {result.get('success')}")
    print(f"Created: {result.get('created')}")
    print(f"Updated: {result.get('updated')}")
    print(f"Errors count: {len(result.get('errors', []))}")
    
    if result.get('errors'):
        print("\nFirst 5 Errors:")
        for err in result.get('errors')[:5]:
            print(f" - {err}")
            
    return result

if __name__ == "__main__":
    test_file = 'test_import_30.xlsx'
    try:
        create_test_excel(test_file, 30)
        res = run_import_test(test_file)
        
        # Cleanup
        if os.path.exists(test_file):
            os.remove(test_file)
            
        if res.get('created') == 20:
             print("\n!!! REPRODUCED: Import stopped exactly at 20 products !!!")
        else:
             print(f"\nImport processed {res.get('created')} products.")
             
    except Exception as e:
        print(f"Test failed with error: {e}")
