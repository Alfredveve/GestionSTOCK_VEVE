from rest_framework import viewsets, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User
from .models import Category, Supplier, Product, Inventory, StockMovement, Invoice, Receipt, Payment, Expense, MonthlyProfitReport, Quote, Client, PointOfSale, ExpenseCategory, Settings, Notification
from .excel_utils import export_to_excel
from .services.import_service import ProductImportService
from .pdf_utils import export_to_pdf
from django.db import transaction
from decimal import Decimal
from .serializers import (
    CategorySerializer, SupplierSerializer, ProductSerializer, 
    InventorySerializer, StockMovementSerializer, InvoiceSerializer,
    ReceiptSerializer, PaymentSerializer, ExpenseSerializer, MonthlyProfitReportSerializer,
    QuoteSerializer, ClientSerializer, PointOfSaleSerializer, ExpenseCategorySerializer,
    SettingsSerializer, NotificationSerializer, UserSerializer
)

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        data = serializer.data
        
        # Add role and POS info
        from .permissions import get_user_role, get_user_pos
        data['role'] = get_user_role(request.user)
        
        pos = get_user_pos(request.user)
        if pos:
            data['point_of_sale'] = {
                'id': pos.id,
                'name': pos.name,
                'code': pos.code
            }
        else:
            data['point_of_sale'] = None
            
        return Response(data)
from .renderers import PDFRenderer

class SettingsViewSet(viewsets.ModelViewSet):
    queryset = Settings.objects.all()
    serializer_class = SettingsSerializer
    permission_classes = []  # No permission required
    authentication_classes = []  # No authentication required

    def list(self, request, *args, **kwargs):
        # Always return the first (and only) settings object
        settings = Settings.objects.first()
        if not settings:
            settings = Settings.objects.create()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'patch', 'put'])
    def current(self, request):
        settings = Settings.objects.first()
        if not settings:
            settings = Settings.objects.create()
        
        if request.method in ['PATCH', 'PUT']:
            serializer = self.get_serializer(settings, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
            
        serializer = self.get_serializer(settings)
        return Response(serializer.data)
from django.db.models import F, Sum, Count
from django.db.models.functions import TruncDate
from django.db import models

class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'phone', 'email']
    ordering_fields = ['name', 'created_at']

class PointOfSaleViewSet(viewsets.ModelViewSet):
    queryset = PointOfSale.objects.all()
    serializer_class = PointOfSaleSerializer
    permission_classes = [permissions.IsAuthenticated]

