"""
Report Service

Handles report generation and export:
- Sales reports
- Stock reports
- Financial reports
- Movement reports
- Export to Excel and PDF
"""

from decimal import Decimal
from typing import Dict, Any, Optional
from datetime import date, datetime, timedelta
from django.db.models import Sum, Count, Q, F
from django.contrib.auth.models import User

from .base import BaseService


class ReportService(BaseService):
    """
    Service for generating various reports.
    
    Handles:
    - Sales reports by period
    - Stock reports by location
    - Financial reports
    - Movement history reports
    """
    
    def generate_sales_report(
        self,
        start_date: date,
        end_date: date,
        point_of_sale=None,
        group_by: str = 'day'
    ) -> Dict[str, Any]:
        """
        Generate sales report for a period.
        
        Args:
            start_date: Start date
            end_date: End date
            point_of_sale: Optional point of sale filter
            group_by: Grouping ('day', 'week', 'month')
            
        Returns:
            Dict with sales data
        """
        from inventory.models import Invoice
        
        # Base query
        invoices = Invoice.objects.filter(
            date_issued__gte=start_date,
            date_issued__lte=end_date,
            status__in=['paid', 'sent', 'partially_paid']
        )
        
        if point_of_sale:
            invoices = invoices.filter(point_of_sale=point_of_sale)
        
        # Calculate totals
        total_sales = invoices.aggregate(
            total=Sum('total_amount'),
            count=Count('id')
        )
        
        # Calculate by product
        from inventory.models import InvoiceItem
        top_products = InvoiceItem.objects.filter(
            invoice__in=invoices
        ).values(
            'product__name'
        ).annotate(
            quantity_sold=Sum('quantity'),
            revenue=Sum(F('quantity') * F('unit_price'))
        ).order_by('-revenue')[:10]
        
        # Calculate by client
        top_clients = invoices.values(
            'client__name'
        ).annotate(
            total_spent=Sum('total_amount'),
            order_count=Count('id')
        ).order_by('-total_spent')[:10]
        
        report = {
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'summary': {
                'total_sales': total_sales['total'] or Decimal('0'),
                'invoice_count': total_sales['count'] or 0,
                'average_sale': (total_sales['total'] or Decimal('0')) / max(total_sales['count'] or 1, 1)
            },
            'top_products': list(top_products),
            'top_clients': list(top_clients)
        }
        
        self.log_info(
            f"Sales report generated for {start_date} to {end_date}",
            total_sales=float(report['summary']['total_sales'])
        )
        
        return report
    
    def generate_stock_report(
        self,
        point_of_sale=None,
        category=None,
        low_stock_only: bool = False
    ) -> Dict[str, Any]:
        """
        Generate stock report.
        
        Args:
            point_of_sale: Optional point of sale filter
            category: Optional category filter
            low_stock_only: Show only low stock items
            
        Returns:
            Dict with stock data
        """
        from inventory.models import Inventory, Product
        
        # Base query
        inventories = Inventory.objects.select_related('product', 'point_of_sale')
        
        if point_of_sale:
            inventories = inventories.filter(point_of_sale=point_of_sale)
        
        if category:
            inventories = inventories.filter(product__category=category)
        
        if low_stock_only:
            # Filter for low stock items
            low_stock_items = []
            for inv in inventories:
                if inv.is_low_stock():
                    low_stock_items.append(inv.id)
            inventories = inventories.filter(id__in=low_stock_items)
        
        # Calculate totals
        total_value = sum(
            inv.quantity * inv.product.purchase_price
            for inv in inventories
        )
        
        total_items = inventories.count()
        total_quantity = sum(inv.quantity for inv in inventories)
        
        # Group by status
        stock_status = {
            'in_stock': 0,
            'low_stock': 0,
            'out_of_stock': 0
        }
        
        for inv in inventories:
            status = inv.product.get_stock_status()
            if status == 'En Stock':
                stock_status['in_stock'] += 1
            elif status == 'Stock Faible':
                stock_status['low_stock'] += 1
            else:
                stock_status['out_of_stock'] += 1
        
        report = {
            'summary': {
                'total_items': total_items,
                'total_quantity': total_quantity,
                'total_value': total_value,
                'stock_status': stock_status
            },
            'items': list(inventories.values(
                'product__name',
                'product__sku',
                'quantity',
                'point_of_sale__name'
            ))
        }
        
        self.log_info(
            f"Stock report generated",
            total_items=total_items,
            total_value=float(total_value)
        )
        
        return report
    
    def generate_financial_report(
        self,
        month: int,
        year: int,
        point_of_sale=None
    ) -> Dict[str, Any]:
        """
        Generate financial report for a month.
        
        Args:
            month: Month number (1-12)
            year: Year
            point_of_sale: Optional point of sale filter
            
        Returns:
            Dict with financial data
        """
        from inventory.models import MonthlyProfitReport
        
        if point_of_sale:
            reports = MonthlyProfitReport.objects.filter(
                month=month,
                year=year,
                point_of_sale=point_of_sale
            )
        else:
            reports = MonthlyProfitReport.objects.filter(
                month=month,
                year=year
            )
        
        # Aggregate data
        total_sales = sum(r.total_sales_brut for r in reports)
        total_cogs = sum(r.total_cost_of_goods for r in reports)
        total_expenses = sum(r.total_expenses for r in reports)
        gross_profit = sum(r.gross_profit for r in reports)
        net_profit = sum(r.net_interest for r in reports)
        
        report = {
            'period': {
                'month': month,
                'year': year
            },
            'summary': {
                'total_sales': total_sales,
                'total_cogs': total_cogs,
                'total_expenses': total_expenses,
                'gross_profit': gross_profit,
                'net_profit': net_profit,
                'profit_margin': (gross_profit / total_sales * 100) if total_sales > 0 else 0
            },
            'by_location': [
                {
                    'point_of_sale': r.point_of_sale.name,
                    'sales': r.total_sales_brut,
                    'profit': r.net_interest
                }
                for r in reports
            ]
        }
        
        self.log_info(
            f"Financial report generated for {month}/{year}",
            net_profit=float(net_profit)
        )
        
        return report
    
    def generate_movement_report(
        self,
        start_date: date,
        end_date: date,
        movement_type: Optional[str] = None,
        point_of_sale=None,
        product=None
    ) -> Dict[str, Any]:
        """
        Generate stock movement report.
        
        Args:
            start_date: Start date
            end_date: End date
            movement_type: Optional movement type filter
            point_of_sale: Optional point of sale filter
            product: Optional product filter
            
        Returns:
            Dict with movement data
        """
        from inventory.models import StockMovement
        
        # Base query
        movements = StockMovement.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).select_related('product', 'from_point_of_sale', 'to_point_of_sale', 'user')
        
        if movement_type:
            movements = movements.filter(movement_type=movement_type)
        
        if point_of_sale:
            movements = movements.filter(
                Q(from_point_of_sale=point_of_sale) | Q(to_point_of_sale=point_of_sale)
            )
        
        if product:
            movements = movements.filter(product=product)
        
        # Calculate totals by type
        movement_summary = movements.values('movement_type').annotate(
            total_quantity=Sum('quantity'),
            count=Count('id')
        )
        
        report = {
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'summary': {
                'total_movements': movements.count(),
                'by_type': list(movement_summary)
            },
            'movements': list(movements.values(
                'created_at',
                'movement_type',
                'product__name',
                'quantity',
                'from_point_of_sale__name',
                'to_point_of_sale__name',
                'reference',
                'user__username'
            ))
        }
        
        self.log_info(
            f"Movement report generated for {start_date} to {end_date}",
            total_movements=movements.count()
        )
        
        return report
    
    def export_to_excel(self, report_data: Dict[str, Any], filename: str):
        """
        Export report data to Excel.
        
        Args:
            report_data: Report data dictionary
            filename: Output filename
            
        Returns:
            Path to generated file
        """
        # This would use openpyxl or similar library
        # For now, just log the action
        self.log_info(f"Excel export requested: {filename}")
        
        # TODO: Implement actual Excel export
        raise NotImplementedError("Excel export not yet implemented")
    
    def export_to_pdf(self, report_data: Dict[str, Any], filename: str):
        """
        Export report data to PDF.
        
        Args:
            report_data: Report data dictionary
            filename: Output filename
            
        Returns:
            Path to generated file
        """
        # This would use reportlab or similar library
        # For now, just log the action
        self.log_info(f"PDF export requested: {filename}")
        
        # TODO: Implement actual PDF export
        raise NotImplementedError("PDF export not yet implemented")
