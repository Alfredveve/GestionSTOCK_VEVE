from rest_framework import serializers
from .models import Order, OrderItem

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'quantity', 'unit_price', 'discount', 'total_price'
        ]
        read_only_fields = ['total_price']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    pos_name = serializers.CharField(source='point_of_sale.name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    apply_tax = serializers.BooleanField(write_only=True, required=False)
    invoice_type = serializers.CharField(write_only=True, required=False)


    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 
            'client', 'client_name',
            'point_of_sale', 'pos_name',
            'order_type', 'invoice_type', 'status', 'payment_status',
            'date_created', 'date_delivery_expected',
            'subtotal', 'tax_amount', 'total_amount',
            'amount_paid', 'payment_method',
            'notes', 'created_by', 'created_by_name',
            'items', 'apply_tax'
        ]
        read_only_fields = [
            'order_number', 'payment_status', 
            'date_created', 'subtotal', 'tax_amount', 'total_amount',
            'created_by'
        ]

    def validate(self, attrs):
        # Validation stricte du stock (Règle: Interdit si Stock <= 2)
        point_of_sale = attrs.get('point_of_sale')
        
        # Fallback pour récupérer le point_of_sale si non présent dans attrs (cas particuliers DRF)
        if not point_of_sale and 'point_of_sale' in self.initial_data:
            try:
                from inventory.models import PointOfSale
                pos_id = self.initial_data.get('point_of_sale')
                if pos_id:
                     point_of_sale = PointOfSale.objects.get(pk=pos_id)
            except (PointOfSale.DoesNotExist, ImportError):
                pass

        items_data = attrs.get('items', [])
        
        if point_of_sale and items_data:
            from inventory.models import Inventory
            for item in items_data:
                product = item.get('product')
                try:
                    inventory = Inventory.objects.get(product=product, point_of_sale=point_of_sale)
                    # La règle est stricte : si le stock DISPONIBLE est <= 2, on bloque TOUTE vente
                    if inventory.quantity <= 2:
                        raise serializers.ValidationError({
                            'detail': f"La vente de ce produit ({product.name}) est interdite car la q<=2, donc veuillez approvisonner le stock"
                        })
                except Inventory.DoesNotExist:
                    # Pas d'inventaire = Stock 0 -> Donc <= 2 -> Bloqué
                    raise serializers.ValidationError({
                        'detail': f"La vente de ce produit ({product.name}) est interdite car la q<=2 (Stock inexistant), donc veuillez approvisonner le stock"
                    })
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Handle field mapping from frontend
        if 'invoice_type' in validated_data and 'order_type' not in validated_data:
            validated_data['order_type'] = validated_data.pop('invoice_type')
        
        # apply_tax is currently not used in Order model directly, but might be needed for logic
        # For now we just pop it to avoid unexpected keyword argument errors
        validated_data.pop('apply_tax', None)
        
        if self.context.get('request') and self.context.get('request').user:
            validated_data['created_by'] = self.context.get('request').user

        order = Order.objects.create(**validated_data)
        
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
        
        # Recalculate totals after items are added
        order.update_totals()
        
        # Deduct stock after order and items are created
        try:
            order.deduct_stock()
        except Exception as e:
            # If stock deduction fails, delete the order and raise the error
            order.delete()
            raise serializers.ValidationError({
                'detail': f'Échec de la déduction du stock: {str(e)}'
            })
        
        return order
