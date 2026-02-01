from rest_framework import viewsets, filters, permissions
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
from .models import Order
from .serializers import OrderSerializer
from inventory.renderers import PDFRenderer

from inventory.permissions import POSFilterMixin, get_user_pos, is_admin

class OrderFilter(django_filters.FilterSet):
    payment_status = django_filters.ChoiceFilter(choices=Order.PAYMENT_STATUS_CHOICES)
    status = django_filters.ChoiceFilter(choices=Order.STATUS_CHOICES)
    date_created = django_filters.DateFromToRangeFilter()
    
    class Meta:
        model = Order
        fields = ['status', 'payment_status', 'client', 'order_type', 'point_of_sale']

class OrderViewSet(POSFilterMixin, viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = OrderFilter
    search_fields = ['order_number', 'client__name']
    ordering_fields = ['date_created', 'total_amount']
    pos_field = 'point_of_sale'
    
    def get_queryset(self):
        """
        Optimisation des requêtes: prefetch des relations courantes
        """
        queryset = super().get_queryset()
        return queryset.select_related('client', 'point_of_sale', 'created_by')

    def create(self, request, *args, **kwargs):
        # Restriction POS pour les vendeurs
        if not is_admin(request.user):
            user_pos = get_user_pos(request.user)
            req_pos_id = request.data.get('point_of_sale')
            if user_pos and req_pos_id and int(req_pos_id) != user_pos.id:
                from rest_framework.response import Response
                return Response(
                    {"detail": f"Accès refusé. Vous ne pouvez pas vendre pour le point de vente {req_pos_id}."}, 
                    status=403
                )
        
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Order Validation Error: {serializer.errors}")
            # Also print to stdout for immediate visibility in runserver
            print(f"Validation Error: {serializer.errors}")
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        orders = self.filter_queryset(self.get_queryset())
        headers = ['Numéro', 'Client', 'Type', 'Date', 'Statut', 'Total', 'Payé']
        data = [[
            o.order_number, o.client.name if o.client else "N/A", o.get_order_type_display(),
            o.date_created.strftime('%d/%m/%Y'), o.get_status_display(),
            float(o.total_amount), float(o.amount_paid)
        ] for o in orders]
        from inventory.excel_utils import export_to_excel
        return export_to_excel(headers, data, "Registre des Commandes", "Commandes")

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        orders = self.filter_queryset(self.get_queryset())
        headers = ['Numéro', 'Client', 'Date', 'Statut', 'Total']
        data = [[
            o.order_number, o.client.name if o.client else "N/A", o.date_created.strftime('%d/%m/%Y'),
            o.get_status_display(), f"{float(o.total_amount):,.0f} GNF"
        ] for o in orders]
        from inventory.pdf_utils import export_to_pdf
        return export_to_pdf(headers, data, "Journal des Commandes", "Commandes")

    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        """Enregistrer un paiement pour cette commande"""
        from rest_framework.response import Response # Move import to top
        print(f"DEBUG: add_payment payload: {request.data}") # Debug log
        order = self.get_object()
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method')
        
        if amount is None: # Check strictly for None, allow 0 if needed (though 0 payment is useless)
            print("DEBUG: Amount is None")
            from rest_framework.response import Response
            return Response({"error": "Montant requis (champ 'amount' manquant)"}, status=400)
            
        try:
            from decimal import Decimal
            amount_decimal = Decimal(str(amount))
            
            if amount_decimal <= 0:
                 from rest_framework.response import Response
                 return Response({"error": "Le montant doit être positif"}, status=400)

            # Mise à jour
            order.amount_paid += amount_decimal
            if payment_method:
                order.payment_method = payment_method
                
            # Recalculate status
            order.update_totals() 
            
            return Response({
                "message": "Paiement enregistré",
                "new_amount_paid": float(order.amount_paid),
                "status": order.status,
                "payment_status": order.payment_status
            })
        except Exception as e:
            print(f"DEBUG: add_payment Error: {e}")
            from rest_framework.response import Response
            return Response({"error": f"Erreur interne: {str(e)}"}, status=400)

    @action(detail=True, methods=['get'], renderer_classes=[PDFRenderer])
    def download_pdf(self, request, pk=None):
        from inventory.pdf_utils import export_order_to_pdf
        order = self.get_object()
        return export_order_to_pdf(order)
