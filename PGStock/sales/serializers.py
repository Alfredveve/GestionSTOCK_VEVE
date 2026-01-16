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

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    pos_name = serializers.CharField(source='point_of_sale.name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 
            'client', 'client_name',
            'point_of_sale', 'pos_name',
            'order_type', 'status', 'payment_status',
            'date_created', 'date_delivery_expected',
            'subtotal', 'tax_amount', 'total_amount',
            'notes', 'created_by', 'created_by_name',
            'items'
        ]
