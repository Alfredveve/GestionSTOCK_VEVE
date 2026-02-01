import sys
from decimal import Decimal
from django.db import transaction
from inventory.models import Product, Category, Supplier

class ProductImportService:
    @staticmethod
    def import_products(file):
        """
        Importe des produits depuis un fichier Excel (.xlsx).
        Détecte automatiquement si l'en-tête est sur une ou deux lignes.
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
            
            # Identify columns from headers (rows 1 and 2)
            row1 = [cell.value for cell in sheet[1]]
            row2 = [cell.value for cell in sheet[2]]
            
            col_map = {}
            
            # Map headers to expected fields (insensitive, flexible matching)
            expected_fields = {
                'nom': ['nom', 'name', 'produit', 'product'],
                'category': ['catégorie', 'categorie', 'category', 'categories'],
                'purchase_price': ['prix achat', 'achat', 'cost', 'prix d\'achat', 'unitaire'],
                'selling_price': ['prix vente', 'vente', 'price', 'prix de vente', 'unitaire'],
                'sku': ['sku', 'code', 'référence', 'reference'],
                'supplier': ['fournisseur', 'supplier'],
                'description': ['description', 'notes'],
                'quantity': ['stock', 'quantité', 'quantity', 'qté'],
                'reorder_level': ['seuil', 'seuils', 'reorder'],
                'units_per_box': ['unités par colis', 'par colis', 'colis'],
                'wholesale_purchase_price': ['achat (gros)', 'achat gros'],
                'wholesale_selling_price': ['vente (gros)', 'vente gros'],
            }
            
            # 1. Detect columns by checking both rows
            num_cols = len(row1)
            for idx in range(num_cols):
                val1 = str(row1[idx] or "").lower().strip()
                val2 = str(row2[idx] or "").lower().strip()
                combined = f"{val1} {val2}".strip()
                
                for field, keywords in expected_fields.items():
                    if field in col_map: continue
                    
                    found = False
                    for kw in keywords:
                        # Priority for val1 (header row 1)
                        if kw in combined or kw in val1 or kw in val2:
                            col_map[field] = idx
                            found = True
                            break
                    if found: break

            # 2. Validation minimal requirements
            if 'nom' not in col_map or 'category' not in col_map:
                return {
                    'success': False, 
                    'message': f"Le fichier doit contenir au moins les colonnes 'Nom' et 'Catégorie'. "
                               f"Colonnes détectées: {list(col_map.keys())}"
                }

            # 3. Determine start row dynamically
            # If row 2 has data for 'nom' that doesn't look like a header keyword, start at row 2
            start_row = 2
            nom_val_row2 = str(row2[col_map['nom']] or "").lower().strip()
            
            # A simple heuristic: if row 2's 'nom' column value is one of the keywords, row 2 is header
            is_row2_header = False
            for kw in expected_fields['nom']:
                if nom_val_row2 == kw:
                    is_row2_header = True
                    break
            
            # Or if row 2 has other keywords in specific columns
            if not is_row2_header:
                for field in ['purchase_price', 'selling_price', 'units_per_box']:
                    if field in col_map:
                        idx = col_map[field]
                        val_row2 = str(row2[idx] or "").lower().strip()
                        for kw in expected_fields[field]:
                            if val_row2 == kw:
                                is_row2_header = True
                                break
                    if is_row2_header: break
            
            if is_row2_header:
                start_row = 3
            
            rows = list(sheet.iter_rows(min_row=start_row, values_only=True))
            
            with transaction.atomic():
                for row_idx, row in enumerate(rows, start=start_row):
                    try:
                        # Extract data safely
                        name = row[col_map['nom']] if col_map.get('nom') is not None else None
                        if not name:
                            continue # Skip empty rows
                            
                        category_name = row[col_map['category']] if col_map.get('category') is not None else None
                        if not category_name:
                            errors.append(f"Ligne {row_idx}: Catégorie manquante pour '{name}'")
                            continue
                            
                        # Get data safely
                        price_buy = row[col_map.get('purchase_price')] if 'purchase_price' in col_map else 0
                        price_sell = row[col_map.get('selling_price')] if 'selling_price' in col_map else 0
                        sku = row[col_map.get('sku')] if 'sku' in col_map else None
                        supplier_name = row[col_map.get('supplier')] if 'supplier' in col_map else None
                        description = row[col_map.get('description')] if 'description' in col_map else ""
                        reorder_level = row[col_map.get('reorder_level')] if 'reorder_level' in col_map else None
                        units_per_box = row[col_map.get('units_per_box')] if 'units_per_box' in col_map else None
                        wholesale_buy = row[col_map.get('wholesale_purchase_price')] if 'wholesale_purchase_price' in col_map else None
                        wholesale_sell = row[col_map.get('wholesale_selling_price')] if 'wholesale_selling_price' in col_map else None
                        
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
                        if supplier_name and str(supplier_name).strip():
                            supplier, _ = Supplier.objects.get_or_create(
                                name__iexact=str(supplier_name).strip(),
                                defaults={'name': str(supplier_name).strip()}
                            )
                            
                        # Create or Update Product
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
                            
                            if price_buy is not None: product.purchase_price = Decimal(str(price_buy or 0))
                            if price_sell is not None: product.selling_price = Decimal(str(price_sell or 0))
                            if reorder_level is not None: product.reorder_level = int(reorder_level or 5)
                            if units_per_box is not None: product.units_per_box = int(units_per_box or 1)
                            if wholesale_buy is not None: product.wholesale_purchase_price = Decimal(str(wholesale_buy or 0))
                            if wholesale_sell is not None: product.wholesale_selling_price = Decimal(str(wholesale_sell or 0))
                            
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
                                sku=sku, # Can be None, model will generate
                                reorder_level=int(reorder_level or 5) if reorder_level is not None else 5,
                                units_per_box=int(units_per_box or 1) if units_per_box is not None else 1,
                                wholesale_purchase_price=Decimal(str(wholesale_buy or 0)) if wholesale_buy is not None else 0,
                                wholesale_selling_price=Decimal(str(wholesale_sell or 0)) if wholesale_sell is not None else 0
                            )
                            product.save()
                            created_count += 1
                        
                        # Handle initial stock quantity if provided
                        qty = row[col_map.get('quantity')] if 'quantity' in col_map else None
                        if qty is not None and str(qty).strip() != "" and int(qty or 0) > 0:
                            from inventory.models import Inventory, PointOfSale, StockMovement
                            pos = PointOfSale.objects.filter(is_active=True).first()
                            if pos:
                                inv, created = Inventory.objects.get_or_create(
                                    product=product,
                                    point_of_sale=pos,
                                    defaults={'quantity': 0}
                                )
                                if created or inv.quantity == 0:
                                    StockMovement.objects.create(
                                        product=product,
                                        from_point_of_sale=pos,
                                        movement_type='entry',
                                        quantity=int(qty),
                                        notes="Import initial depuis Excel",
                                        is_wholesale=False
                                    )
                                    
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
