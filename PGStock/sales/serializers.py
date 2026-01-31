from rest_framework import serializers
from .models import Order, OrderItem

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    
    is_wholesale = serializers.BooleanField(write_only=True, required=False)
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'quantity', 'unit_price', 'discount', 'total_price',
            'is_wholesale'
        ]
        read_only_fields = ['total_price']

    def validate_discount(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("La remise doit être comprise entre 0 et 100%.")
        return value


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    pos_name = serializers.CharField(source='point_of_sale.name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    invoice_type = serializers.CharField(write_only=True, required=False)
    date_issued = serializers.DateField(write_only=True, required=False)
    date_due = serializers.DateField(write_only=True, required=False)


    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 
            'client', 'client_name',
            'point_of_sale', 'pos_name',
            'order_type', 'invoice_type', 'status', 'payment_status',
            'date_created', 'date_delivery_expected',
            'subtotal', 'discount', 'total_amount',
            'amount_paid', 'payment_method',
            'notes', 'created_by', 'created_by_name',
            'walk_in_name', 'walk_in_phone',
            'items', 'date_issued', 'date_due'
        ]
        read_only_fields = [
            'order_number', 'payment_status', 
            'date_created', 'subtotal', 'total_amount',
            'created_by'
        ]
        extra_kwargs = {
            'point_of_sale': {'required': False, 'allow_null': True},
            'client': {'required': False, 'allow_null': True},
        }

    def validate(self, attrs):
        if not attrs.get('client') and not attrs.get('walk_in_name'):
            raise serializers.ValidationError("Veuillez sélectionner un client ou saisir un nom pour le client de passage.")
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Handle field mapping from frontend
        if 'invoice_type' in validated_data and 'order_type' not in validated_data:
            validated_data['order_type'] = validated_data.pop('invoice_type')
        
        # Remove fields not present in Order model
        validated_data.pop('date_issued', None)
        validated_data.pop('date_due', None)
        validated_data.pop('invoice_type', None) # pop if it wasn't popped by order_type mapping
        
        if self.context.get('request') and self.context.get('request').user:
            validated_data['created_by'] = self.context.get('request').user

        # [AUTO-CREATE CLIENT for Walk-ins]
        # If walk_in_name is present, we treat this as a persistent client
        # We try to find an existing client by Name (and phone if possible) or create a new one.
        walk_in_name = validated_data.get('walk_in_name')
        if walk_in_name:
            from inventory.models import Client
            walk_in_phone = validated_data.get('walk_in_phone', '')
            
            # Simple deduplication strategy:
            # 1. Try to find by Phone (uniqueness is high)
            client = None
            if walk_in_phone:
                client = Client.objects.filter(phone=walk_in_phone).first()
            
            # 2. If not found by phone, try by Name
            if not client:
                client = Client.objects.filter(name__iexact=walk_in_name).first()
                
            # 3. If still not found, create new Client
            if not client:
                client = Client.objects.create(
                    name=walk_in_name,
                    phone=walk_in_phone if walk_in_phone else '',
                    client_type='individual',
                    notes="Client créé automatiquement (Passage)"
                )
            
            # Update the order to point to this specific client
            validated_data['client'] = client

        order = Order.objects.create(**validated_data)
        
        for item_data in items_data:
            item_data.pop('is_wholesale', None) # Remove if present
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
