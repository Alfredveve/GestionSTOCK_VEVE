from rest_framework import viewsets, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Category, Supplier, Product, Inventory, StockMovement, Invoice, Receipt, Payment, Expense, MonthlyProfitReport, Quote
from .serializers import (
    CategorySerializer, SupplierSerializer, ProductSerializer, 
    InventorySerializer, StockMovementSerializer, InvoiceSerializer,
    ReceiptSerializer, PaymentSerializer, ExpenseSerializer, MonthlyProfitReportSerializer,
    QuoteSerializer
)
from django.db.models import F, Sum, Count
from django.db import models

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

    @action(detail=True, methods=['get'])
    def stock(self, request, pk=None):
        """Retourne le stock détaillé par point de vente pour ce produit"""
        product = self.get_object()
        inventory = Inventory.objects.filter(product=product)
        serializer = InventorySerializer(inventory, many=True)
        return Response(serializer.data)

class InventoryViewSet(viewsets.ModelViewSet):
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['point_of_sale', 'product']

class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['product', 'movement_type', 'from_point_of_sale', 'to_point_of_sale']
    ordering_fields = ['created_at']

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'invoice_type', 'client', 'point_of_sale']
    search_fields = ['invoice_number', 'client__name']
    ordering_fields = ['date_issued', 'created_at']

class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.all()
    serializer_class = ReceiptSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'supplier']

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
        from django.db.models import Sum, Count
        from sales.models import Order
        
        today = timezone.now().date()
        
        # Ventes du jour
        today_orders = Order.objects.filter(created_at__date=today)
        today_sales_count = today_orders.count()
        today_revenue = today_orders.aggregate(total=Sum('total_amount'))['total'] or 0
        
        # Stock bas
        low_stock_count = Product.objects.filter(current_stock__lte=F('reorder_level')).count()
        
        # Revenu mensuel (mois en cours)
        first_day_of_month = today.replace(day=1)
        monthly_orders = Order.objects.filter(created_at__date__gte=first_day_of_month)
        monthly_revenue = monthly_orders.aggregate(total=Sum('total_amount'))['total'] or 0
        
        return Response({
            "today_sales": float(today_revenue),
            "today_orders": today_sales_count,
            "low_stock_count": low_stock_count,
            "monthly_revenue": float(monthly_revenue)
        })

class QuoteViewSet(viewsets.ModelViewSet):
    queryset = Quote.objects.all()
    serializer_class = QuoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'quote_type', 'client']
    search_fields = ['quote_number', 'client__name']
    ordering_fields = ['date_issued', 'created_at']

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
