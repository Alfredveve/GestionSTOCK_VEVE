from rest_framework import serializers
from .models import Category, Supplier, Product, Inventory, StockMovement
from django.db.models import Sum

class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(source='get_product_count', read_only=True)
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'product_count', 'created_at']

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True, allow_null=True)
    current_stock = serializers.IntegerField(source='get_total_stock_quantity', read_only=True)
    stock_status = serializers.CharField(source='get_stock_status', read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'description', 
            'category', 'category_name',
            'supplier', 'supplier_name',
            'purchase_price', 'selling_price', 'margin',
            'units_per_box', 'wholesale_purchase_price', 
            'wholesale_selling_price', 'wholesale_margin',
            'image', 'current_stock', 'stock_status',
            'created_at', 'updated_at'
        ]

class InventorySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    pos_name = serializers.CharField(source='point_of_sale.name', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Inventory
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'point_of_sale', 'pos_name',
            'quantity', 'reorder_level', 'location', 
            'last_updated', 'status_label'
        ]

class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    from_pos_name = serializers.CharField(source='from_point_of_sale.name', read_only=True)
    to_pos_name = serializers.CharField(source='to_point_of_sale.name', read_only=True, allow_null=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    type_display = serializers.CharField(source='get_movement_type_display', read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_name',
            'movement_type', 'type_display',
            'quantity', 'is_wholesale',
            'from_point_of_sale', 'from_pos_name',
            'to_point_of_sale', 'to_pos_name',
            'reference', 'notes', 'user', 'user_name',
            'created_at'
        ]

from .models import Invoice, InvoiceItem, Receipt, ReceiptItem, Payment, Expense, ExpenseCategory, MonthlyProfitReport, Quote, QuoteItem

class InvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    
    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'quantity', 'unit_price', 'is_wholesale',
            'discount', 'total', 'margin'
        ]

class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(source='invoiceitem_set', many=True, read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    pos_name = serializers.CharField(source='point_of_sale.name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    balance = serializers.DecimalField(source='get_remaining_amount', max_digits=20, decimal_places=2, read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'client', 'client_name',
            'invoice_type', 'point_of_sale', 'pos_name',
            'date_issued', 'date_due', 'status', 
            'subtotal', 'tax_rate', 'tax_amount', 
            'discount_amount', 'total_amount', 'total_profit',
            'balance', 'notes', 
            'created_by', 'created_by_name',
            'created_at', 'items'
        ]

class ReceiptItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = ReceiptItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_cost', 'is_wholesale', 'total']

class ReceiptSerializer(serializers.ModelSerializer):
    items = ReceiptItemSerializer(source='receiptitem_set', many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    pos_name = serializers.CharField(source='point_of_sale.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Receipt
        fields = [
            'id', 'receipt_number', 'supplier', 'supplier_name',
            'point_of_sale', 'pos_name',
            'date_received', 'supplier_reference', 'status',
            'total_amount', 'delivery_costs', 'notes',
            'created_at', 'items'
        ]

class PaymentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Payment
        fields = ['id', 'invoice', 'amount', 'payment_date', 'payment_method', 'reference', 'notes', 'created_by_name', 'created_at']

class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    pos_name = serializers.CharField(source='point_of_sale.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Expense
        fields = [
            'id', 'reference', 'category', 'category_name',
            'point_of_sale', 'pos_name',
            'amount', 'date', 'description',
            'created_by', 'created_by_name', 'created_at'
        ]

class MonthlyProfitReportSerializer(serializers.ModelSerializer):
    pos_name = serializers.CharField(source='point_of_sale.name', read_only=True)
    
    class Meta:
        model = MonthlyProfitReport
        fields = [
            'month', 'year', 'point_of_sale', 'pos_name',
            'total_sales_brut', 'total_discounts',
            'total_cost_of_goods', 'total_expenses',
            'gross_profit', 'net_interest', 'generated_at'
        ]

class QuoteItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = QuoteItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 'is_wholesale', 'discount', 'total']

class QuoteSerializer(serializers.ModelSerializer):
    items = QuoteItemSerializer(source='quoteitem_set', many=True, read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Quote
        fields = [
            'id', 'quote_number', 'client', 'client_name',
            'quote_type', 'date_issued', 'valid_until', 'status',
            'subtotal', 'tax_rate', 'tax_amount', 'total_amount',
            'notes', 'created_by', 'created_by_name',
            'created_at', 'items'
        ]

