import sys
from decimal import Decimal
from django.db import transaction
from inventory.models import Product, Category, Supplier

class ProductImportService:
    @staticmethod
    def import_products(file):
        """
        Importe des produits depuis un fichier Excel (.xlsx).
        Attend les colonnes: Nom, Categorie, Prix Achat, Prix Vente, Stock, [SKU], [Fournisseur], [Description]
        """
        try:
            # Gestion de compatibilité lxml (conflit metaclass Python 3.12)
            lxml_backup = sys.modules.get('lxml')
            sys.modules['lxml'] = None
            try:
                import openpyxl
            finally:
                if lxml_backup:
                    sys.modules['lxml'] = lxml_backup
                elif 'lxml' in sys.modules:
                    del sys.modules['lxml']

            wb = openpyxl.load_workbook(file)
            sheet = wb.active
            
            created_count = 0
            updated_count = 0
            errors = []
            
            # Identify columns from header (row 1)
            header = [cell.value for cell in sheet[1]]
            col_map = {}
            
            # Map headers to expected fields (insensitive)
            expected_fields = {
                'nom': ['nom', 'name', 'produit', 'product'],
                'category': ['catégorie', 'categorie', 'category'],
                'purchase_price': ['prix achat', 'achat', 'cost', 'purchase price'],
                'selling_price': ['prix vente', 'vente', 'prix', 'price', 'selling price'],
                'sku': ['sku', 'code', 'référence', 'reference'],
                'supplier': ['fournisseur', 'supplier'],
                'description': ['description', 'notes'],
                'quantity': ['stock', 'quantité', 'quantity', 'qté']
            }
            
            for idx, col_name in enumerate(header):
                if not col_name: continue
                col_str = str(col_name).lower().strip()
                
                for field, keywords in expected_fields.items():
                    if col_str in keywords:
                        col_map[field] = idx
                        break
            
            # Validation minimal requirements
            if 'nom' not in col_map or 'category' not in col_map:
                return {
                    'success': False, 
                    'message': "Le fichier doit contenir au moins les colonnes 'Nom' et 'Catégorie'."
                }

            rows = list(sheet.iter_rows(min_row=2, values_only=True))
            
            with transaction.atomic():
                for row_idx, row in enumerate(rows, start=2):
                    try:
                        # Extract data
                        name = row[col_map['nom']]
                        if not name:
                            continue # Skip empty rows
                            
                        category_name = row[col_map['category']]
                        if not category_name:
                            errors.append(f"Ligne {row_idx}: Catégorie manquante pour '{name}'")
                            continue
                            
                        # Get data safely
                        price_buy = row[col_map.get('purchase_price')] if 'purchase_price' in col_map else 0
                        price_sell = row[col_map.get('selling_price')] if 'selling_price' in col_map else 0
                        sku = row[col_map.get('sku')] if 'sku' in col_map else None
                        supplier_name = row[col_map.get('supplier')] if 'supplier' in col_map else None
                        description = row[col_map.get('description')] if 'description' in col_map else ""
                        
                        # Clean data
                        if sku: sku = str(sku).strip()
                        if not sku: sku = None # Let model generate it
                        
                        # Get or Create Category
                        category, _ = Category.objects.get_or_create(
                            name__iexact=str(category_name).strip(),
                            defaults={'name': str(category_name).strip()}
                        )
                        
                        # Get or Create Supplier (Optional)
                        supplier = None
                        if supplier_name:
                            supplier, _ = Supplier.objects.get_or_create(
                                name__iexact=str(supplier_name).strip(),
                                defaults={'name': str(supplier_name).strip()}
                            )
                            
                        # Create Product
                        # Check if product exists (by SKU if provided, or Name)
                        product = None
                        if sku:
                            product = Product.objects.filter(sku=sku).first()
                        
                        if not product:
                             product = Product.objects.filter(name__iexact=str(name).strip()).first()
                             
                        if product:
                            # Update existing
                            product.name = str(name).strip()
                            product.category = category
                            if supplier: product.supplier = supplier
                            product.description = description or product.description
                            
                            if price_buy is not None: product.purchase_price = Decimal(str(price_buy))
                            if price_sell is not None: product.selling_price = Decimal(str(price_sell))
                            
                            product.save()
                            updated_count += 1
                        else:
                            # Create new
                            product = Product(
                                name=str(name).strip(),
                                category=category,
                                supplier=supplier,
                                description=description,
                                purchase_price=Decimal(str(price_buy or 0)),
                                selling_price=Decimal(str(price_sell or 0)),
                                sku=sku # Can be None, model will generate
                            )
                            product.save()
                            created_count += 1
                            
                    except Exception as e:
                        errors.append(f"Ligne {row_idx}: Erreur - {str(e)}")
                        
            return {
                'success': True,
                'created': created_count,
                'updated': updated_count,
                'errors': errors
            }
            
        except Exception as e:
            return {'success': False, 'message': f"Erreur critique lors de l'import: {str(e)}"}
