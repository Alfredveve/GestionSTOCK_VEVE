"""
Analytics Service

Handles analytics and forecasting:
- Sales trends analysis
- Stock prediction
- KPI calculations
- Product performance analysis
"""

from decimal import Decimal
from typing import Dict, Any, List
from datetime import date, timedelta
from django.db.models import Sum, Avg, Count, F, Q
from django.db.models.functions import TruncDate, TruncMonth

from .base import BaseService


class AnalyticsService(BaseService):
    """
    Service for analytics and business intelligence.
    
    Handles:
    - Sales trend analysis
    - Stock forecasting
    - KPI calculations
    - Performance metrics
    """
    
    def calculate_sales_trends(
        self,
        days: int = 30,
        point_of_sale=None
    ) -> Dict[str, Any]:
        """
        Calculate sales trends over a period.
        
        Args:
            days: Number of days to analyze
            point_of_sale: Optional point of sale filter
            
        Returns:
            Dict with trend data
        """
        from inventory.models import Invoice
        
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Base query
        invoices = Invoice.objects.filter(
            date_issued__gte=start_date,
            date_issued__lte=end_date,
            status__in=['paid', 'sent', 'partially_paid']
        )
        
        if point_of_sale:
            invoices = invoices.filter(point_of_sale=point_of_sale)
        
        # Daily sales
        daily_sales = invoices.values('date_issued').annotate(
            day=F('date_issued'),
            total=Sum('total_amount'),
            count=Count('id')
        ).order_by('date_issued')
        
        # Calculate trend (simple linear regression)
        sales_list = list(daily_sales)
        if len(sales_list) > 1:
            # Calculate average growth rate
            first_total = float(sales_list[0]['total'] or 0)
            last_total = float(sales_list[-1]['total'] or 0)
            
            if first_total > 0:
                growth_rate = ((last_total - first_total) / first_total) * 100
            else:
                growth_rate = 0
        else:
            growth_rate = 0
        
        return {
            'period': {
                'start_date': start_date,
                'end_date': end_date,
                'days': days
            },
            'daily_sales': sales_list,
            'trend': {
                'growth_rate': growth_rate,
                'direction': 'up' if growth_rate > 0 else 'down' if growth_rate < 0 else 'stable'
            }
        }
    
    def predict_stock_needs(
        self,
        product,
        days_ahead: int = 30
    ) -> Dict[str, Any]:
        """
        Predict stock needs based on historical sales.
        
        Args:
            product: Product to analyze
            days_ahead: Number of days to predict
            
        Returns:
            Dict with prediction data
        """
        from inventory.models import StockMovement
        
        # Get historical exit movements (sales)
        lookback_days = 90
        start_date = date.today() - timedelta(days=lookback_days)
        
        exits = StockMovement.objects.filter(
            product=product,
            movement_type='exit',
            created_at__date__gte=start_date
        ).aggregate(
            total_quantity=Sum('quantity'),
            movement_count=Count('id')
        )
        
        total_sold = exits['total_quantity'] or 0
        
        # Calculate average daily sales
        if lookback_days > 0:
            avg_daily_sales = total_sold / lookback_days
        else:
            avg_daily_sales = 0
        
        # Predict needs
        predicted_needs = avg_daily_sales * days_ahead
        
        # Get current stock
        current_stock = product.get_total_stock_quantity()
        
        # Calculate when stock will run out
        if avg_daily_sales > 0:
            days_until_stockout = current_stock / avg_daily_sales
        else:
            days_until_stockout = float('inf')
        
        return {
            'product': product.name,
            'current_stock': current_stock,
            'analysis_period_days': lookback_days,
            'total_sold': total_sold,
            'avg_daily_sales': avg_daily_sales,
            'prediction': {
                'days_ahead': days_ahead,
                'predicted_needs': predicted_needs,
                'recommended_order': max(0, predicted_needs - current_stock),
                'days_until_stockout': days_until_stockout,
                'needs_reorder': days_until_stockout < days_ahead
            }
        }
    
    def calculate_kpis(
        self,
        start_date: date,
        end_date: date,
        point_of_sale=None
    ) -> Dict[str, Any]:
        """
        Calculate key performance indicators.
        
        Args:
            start_date: Start date
            end_date: End date
            point_of_sale: Optional point of sale filter
            
        Returns:
            Dict with KPIs
        """
        from inventory.models import Invoice, StockMovement, Product
        
        # Sales KPIs
        invoices = Invoice.objects.filter(
            date_issued__gte=start_date,
            date_issued__lte=end_date,
            status__in=['paid', 'sent', 'partially_paid']
        )
        
        if point_of_sale:
            invoices = invoices.filter(point_of_sale=point_of_sale)
        
        sales_data = invoices.aggregate(
            total_revenue=Sum('total_amount'),
            total_profit=Sum('total_profit'),
            invoice_count=Count('id'),
            avg_order_value=Avg('total_amount')
        )
        
        # Stock movement KPIs
        movements = StockMovement.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )
        
        if point_of_sale:
            movements = movements.filter(
                Q(from_point_of_sale=point_of_sale) | Q(to_point_of_sale=point_of_sale)
            )
        
        movement_data = movements.values('movement_type').annotate(
            total=Sum('quantity')
        )
        
        # Inventory KPIs
        if point_of_sale:
            from inventory.models import Inventory
            inventories = Inventory.objects.filter(point_of_sale=point_of_sale)
            
            total_inventory_value = sum(
                inv.quantity * inv.product.purchase_price
                for inv in inventories
            )
            
            low_stock_count = sum(1 for inv in inventories if inv.is_low_stock())
        else:
            products = Product.objects.all()
            total_inventory_value = sum(
                p.get_total_stock_quantity() * p.purchase_price
                for p in products
            )
            low_stock_count = 0  # Would need to check all inventories
        
        return {
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'sales': {
                'total_revenue': sales_data['total_revenue'] or Decimal('0'),
                'total_profit': sales_data['total_profit'] or Decimal('0'),
                'invoice_count': sales_data['invoice_count'] or 0,
                'avg_order_value': sales_data['avg_order_value'] or Decimal('0'),
                'profit_margin': (
                    (sales_data['total_profit'] / sales_data['total_revenue'] * 100)
                    if sales_data['total_revenue'] and sales_data['total_revenue'] > 0
                    else Decimal('0')
                )
            },
            'inventory': {
                'total_value': total_inventory_value,
                'low_stock_items': low_stock_count
            },
            'movements': {item['movement_type']: item['total'] for item in movement_data}
        }
    
    def analyze_product_performance(
        self,
        start_date: date,
        end_date: date,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Analyze product performance.
        
        Args:
            start_date: Start date
            end_date: End date
            limit: Number of products to return
            
        Returns:
            Dict with product performance data
        """
        from inventory.models import InvoiceItem, Invoice
        
        # Get sales data
        items = InvoiceItem.objects.filter(
            invoice__date_issued__gte=start_date,
            invoice__date_issued__lte=end_date,
            invoice__status__in=['paid', 'sent', 'partially_paid']
        ).values(
            'product__id',
            'product__name',
            'product__sku'
        ).annotate(
            quantity_sold=Sum('quantity'),
            revenue=Sum(F('quantity') * F('unit_price')),
            profit=Sum(F('quantity') * (F('unit_price') - F('purchase_price'))),
            order_count=Count('invoice', distinct=True)
        ).order_by('-revenue')[:limit]
        
        return {
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'top_products': list(items)
        }
    
    def get_top_selling_products(
        self,
        days: int = 30,
        limit: int = 10,
        point_of_sale=None
    ) -> List[Dict[str, Any]]:
        """
        Get top selling products.
        
        Args:
            days: Number of days to analyze
            limit: Number of products to return
            point_of_sale: Optional point of sale filter
            
        Returns:
            List of top selling products
        """
        from inventory.models import InvoiceItem
        
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        items = InvoiceItem.objects.filter(
            invoice__date_issued__gte=start_date,
            invoice__date_issued__lte=end_date,
            invoice__status__in=['paid', 'sent', 'partially_paid']
        )
        
        if point_of_sale:
            items = items.filter(invoice__point_of_sale=point_of_sale)
        
        top_products = items.values(
            'product__id',
            'product__name',
            'product__sku'
        ).annotate(
            quantity_sold=Sum('quantity'),
            revenue=Sum(F('quantity') * F('unit_price'))
        ).order_by('-quantity_sold')[:limit]
        
        return list(top_products)
    
    def get_customer_insights(
        self,
        days: int = 90
    ) -> Dict[str, Any]:
        """
        Get customer insights and segmentation.
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Dict with customer insights
        """
        from inventory.models import Invoice
        
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Customer segmentation
        customers = Invoice.objects.filter(
            date_issued__gte=start_date,
            date_issued__lte=end_date,
            status__in=['paid', 'sent', 'partially_paid']
        ).values(
            'client__id',
            'client__name'
        ).annotate(
            total_spent=Sum('total_amount'),
            order_count=Count('id'),
            avg_order_value=Avg('total_amount')
        ).order_by('-total_spent')
        
        # Segment customers
        top_customers = list(customers[:10])
        
        return {
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'total_customers': customers.count(),
            'top_customers': top_customers
        }