class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'supplier']
    search_fields = ['name', 'sku', 'description']
    ordering_fields = ['name', 'created_at', 'selling_price']

    def get_queryset(self):
        queryset = Product.objects.all()
        # Accept both 'point_of_sale' and 'pos_id' for better frontend compatibility
        pos_id = self.request.query_params.get('point_of_sale') or self.request.query_params.get('pos_id')
        if pos_id:
            queryset = queryset.filter(inventory__point_of_sale_id=pos_id).distinct()
        return queryset

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        products = self.filter_queryset(self.get_queryset())
        headers = [
            'ID', 'SKU', 'Nom', 'Catégorie', 'Fournisseur', 
            'Stock Total', 'Valeur Stock', 'Colis', 'Unités', 'Statut'
        ]
        
        data = []
        for p in products:
            analysis = p.get_analysis_data()
            status_map = {
                'in_stock': 'En Stock',
                'low_stock': 'Stock Faible',
                'out_of_stock': 'Rupture'
            }
            data.append([
                p.id, p.sku, p.name, p.category.name, 
                p.supplier.name if p.supplier else "N/A",
                p.get_total_stock_quantity(),
                float(p.get_total_stock_quantity() * p.purchase_price),
                analysis['colis'], analysis['unites'],
                status_map.get(p.get_stock_status(), 'N/A')
            ])
            
        return export_to_excel(headers, data, "L'Inventaire PGStock", "Produits")

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        products = self.filter_queryset(self.get_queryset())
        headers = ['SKU', 'Produit', 'Catégorie', 'Stock', 'Valeur Stock', 'Statut']
        
        data = []
        for p in products:
            status_map = {
                'in_stock': 'En Stock',
                'low_stock': 'Stock Faible',
                'out_of_stock': 'Rupture'
            }
            data.append([
                p.sku, 
                p.name, 
                p.category.name,
                p.get_total_stock_quantity(),
                f"{float(p.get_total_stock_quantity() * p.purchase_price):,.0f} GNF",
                status_map.get(p.get_stock_status(), 'N/A')
            ])
            
        return export_to_pdf(headers, data, "Catalogue et Valorisation de l'Inventaire", "Inventaire")

    @action(detail=False, methods=['post'])
    def import_products(self, request):
        """Importer des produits depuis un fichier Excel"""
        if 'file' not in request.FILES:
             return Response({"error": "Aucun fichier fourni"}, status=400)
             
        result = ProductImportService.import_products(request.FILES['file'])
        
        if result['success']:
             return Response(result)
        else:
             return Response(result, status=400)



    @action(detail=True, methods=['get'])
    def stock(self, request, pk=None):
        """Retourne le stock détaillé par point de vente pour ce produit"""
        product = self.get_object()
        inventory = Inventory.objects.filter(product=product)
        serializer = InventorySerializer(inventory, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def global_stock_stats(self, request):
        """Retourne les statistiques globales des stocks sur tous les points de vente"""
        from django.db.models import Sum, Count, F, Q, Max, Min
        
        # 1. Statistiques générales
        total_products = Product.objects.count()
        
        # Valeur totale du stock (quantité * prix de vente)
        total_stock_value = Inventory.objects.aggregate(
            total=Sum(F('quantity') * F('product__selling_price'))
        )['total'] or Decimal('0.00')
        
        # Produits en stock (au moins 1 unité quelque part)
        products_in_stock = Product.objects.filter(
            inventory__quantity__gt=0
        ).distinct().count()
        
        # Produits en stock faible (quantité <= seuil de réapprovisionnement)
        products_low_stock = Inventory.objects.filter(
            quantity__lte=F('reorder_level'),
            quantity__gt=0
        ).values('product').distinct().count()
        
        # Produits en rupture totale (0 partout)
        products_out_of_stock = Product.objects.annotate(
            total_qty=Sum('inventory__quantity')
        ).filter(
            Q(total_qty=0) | Q(total_qty__isnull=True)
        ).count()
        
        # 2. Répartition par point de vente
        pos_stats = PointOfSale.objects.annotate(
            product_count=Count('inventory', filter=Q(inventory__quantity__gt=0)),
            total_quantity=Sum('inventory__quantity'),
            total_value=Sum(F('inventory__quantity') * F('inventory__product__selling_price'))
        ).values(
            'id', 'name', 'code', 'city',
            'product_count', 'total_quantity', 'total_value'
        ).order_by('-total_value')
        
        by_point_of_sale = []
        for pos in pos_stats:
            by_point_of_sale.append({
                'id': pos['id'],
                'name': pos['name'],
                'code': pos['code'],
                'city': pos['city'] or '',
                'product_count': pos['product_count'] or 0,
                'total_quantity': pos['total_quantity'] or 0,
                'total_value': float(pos['total_value'] or 0)
            })
        
        # 3. Produits avec stock déséquilibré
        # (grande différence entre le stock max et min entre les POS)
        imbalanced_threshold = 50  # Configurable
        
        products_with_variance = Product.objects.annotate(
            max_stock=Max('inventory__quantity'),
            min_stock=Min('inventory__quantity'),
            total_stock=Sum('inventory__quantity'),
            stock_variance=F('max_stock') - F('min_stock'),
            pos_count=Count('inventory')
        ).filter(
            stock_variance__gt=imbalanced_threshold,
            pos_count__gt=1  # Au moins 2 points de vente
        ).order_by('-stock_variance')[:10]
        
        imbalanced_products = []
        for product in products_with_variance:
            # Récupérer les détails par POS pour ce produit
            pos_details = Inventory.objects.filter(
                product=product
            ).select_related('point_of_sale').values(
                'point_of_sale__name',
                'point_of_sale__code',
                'quantity'
            ).order_by('-quantity')
            
            imbalanced_products.append({
                'id': product.id,
                'name': product.name,
                'sku': product.sku,
                'total_stock': product.total_stock or 0,
                'max_stock': product.max_stock or 0,
                'min_stock': product.min_stock or 0,
                'variance': product.stock_variance or 0,
                'distribution': list(pos_details)
            })
        
        # 4. Alertes de stock faible global
        low_stock_alerts = []
        low_stock_inventories = Inventory.objects.filter(
            quantity__lte=F('reorder_level'),
            quantity__gt=0
        ).select_related('product', 'point_of_sale').order_by('quantity')[:20]
        
        for inv in low_stock_inventories:
            low_stock_alerts.append({
                'product_id': inv.product.id,
                'product_name': inv.product.name,
                'sku': inv.product.sku,
                'pos_name': inv.point_of_sale.name,
                'pos_code': inv.point_of_sale.code,
                'quantity': inv.quantity,
                'reorder_level': inv.reorder_level,
                'status': inv.get_status()
            })
        
        # 5. Top produits par valeur de stock
        top_products_by_value = Product.objects.annotate(
            total_qty=Sum('inventory__quantity'),
            stock_value=Sum(F('inventory__quantity') * F('selling_price'))
        ).filter(
            total_qty__gt=0
        ).order_by('-stock_value')[:10]
        
        top_products = []
        for product in top_products_by_value:
            top_products.append({
                'id': product.id,
                'name': product.name,
                'sku': product.sku,
                'total_quantity': product.total_qty or 0,
                'stock_value': float(product.stock_value or 0),
                'selling_price': float(product.selling_price)
            })
        
        return Response({
            'summary': {
                'total_products': total_products,
                'total_stock_value': float(total_stock_value),
                'products_in_stock': products_in_stock,
                'products_low_stock': products_low_stock,
                'products_out_of_stock': products_out_of_stock
            },
            'by_point_of_sale': by_point_of_sale,
            'imbalanced_products': imbalanced_products,
            'low_stock_alerts': low_stock_alerts,
            'top_products_by_value': top_products
        })

class InventoryViewSet(viewsets.ModelViewSet):
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['point_of_sale', 'product']

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        inventory = self.filter_queryset(self.get_queryset())
        headers = [
            'ID', 'Produit', 'SKU', 'Point de Vente', 
            'Quantité', 'P.U Vente', 'Montant Total', 'Seuil Réappro.', 'Dernière Mise à jour', 'Statut'
        ]
        
        data = []
        for item in inventory:
            data.append([
                item.id,
                item.product.name,
                item.product.sku,
                item.point_of_sale.name,
                item.quantity,
                float(item.product.selling_price),
                float(item.quantity * item.product.selling_price),
                item.reorder_level,
                item.last_updated.strftime('%d/%m/%Y %H:%M'),
                item.get_status_display()
            ])
            
        return export_to_excel(headers, data, "État des Stocks par Point de Vente", "InventairePOS")

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        inventory = self.filter_queryset(self.get_queryset())
        headers = ['Produit', 'SKU', 'Magasin', 'Quantité', 'Prix Vente', 'Montant Total', 'Statut']
        
        data = []
        for item in inventory:
            data.append([
                item.product.name,
                item.product.sku,
                item.point_of_sale.name,
                item.quantity,
                f"{float(item.product.selling_price):,.0f} GNF",
                f"{float(item.quantity * item.product.selling_price):,.0f} GNF",
                item.get_status_display()
            ])
            
        return export_to_pdf(headers, data, "Rapport d'Inventaire par Emplacement", "InventairePOS")

class StockMovementViewSet(viewsets.ModelViewSet):
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['product', 'movement_type', 'from_point_of_sale', 'to_point_of_sale']
    search_fields = ['product__name', 'reference', 'notes']
    ordering_fields = ['created_at']

    def get_queryset(self):
        queryset = StockMovement.objects.all().order_by('-created_at')
        
        # Date filtering support
        date_param = self.request.query_params.get('date')
        start_date_param = self.request.query_params.get('start_date')
        end_date_param = self.request.query_params.get('end_date')
        
        if date_param:
            # Single date filter
            try:
                from datetime import datetime
                filter_date = datetime.strptime(date_param, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date=filter_date)
            except ValueError:
                pass
        elif start_date_param or end_date_param:
            # Date range filter
            try:
                from datetime import datetime
                if start_date_param:
                    start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
                    queryset = queryset.filter(created_at__date__gte=start_date)
                if end_date_param:
                    end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
                    queryset = queryset.filter(created_at__date__lte=end_date)
            except ValueError:
                pass
        
        return queryset


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'invoice_type', 'client', 'point_of_sale']
    search_fields = ['invoice_number', 'client__name']
    ordering_fields = ['date_issued', 'created_at']

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        invoices = self.filter_queryset(self.get_queryset())
        headers = ['Numéro', 'Client', 'Type', 'Date', 'Statut', 'Total', 'Reste à payer']
        data = [[
            i.invoice_number, i.client.name, i.get_invoice_type_display(),
            i.date_issued.strftime('%d/%m/%Y'), i.get_status_display(),
            float(i.total_amount), float(i.get_remaining_amount())
        ] for i in invoices]
        return export_to_excel(headers, data, "Registre des Factures", "Factures")

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        invoices = self.filter_queryset(self.get_queryset())
        headers = ['Numéro', 'Client', 'Date', 'Statut', 'Total', 'Reste à payer']
        data = [[
            i.invoice_number, i.client.name, i.date_issued.strftime('%d/%m/%Y'),
            i.get_status_display(), f"{float(i.total_amount):,.0f} GNF",
            f"{float(i.get_remaining_amount()):,.0f} GNF"
        ] for i in invoices]
        return export_to_pdf(headers, data, "Journal des Ventes", "Ventes")

    @action(detail=True, methods=['get'], renderer_classes=[PDFRenderer])
    def download_pdf(self, request, pk=None):
        invoice = self.get_object()
        print(f"DEBUG: Downloading PDF for invoice {invoice.invoice_number}")
        print(f"DEBUG: Invoice items count: {invoice.invoiceitem_set.count()}")
        from .pdf_utils import export_invoice_to_pdf
        return export_invoice_to_pdf(invoice)

