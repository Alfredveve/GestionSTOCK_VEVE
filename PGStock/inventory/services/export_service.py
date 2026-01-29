"""
Export Service

Handles data export and import:
- Excel export for products, invoices, stock
- CSV export
- Excel import with validation
"""

from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime
import io

from .base import BaseService, ServiceException


class ExportService(BaseService):
    """
    Service for exporting and importing data.
    
    Handles:
    - Excel export for various entities
    - CSV export
    - Excel import with validation
    """
    
    def export_products_to_excel(self, products=None, filename: str = "products.xlsx"):
        """
        Export products to Excel.
        
        Args:
            products: QuerySet or list of products (None = all products)
            filename: Output filename
            
        Returns:
            BytesIO buffer with Excel file
        """
        from inventory.models import Product
        
        if products is None:
            products = Product.objects.all()
        
        # Prepare data
        data = []
        for product in products:
            data.append({
                'SKU': product.sku,
                'Nom': product.name,
                'Catégorie': product.category.name if product.category else '',
                'Prix d\'achat': float(product.purchase_price),
                'Prix de vente détail': float(product.selling_price),
                'Prix de vente gros': float(product.wholesale_selling_price),
                'Unités par colis': product.units_per_box,
                'Stock total': product.get_total_stock_quantity(),
                'Statut': product.get_stock_status()
            })
        
        self.log_info(f"Exported {len(data)} products to Excel")
        
        # TODO: Use openpyxl to create actual Excel file
        # For now, return the data structure
        return data
    
    def export_invoices_to_excel(
        self,
        start_date=None,
        end_date=None,
        point_of_sale=None,
        filename: str = "invoices.xlsx"
    ):
        """
        Export invoices to Excel.
        
        Args:
            start_date: Optional start date filter
            end_date: Optional end date filter
            point_of_sale: Optional point of sale filter
            filename: Output filename
            
        Returns:
            BytesIO buffer with Excel file
        """
        from inventory.models import Invoice
        
        invoices = Invoice.objects.all()
        
        if start_date:
            invoices = invoices.filter(date_issued__gte=start_date)
        if end_date:
            invoices = invoices.filter(date_issued__lte=end_date)
        if point_of_sale:
            invoices = invoices.filter(point_of_sale=point_of_sale)
        
        # Prepare data
        data = []
        for invoice in invoices:
            data.append({
                'Numéro': invoice.invoice_number,
                'Date': invoice.date_issued.strftime('%Y-%m-%d') if invoice.date_issued else '',
                'Client': invoice.client.name,
                'Point de vente': invoice.point_of_sale.name if invoice.point_of_sale else '',
                'Sous-total': float(invoice.subtotal),
                'Total': float(invoice.total_amount),
                'Statut': invoice.status,
                'Montant payé': float(invoice.get_amount_paid()),
                'Reste à payer': float(invoice.get_remaining_amount())
            })
        
        self.log_info(f"Exported {len(data)} invoices to Excel")
        
        return data
    
    def export_stock_to_excel(
        self,
        point_of_sale=None,
        filename: str = "stock.xlsx"
    ):
        """
        Export stock inventory to Excel.
        
        Args:
            point_of_sale: Optional point of sale filter
            filename: Output filename
            
        Returns:
            BytesIO buffer with Excel file
        """
        from inventory.models import Inventory
        
        inventories = Inventory.objects.select_related('product', 'point_of_sale')
        
        if point_of_sale:
            inventories = inventories.filter(point_of_sale=point_of_sale)
        
        # Prepare data
        data = []
        for inv in inventories:
            data.append({
                'Produit': inv.product.name,
                'SKU': inv.product.sku,
                'Point de vente': inv.point_of_sale.name,
                'Quantité': inv.quantity,
                'Colis': inv.quantity // inv.product.units_per_box if inv.product.units_per_box > 0 else 0,
                'Unités': inv.quantity % inv.product.units_per_box if inv.product.units_per_box > 0 else inv.quantity,
                'Valeur': float(inv.quantity * inv.product.purchase_price),
                'Statut': inv.product.get_stock_status()
            })
        
        self.log_info(f"Exported {len(data)} inventory items to Excel")
        
        return data
    
    def export_to_csv(
        self,
        data: List[Dict[str, Any]],
        filename: str = "export.csv"
    ) -> str:
        """
        Export data to CSV format.
        
        Args:
            data: List of dictionaries to export
            filename: Output filename
            
        Returns:
            CSV string
        """
        import csv
        
        if not data:
            return ""
        
        # Get headers from first row
        headers = list(data[0].keys())
        
        # Create CSV
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        writer.writerows(data)
        
        csv_content = output.getvalue()
        output.close()
        
        self.log_info(f"Exported {len(data)} rows to CSV")
        
        return csv_content
    
    def import_from_excel(
        self,
        file_path: str,
        import_type: str,
        user
    ) -> Dict[str, Any]:
        """
        Import data from Excel file.
        
        Args:
            file_path: Path to Excel file
            import_type: Type of import ('products', 'stock', 'clients')
            user: User performing the import
            
        Returns:
            Dict with import results
        """
        self.log_info(f"Excel import requested: {import_type} from {file_path}")
        raise NotImplementedError("Excel import not yet implemented")
    
    def validate_import_data(
        self,
        data: List[Dict[str, Any]],
        import_type: str
    ) -> Dict[str, Any]:
        """
        Validate import data before processing.
        
        Args:
            data: List of dictionaries to validate
            import_type: Type of import
            
        Returns:
            Dict with validation results
        """
        errors = []
        warnings = []
        
        if import_type == 'products':
            required_fields = ['sku', 'name', 'purchase_price', 'selling_price']
            
            for idx, row in enumerate(data):
                # Check required fields
                for field in required_fields:
                    if field not in row or not row[field]:
                        errors.append(f"Ligne {idx + 1}: Champ requis manquant '{field}'")
                
                # Validate prices
                if 'purchase_price' in row:
                    try:
                        price = Decimal(str(row['purchase_price']))
                        if price < 0:
                            errors.append(f"Ligne {idx + 1}: Prix d'achat négatif")
                    except (ValueError, TypeError):
                        errors.append(f"Ligne {idx + 1}: Prix d'achat invalide")
                
                if 'selling_price' in row:
                    try:
                        price = Decimal(str(row['selling_price']))
                        if price < 0:
                            errors.append(f"Ligne {idx + 1}: Prix de vente négatif")
                    except (ValueError, TypeError):
                        errors.append(f"Ligne {idx + 1}: Prix de vente invalide")
        
        elif import_type == 'stock':
            required_fields = ['sku', 'point_of_sale', 'quantity']
            
            for idx, row in enumerate(data):
                for field in required_fields:
                    if field not in row or not row[field]:
                        errors.append(f"Ligne {idx + 1}: Champ requis manquant '{field}'")
                
                # Validate quantity
                if 'quantity' in row:
                    try:
                        qty = int(row['quantity'])
                        if qty < 0:
                            errors.append(f"Ligne {idx + 1}: Quantité négative")
                    except (ValueError, TypeError):
                        errors.append(f"Ligne {idx + 1}: Quantité invalide")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'row_count': len(data)
        }
    
    def export_movements_to_excel(
        self,
        start_date=None,
        end_date=None,
        movement_type=None,
        filename: str = "movements.xlsx"
    ):
        """
        Export stock movements to Excel.
        
        Args:
            start_date: Optional start date filter
            end_date: Optional end date filter
            movement_type: Optional movement type filter
            filename: Output filename
            
        Returns:
            List of movement data
        """
        from inventory.models import StockMovement
        
        movements = StockMovement.objects.select_related(
            'product', 'from_point_of_sale', 'to_point_of_sale', 'user'
        )
        
        if start_date:
            movements = movements.filter(created_at__date__gte=start_date)
        if end_date:
            movements = movements.filter(created_at__date__lte=end_date)
        if movement_type:
            movements = movements.filter(movement_type=movement_type)
        
        # Prepare data
        data = []
        for movement in movements:
            data.append({
                'Date': movement.created_at.strftime('%Y-%m-%d'),
                'Type': movement.get_movement_type_display(),
                'Produit': movement.product.name,
                'SKU': movement.product.sku,
                'Quantité': movement.quantity,
                'De': movement.from_point_of_sale.name if movement.from_point_of_sale else '',
                'Vers': movement.to_point_of_sale.name if movement.to_point_of_sale else '',
                'Référence': movement.reference,
                'Utilisateur': movement.user.username if movement.user else '',
                'Notes': movement.notes
            })
        
        self.log_info(f"Exported {len(data)} movements to Excel")
        
        return data
