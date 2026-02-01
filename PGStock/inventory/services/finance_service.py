from django.db.models import Sum, F
from decimal import Decimal
from ..models import Invoice, InvoiceItem, Expense, MonthlyProfitReport, PointOfSale
import datetime

class FinanceService:
    """Service pour gérer les calculs financiers et les rapports de profit"""

    @staticmethod
    def generate_monthly_report(month, year, point_of_sale):
        """Génère ou met à jour le rapport de profit pour un POS et un mois donné"""
        
        # 1. Calculer le total des ventes et du coût d'achat pour ce mois et ce POS
        # On ne prend que les factures payées
        invoices = Invoice.objects.filter(
            date_issued__month=month,
            date_issued__year=year,
            point_of_sale=point_of_sale,
            status__in=['paid', 'sent'] # Include 'sent' invoices
        )
        
        total_sales_brut = Decimal('0.00')
        total_discounts = Decimal('0.00')
        total_cogs = Decimal('0.00')
        total_net_profit = Decimal('0.00')
        
        for inv in invoices:
            # total_sales_brut += inv.subtotal # Subtotal is brut before global discount
            # We will calculate total_sales_brut from items to be truly "Gross" (before item discounts)
            total_discounts += inv.discount_amount
            
            items = inv.invoiceitem_set.all()
            for item in items:
                # Add item-level discount to total_discounts if we want to show it separately
                # But in our model, 'subtotal' already accounts for item-level discounts if we use item.get_total()
                # Actually, Invoice.subtotal = sum(item.get_total())
                # And item.get_total() = (qty * price) - item_discount
                
                # To get TRUE brut sales:
                brut_line = item.quantity * item.unit_price
                total_sales_brut += brut_line
                
                # COGS using the purchase_price stored on the item (fixed for wholesale)
                total_cogs += item.quantity * item.purchase_price
                
                # If we want to track item-level discounts for display:
                if item.discount:
                    total_discounts += (brut_line * (item.discount / Decimal('100')))
            
            total_net_profit += inv.total_profit

        # 2. Calculer le total des dépenses pour ce mois et ce POS
        expenses_total = Expense.objects.filter(
            date__month=month,
            date__year=year,
            point_of_sale=point_of_sale
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # 3. Créer ou mettre à jour le rapport
        report, created = MonthlyProfitReport.objects.get_or_create(
            month=month,
            year=year,
            point_of_sale=point_of_sale
        )
        
        report.total_sales_brut = total_sales_brut
        report.total_discounts = total_discounts
        report.total_cost_of_goods = total_cogs
        report.total_expenses = expenses_total
        
        # Use our new calculated profit
        report.gross_profit = total_net_profit
        report.net_interest = report.gross_profit - report.total_expenses
        report.save()
        
        return report

    @staticmethod
    def update_all_reports_for_month(month, year):
        """Met à jour les rapports de tous les POS pour un mois donné"""
        reports = []
        for pos in PointOfSale.objects.all():
            reports.append(FinanceService.generate_monthly_report(month, year, pos))
        return reports

    @staticmethod
    def recalculate_report_for_expense(expense):
        """Recalcule le rapport pour le mois et le POS d'une dépense spécifique"""
        if expense and expense.date and expense.point_of_sale:
            return FinanceService.generate_monthly_report(
                expense.date.month, 
                expense.date.year, 
                expense.point_of_sale
            )
        return None

    @staticmethod
    def recalculate_report_for_date(date, point_of_sale):
        """Recalcule le rapport pour une date et un POS spécifiques"""
        if date and point_of_sale:
            return FinanceService.generate_monthly_report(
                date.month,
                date.year,
                point_of_sale
            )
        return None

    @staticmethod
    def get_discount_analytics(month, year, point_of_sale=None):
        """
        Calcule les statistiques de remises pour un mois donné
        
        Args:
            month: Mois (1-12)
            year: Année
            point_of_sale: Point de vente optionnel (None = tous les POS)
            
        Returns:
            Dict avec les métriques:
            - gross_revenue: CA brut (avant remises)
            - net_revenue: CA net (après remises)
            - total_discounts: Total des remises accordées
            - discount_rate: Taux de remise moyen (%)
            - invoice_count: Nombre de factures
            - order_count: Nombre de commandes
            - by_point_of_sale: Liste des métriques par POS
        """
        from sales.models import Order
        
        # Filtrer les factures pour le mois/année
        invoice_filter = {
            'date_issued__month': month,
            'date_issued__year': year,
            'status__in': ['paid', 'sent']
        }
        if point_of_sale:
            invoice_filter['point_of_sale'] = point_of_sale
            
        invoices = Invoice.objects.filter(**invoice_filter)
        
        # Filtrer les commandes pour le mois/année
        order_filter = {
            'date_created__month': month,
            'date_created__year': year,
            'status__in': ['paid', 'validated', 'delivered']
        }
        if point_of_sale:
            order_filter['point_of_sale'] = point_of_sale
            
        orders = Order.objects.filter(**order_filter)
        
        # Calculer les métriques pour les factures
        invoice_gross = Decimal('0.00')
        invoice_discounts = Decimal('0.00')
        invoice_net = Decimal('0.00')
        
        for inv in invoices:
            invoice_gross += inv.subtotal  # Subtotal = CA brut avant remise globale
            invoice_discounts += inv.discount_amount
            invoice_net += inv.total_amount  # Total après remise
        
        # Calculer les métriques pour les commandes
        order_gross = Decimal('0.00')
        order_discounts = Decimal('0.00')
        order_net = Decimal('0.00')
        
        for order in orders:
            order_gross += order.subtotal
            order_discounts += order.discount
            order_net += order.total_amount
        
        # Totaux combinés
        total_gross = invoice_gross + order_gross
        total_discounts = invoice_discounts + order_discounts
        total_net = invoice_net + order_net
        
        # Calculer le taux de remise moyen
        discount_rate = Decimal('0.00')
        if total_gross > 0:
            discount_rate = (total_discounts / total_gross * 100).quantize(Decimal('0.01'))
        
        result = {
            'month': month,
            'year': year,
            'gross_revenue': float(total_gross),
            'net_revenue': float(total_net),
            'total_discounts': float(total_discounts),
            'discount_rate': float(discount_rate),
            'invoice_count': invoices.count(),
            'order_count': orders.count(),
        }
        
        # Si aucun POS spécifique, ajouter les détails par POS
        if not point_of_sale:
            by_pos = []
            for pos in PointOfSale.objects.filter(is_active=True):
                pos_data = FinanceService.get_discount_analytics(month, year, pos)
                if pos_data['gross_revenue'] > 0:  # Inclure seulement les POS avec des ventes
                    by_pos.append({
                        'point_of_sale_id': pos.id,
                        'point_of_sale_name': pos.name,
                        **pos_data
                    })
            result['by_point_of_sale'] = by_pos
        
        return result