class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.all()
    serializer_class = ReceiptSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'supplier']

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        receipts = self.filter_queryset(self.get_queryset())
        headers = ['Référence', 'Fournisseur', 'Date Réception', 'Statut', 'Total']
        data = [[
            r.receipt_number, r.supplier.name, r.date_received.strftime('%d/%m/%Y'),
            r.get_status_display(), float(r.total_amount)
        ] for r in receipts]
        return export_to_excel(headers, data, "Registre des Achats", "Achats")

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        receipts = self.filter_queryset(self.get_queryset())
        headers = ['Réf', 'Fournisseur', 'Date', 'Total']
        data = [[
            r.receipt_number, r.supplier.name, r.date_received.strftime('%d/%m/%Y'),
            f"{float(r.total_amount):,.0f} GNF"
        ] for r in receipts]
        return export_to_pdf(headers, data, "Journal des Achats", "Achats")

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['invoice', 'payment_method']

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category', 'point_of_sale', 'date']

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        expenses = self.filter_queryset(self.get_queryset())
        headers = ['Référence', 'Catégorie', 'Date', 'Description', 'Montant']
        data = [[
            e.reference, e.category.name, e.date.strftime('%d/%m/%Y'),
            e.description, float(e.amount)
        ] for e in expenses]
        return export_to_excel(headers, data, "Registre des Dépenses", "Depenses")

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        expenses = self.filter_queryset(self.get_queryset())
        headers = ['Date', 'Catégorie', 'Description', 'Montant']
        data = [[
            e.date.strftime('%d/%m/%Y'), e.category.name, e.description,
            f"{float(e.amount):,.0f} GNF"
        ] for e in expenses]
        return export_to_pdf(headers, data, "État des Dépenses", "Depenses")

class MonthlyProfitReportViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MonthlyProfitReport.objects.all()
    serializer_class = MonthlyProfitReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['year', 'month', 'point_of_sale']
    ordering_fields = ['year', 'month']
class DashboardView(viewsets.ViewSet):
    """Vue pour les statistiques du tableau de bord"""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        from django.utils import timezone
        from django.db.models import Sum, Count, F
        from sales.models import Order, OrderItem
        from django.db.models.functions import TruncDate
        from .models import Expense
        from datetime import datetime, date, timedelta
        
        today = timezone.now().date()
        
        # Parse Pagination Params
        def get_page(param_name):
            try:
                return max(1, int(request.query_params.get(param_name, 1)))
            except (ValueError, TypeError):
                return 1

        p_low = get_page('p_low')
        p_move = get_page('p_move')
        p_ret = get_page('p_ret')
        p_def = get_page('p_def')
        p_rem = get_page('p_rem')
        page_size = 5

        # Parse Date Params
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')
        
        start_date = None
        end_date = None
        
        if start_date_param and end_date_param:
            try:
                start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
            except ValueError:
                pass
        
        # 1. KPI Cards Data
        # -----------------
        
        # Ventes du jour (Always Today)
        today_orders = Order.objects.filter(date_created__date=today)
        today_sales_count = today_orders.count()
        today_revenue = today_orders.aggregate(total=Sum('total_amount'))['total'] or 0
        
        # Ventes totales (Global)
        total_sales_value = Order.objects.aggregate(total=Sum('total_amount'))['total'] or 0
        
        # Commandes en attente (Pending)
        pending_orders_count = Order.objects.filter(status='pending').count()
        
        # Nombre total de produits
        total_products_count = Product.objects.count()

        # Valeur totale du stock
        # Somme de (quantité * prix_achat) pour tous les inventaires
        total_stock_value = Inventory.objects.aggregate(
            total_value=Sum(F('quantity') * F('product__purchase_price'))
        )['total_value'] or 0
        
        # Stock bas (Count)
        low_stock_count = Inventory.objects.filter(quantity__lte=F('reorder_level')).count()
        low_stock_products = []
        
        # 2. Lists Data
        # -------------
        
        # Produits en stock faible (Tableau)
        low_stock_qs = Inventory.objects.filter(quantity__lte=F('reorder_level')).select_related('product', 'point_of_sale')
        low_stock_count_total = low_stock_qs.count()
        low_stock_inventories = low_stock_qs[(p_low-1)*page_size : p_low*page_size]
        
        low_stock_results = []
        for inv in low_stock_inventories:
            low_stock_results.append({
                "id": inv.product.id,
                "name": inv.product.name,
                "quantity": inv.quantity,
                "threshold": inv.reorder_level,
                "pos_name": inv.point_of_sale.name,
                "image": inv.product.image.url if inv.product.image else None
            })
        
        low_stock_products = {
            "results": low_stock_results,
            "count": low_stock_count_total,
            "page": p_low,
            "total_pages": (low_stock_count_total + page_size - 1) // page_size
        }

        # Derniers mouvements de stock (Tableau)
        movements_qs = StockMovement.objects.select_related('product', 'from_point_of_sale', 'to_point_of_sale').all()
        movements_count_total = movements_qs.count()
        latest_movements = movements_qs.order_by('-created_at')[(p_move-1)*page_size : p_move*page_size]
        
        movements_results = []
        for move in latest_movements:
            movements_results.append({
                "id": move.id,
                "date": move.created_at,
                "product": move.product.name,
                "type": move.get_movement_type_display(),
                "quantity": move.quantity,
                "pos_name": move.from_point_of_sale.name,
                "target_pos_name": move.to_point_of_sale.name if move.to_point_of_sale else None,
                "is_wholesale": move.is_wholesale
            })
        
        latest_stock_movements = {
            "results": movements_results,
            "count": movements_count_total,
            "page": p_move,
            "total_pages": (movements_count_total + page_size - 1) // page_size
        }

        # Produits retournés (Tableau)
        returns_qs = StockMovement.objects.filter(movement_type='return').select_related('product', 'from_point_of_sale')
        returns_count_total = returns_qs.count()
        returns = returns_qs.order_by('-created_at')[(p_ret-1)*page_size : p_ret*page_size]
        
        returned_results = [{
            "id": m.id,
            "date": m.created_at,
            "product": m.product.name,
            "quantity": m.quantity,
            "pos_name": m.from_point_of_sale.name
        } for m in returns]

        returned_products = {
            "results": returned_results,
            "count": returns_count_total,
            "page": p_ret,
            "total_pages": (returns_count_total + page_size - 1) // page_size
        }
        
        # Produits défectueux (Tableau)
        defective_qs = StockMovement.objects.filter(movement_type='defective').select_related('product', 'from_point_of_sale')
        defective_count_total = defective_qs.count()
        defective = defective_qs.order_by('-created_at')[(p_def-1)*page_size : p_def*page_size]
        
        defective_results = [{
            "id": m.id,
            "date": m.created_at,
            "product": m.product.name,
            "quantity": m.quantity,
            "pos_name": m.from_point_of_sale.name
        } for m in defective]

        defective_products = {
            "results": defective_results,
            "count": defective_count_total,
            "page": p_def,
            "total_pages": (defective_count_total + page_size - 1) // page_size
        }
        
        # Produits restants (Tableau)
        remaining_qs = Inventory.objects.filter(quantity__gt=0).select_related('product', 'point_of_sale')
        remaining_count_total = remaining_qs.count()
        remaining_inventories = remaining_qs.order_by('product__name')[(p_rem-1)*page_size : p_rem*page_size]
        
        remaining_results = []
        for inv in remaining_inventories:
            remaining_results.append({
                "id": inv.id,
                "product": inv.product.name,
                "quantity": inv.quantity,
                "amount": float(inv.quantity * inv.product.purchase_price),
                "pos_name": inv.point_of_sale.name
            })
            
        remaining_products = {
            "results": remaining_results,
            "count": remaining_count_total,
            "page": p_rem,
            "total_pages": (remaining_count_total + page_size - 1) // page_size
        }


        # 3. Charts & Financial Data
        # --------------------------

        # Determine Date Range for financials
        if start_date and end_date:
            period_start = start_date
            period_end = end_date
            history_start = start_date
            history_end = end_date
        else:
            # Default: Current Month for totals, Last 30 days for history graph
            period_start = today.replace(day=1)
            period_end = today
            history_start = today - timedelta(days=30)
            history_end = today

        # Revenu sur la période
        period_orders = Order.objects.filter(date_created__date__gte=period_start, date_created__date__lte=period_end)
        monthly_revenue = period_orders.aggregate(total=Sum('total_amount'))['total'] or 0
        
        # Dépenses sur la période
        period_expenses = Expense.objects.filter(date__gte=period_start, date__lte=period_end)
        monthly_expenses = period_expenses.aggregate(total=Sum('amount'))['total'] or 0
        
        # Profit net estimé
        estimated_profit = float(monthly_revenue) - float(monthly_expenses)

        # Historique (Graphique)
        history_results = self._get_history_data(request)
        monthly_history = history_results['monthly_list']
        
        # Évolution des mouvements de stock (Entrées vs Sorties - Période ou 7 jours défaut)
        movement_start = start_date if start_date else (today - timedelta(days=7))
        movement_end = end_date if end_date else today
        
        movements_stats = (
            StockMovement.objects
            .filter(created_at__date__range=[movement_start, movement_end])
            .annotate(day=TruncDate('created_at'))
            .values('day', 'movement_type')
            .annotate(total_qty=Sum('quantity'))
            .order_by('day')
        )
        
        stock_movement_evolution = []
        current_date_loop = movement_start
        
        while current_date_loop <= movement_end:
            date_str = current_date_loop.strftime('%Y-%m-%d')
            display_date = current_date_loop.strftime('%d %b')
            
            daily_moves = StockMovement.objects.filter(created_at__date=current_date_loop)
            
            in_qty = daily_moves.filter(movement_type__in=['entry', 'return', 'adjustment']).aggregate(t=Sum('quantity'))['t'] or 0
            out_qty = daily_moves.filter(movement_type__in=['exit', 'defective', 'transfer']).aggregate(t=Sum('quantity'))['t'] or 0
            
            stock_movement_evolution.append({
                "name": display_date,
                "entries": in_qty,
                "exits": out_qty
            })
            current_date_loop += timedelta(days=1)


        # Répartition des stocks par catégorie (Pie Chart)
        category_stats = (
             Inventory.objects
             .values('product__category__name')
             .annotate(value=Sum(F('quantity') * F('product__purchase_price')))
             .order_by('-value')
         )
        
        stock_distribution_by_category = []
        for stat in category_stats:
             if stat['value'] and stat['value'] > 0:
                stock_distribution_by_category.append({
                    "name": stat['product__category__name'],
                    "value": float(stat['value'])
                })

        # Top Selling Products (NEW)
        # Based on revenue in the selected period (or default 30 days history period)
        top_selling_qs = (
            OrderItem.objects
            .filter(order__date_created__date__range=[history_start, history_end])
            .values('product__name')
            .annotate(value=Sum('total_price'), quantity=Sum('quantity'))
            .order_by('-value')[:5]
        )
        
        top_selling_products = []
        for item in top_selling_qs:
            top_selling_products.append({
                "name": item['product__name'],
                "value": float(item['value']),
                "quantity": item['quantity']
            })

        # Activités récentes
        recent_orders = Order.objects.select_related('client').order_by('-date_created')[:5]
        recent_activities = []
        for order in recent_orders:
            recent_activities.append({
                "id": order.id,
                "type": "sale",
                "reference": order.order_number,
                "amount": float(order.total_amount),
                "date": order.date_created,
                "description": f"Vente #{order.order_number}"
            })
        
        return Response({
            # KPIs
            "today_sales": float(today_revenue),
            "today_orders": today_sales_count,
            "low_stock_count": low_stock_count,
            "monthly_revenue": float(monthly_revenue),
            "monthly_expenses": float(monthly_expenses),
            "net_profit": float(estimated_profit),
            "total_sales_value": float(total_sales_value),
            "total_stock_value": float(total_stock_value),
            "pending_orders_count": pending_orders_count,
            "total_products_count": total_products_count,
            
            # Lists
            "low_stock_products": low_stock_products,
            "latest_stock_movements": latest_stock_movements,
            "returned_products": returned_products,
            "defective_products": defective_products,
            "remaining_products": remaining_products,
            "top_selling_products": top_selling_products,
            
            # Charts / Graphs
            "monthly_history": monthly_history,
            "stock_movement_evolution": stock_movement_evolution,
            "stock_distribution_by_category": stock_distribution_by_category,
            
            # Legacy / Misc
            "recent_activities": recent_activities
        })

    def _get_history_data(self, request, default_start_date=None, default_end_date=None):
        """Helper to get history data for exports and display"""
        from sales.models import Order
        from .models import Expense
        from django.db.models import Sum
        from django.db.models.functions import TruncDate
        from datetime import datetime, timedelta, date
        from django.utils import timezone
        
        today = timezone.now().date()
        
        # Parse Dates
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')
        
        if start_date_param and end_date_param:
            try:
                history_start = datetime.strptime(start_date_param, '%Y-%m-%d').date()
                history_end = datetime.strptime(end_date_param, '%Y-%m-%d').date()
            except ValueError:
                history_start = default_start_date if default_start_date else (today - timedelta(days=30))
                history_end = default_end_date if default_end_date else today
        else:
            history_start = default_start_date if default_start_date else (today - timedelta(days=30))
            history_end = default_end_date if default_end_date else today

        # Sales
        daily_stats = (
            Order.objects
            .filter(date_created__date__range=[history_start, history_end])
            .annotate(day=TruncDate('date_created'))
            .values('day')
            .annotate(revenue=Sum('total_amount'))
            .order_by('day')
        )
        stats_dict = {}
        for stat in daily_stats:
            if stat['day']:
                day_key = stat['day'].strftime('%Y-%m-%d') if isinstance(stat['day'], (date, datetime)) else str(stat['day'])
                stats_dict[day_key] = float(stat['revenue'] or 0)

        # Expenses
        daily_expenses_stats = (
            Expense.objects
            .filter(date__range=[history_start, history_end])
            .values('date')
            .annotate(expenses=Sum('amount'), day=F('date'))
            .order_by('date')
        )
        expenses_dict = {}
        for stat in daily_expenses_stats:
            if stat['day']:
                day_key = stat['day'].strftime('%Y-%m-%d') if isinstance(stat['day'], (date, datetime)) else str(stat['day'])
                expenses_dict[day_key] = float(stat['expenses'] or 0)

        monthly_list = []
        tabular_data = [] # For exports
        current_date_loop = history_start
        while current_date_loop <= history_end:
            date_str = current_date_loop.strftime('%Y-%m-%d')
            display_date = current_date_loop.strftime('%d %b')
            rev = float(stats_dict.get(date_str, 0))
            exp = float(expenses_dict.get(date_str, 0))
            
            monthly_list.append({
                "name": display_date,
                "month": display_date,
                "revenue": rev,
                "expenses": exp,
                "profit": rev - exp
            })
            
            tabular_data.append([
                current_date_loop.strftime('%d/%m/%Y'),
                rev,
                exp,
                rev - exp
            ])
            current_date_loop += timedelta(days=1)
            
        return {
            'monthly_list': monthly_list,
            'tabular_data': tabular_data
        }

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        """Exportation du rapport d'évolution en PDF"""
        from .pdf_utils import export_to_pdf
        data = self._get_history_data(request)['tabular_data']
        headers = ['Date', 'Ventes (GNF)', 'Dépenses (GNF)', 'Profit (GNF)']
        return export_to_pdf(headers, data, "Rapport d'Évolution des Ventes", "Rapport_Ventes")

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """Exportation du rapport d'évolution en Excel"""
        from .excel_utils import export_to_excel
        data = self._get_history_data(request)['tabular_data']
        headers = ['Date', 'Ventes', 'Dépenses', 'Profit']
        return export_to_excel(headers, data, "Évolution des Ventes", "Rapport_Ventes")

class QuoteViewSet(viewsets.ModelViewSet):
    queryset = Quote.objects.all()
    serializer_class = QuoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'status': ['exact'],
        'quote_type': ['exact'],
        'client': ['exact'],
        'date_issued': ['gte', 'lte'],
    }
    search_fields = ['quote_number', 'client__name']
    ordering_fields = ['date_issued', 'created_at']

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        quotes = self.filter_queryset(self.get_queryset())
        headers = ['Numéro', 'Client', 'Type', 'Date', 'Statut', 'Total', 'Valide Jusqu\'au']
        data = [[
            q.quote_number, q.client.name, q.get_quote_type_display(),
            q.date_issued.strftime('%d/%m/%Y'), q.get_status_display(),
            float(q.total_amount), q.valid_until.strftime('%d/%m/%Y') if q.valid_until else "N/A"
        ] for q in quotes]
        return export_to_excel(headers, data, "Registre des Devis", "Devis")

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        quotes = self.filter_queryset(self.get_queryset())
        headers = ['Numéro', 'Client', 'Date', 'Statut', 'Total']
        data = [[
            q.quote_number, q.client.name, q.date_issued.strftime('%d/%m/%Y'),
            q.get_status_display(), f"{float(q.total_amount):,.0f} GNF"
        ] for q in quotes]
        return export_to_pdf(headers, data, "Journal des Devis", "Devis")

    @action(detail=True, methods=['get'], renderer_classes=[PDFRenderer])
    def download_pdf(self, request, pk=None):
        """Exportation d'un devis unique en PDF"""
        quote = self.get_object()
        from .pdf_utils import export_quote_to_pdf
        return export_quote_to_pdf(quote)

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        """Convertit un devis en facture via l'API"""
        quote = self.get_object()
        if quote.status == 'converted':
            return Response({"error": "Ce devis est déjà converti en facture."}, status=400)
        
        invoice = quote.convert_to_invoice()
        if invoice:
            return Response({
                "message": "Devis converti avec succès.",
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number
            })
        return Response({"error": "Échec de la conversion du devis."}, status=500)

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Retourne uniquement les notifications de l'utilisateur connecté"""
        if not self.request.user or not self.request.user.is_authenticated:
            return self.queryset.none()
        return self.queryset.filter(recipient=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Marquer toutes les notifications comme lues"""
        self.get_queryset().update(is_read=True)
        return Response({'status': 'success'})
        
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Marquer une notification comme lue"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'success'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Compter les notifications non lues"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})
