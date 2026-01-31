from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Category, Supplier, Product, Inventory, StockMovement, Client, PointOfSale, Settings, Notification
from django.db.models import Sum

class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settings
        fields = [
            'id', 'company_name', 'language', 'currency', 
            'default_order_type', 'email_notifications', 'daily_reports', 
            'new_customer_notifications', 'smart_rounding'
        ]

class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(source='get_product_count', read_only=True)
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'product_count', 'created_at']

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_superuser', 'is_staff']

class PointOfSaleSerializer(serializers.ModelSerializer):
    manager_username = serializers.CharField(source='manager.username', read_only=True)
    
    class Meta:
        model = PointOfSale
        fields = ['id', 'name', 'code', 'address', 'city', 'phone', 'manager', 'manager_username', 'manager_name', 'is_active', 'is_warehouse', 'created_at']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True, allow_null=True)
    current_stock = serializers.SerializerMethodField()
    stock_status = serializers.CharField(source='get_stock_status', read_only=True)
    stock_analysis = serializers.SerializerMethodField()

    def get_current_stock(self, obj):
        """Calculer le stock basé sur le point de vente si présent dans les paramètres"""
        request = self.context.get('request')
        if request:
            pos_id = request.query_params.get('point_of_sale') or request.query_params.get('pos_id')
            if pos_id:
                try:
                    from .models import Inventory
                    inv = Inventory.objects.get(product=obj, point_of_sale_id=pos_id)
                    return inv.quantity
                except Exception:
                    return 0
        return obj.get_total_stock_quantity()
    
    def get_stock_analysis(self, obj):
        """Retourne les données d'analyse du stock (Colis, Unités, Analyse)"""
        return obj.get_analysis_data()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'description', 
            'category', 'category_name',
            'supplier', 'supplier_name',
            'purchase_price', 'selling_price', 'margin',
            'units_per_box', 'wholesale_purchase_price', 
            'wholesale_selling_price', 'wholesale_margin',
            'image', 'current_stock', 'stock_status', 'stock_analysis',
            'reorder_level', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'sku': {'required': False, 'allow_blank': True}
        }

class InventorySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    pos_name = serializers.CharField(source='point_of_sale.name', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    selling_price = serializers.DecimalField(source='product.selling_price', read_only=True, max_digits=12, decimal_places=2)
    total_value = serializers.SerializerMethodField()
    stock_analysis = serializers.SerializerMethodField()
    
    def get_total_value(self, obj):
        """Calcule la valeur monétaire totale de cet inventaire (quantité * prix de vente)"""
        try:
            return float(obj.quantity * obj.product.selling_price)
        except (TypeError, ValueError, AttributeError):
            return 0.0
        
    def get_stock_analysis(self, obj):
        """Retourne les données d'analyse du stock (Colis, Unités, Analyse) pour cet inventaire"""
        return obj.get_analysis_data()
    
    class Meta:
        model = Inventory
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'point_of_sale', 'pos_name',
            'quantity', 'reorder_level', 'location', 
            'last_updated', 'status_label', 'stock_analysis',
            'selling_price', 'total_value'
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
            'discount', 'total', 'margin', 'purchase_price'
        ]
        read_only_fields = ['total', 'margin', 'purchase_price']

    def validate_discount(self, value):
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError("La remise doit être comprise entre 0 et 100%.")
        return value


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(source='invoiceitem_set', many=True, required=False)
    client_name = serializers.CharField(source='client.name', read_only=True)
    pos_name = serializers.CharField(source='point_of_sale.name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    balance = serializers.DecimalField(source='get_remaining_amount', max_digits=20, decimal_places=2, read_only=True)
    date_issued = serializers.DateField(required=False, allow_null=True)
    date_due = serializers.DateField(required=False, allow_null=True)
    payment_method = serializers.CharField(write_only=True, required=False, allow_blank=True)
    amount_paid = serializers.DecimalField(write_only=True, required=False, max_digits=20, decimal_places=2)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'client', 'client_name',
            'invoice_type', 'point_of_sale', 'pos_name',
            'date_issued', 'date_due', 'status', 
            'subtotal', 'discount_amount', 'total_amount', 'total_profit',
            'balance', 'notes', 
            'created_by', 'created_by_name',
            'created_at', 'items', 'payment_method', 'amount_paid'
        ]
        read_only_fields = ['invoice_number', 'subtotal', 'total_amount', 'total_profit', 'created_by']
    
    def create(self, validated_data):
        from datetime import date, timedelta
        
        # Extract items data
        items_data = validated_data.pop('items', [])
        # Also check for 'invoiceitem_set' which matches the error
        if 'invoiceitem_set' in validated_data:
             items_data = validated_data.pop('invoiceitem_set')
        
        payment_method = validated_data.pop('payment_method', None)
        amount_paid = validated_data.pop('amount_paid', None)
        
        # Set default dates if missing
        if 'date_issued' not in validated_data:
            validated_data['date_issued'] = date.today()
        if 'date_due' not in validated_data:
            validated_data['date_due'] = date.today() + timedelta(days=30)
            
        # Set created_by
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
            
        # Generate invoice number if missing
        # We don't need to create a dummy instance just to generate ID if we have the logic
        if 'invoice_number' not in validated_data:
             temp_instance = Invoice()
             validated_data['invoice_number'] = temp_instance.generate_invoice_number()
        
        # Get point of sale for reference (validation logic removed)
        point_of_sale = validated_data.get('point_of_sale')
        
        # Fallback for point_of_sale if not present in validated_data
        if not point_of_sale and 'point_of_sale' in self.initial_data:
            try:
                pos_id = self.initial_data.get('point_of_sale')
                if pos_id:
                     point_of_sale = PointOfSale.objects.get(pk=pos_id)
            except PointOfSale.DoesNotExist:
                pass

        # Create the invoice
        invoice = Invoice.objects.create(**validated_data)
        
        # Create items
        for item_data in items_data:
            # Let the model handle calculations (total, purchase_price, margin)
            # as it already correctly handles Decimal conversion and logic.
            InvoiceItem.objects.create(
                invoice=invoice,
                **item_data
            )
            
        # Recalculate totals
        invoice.calculate_totals()
        
        # Handle payment if provided
        if payment_method and amount_paid is not None:
            Payment.objects.create(
                invoice=invoice,
                amount=amount_paid,
                payment_date=date.today(),
                payment_method=payment_method,
                reference=f"POS - {invoice.invoice_number}",
                notes="Paiement enregistré depuis le POS",
                created_by=invoice.created_by
            )
            
            # Update status based on balance
            invoice.update_status()
            
        return invoice

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
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    
    class Meta:
        model = QuoteItem
        fields = ['id', 'product', 'product_name', 'product_sku', 'quantity', 'unit_price', 'is_wholesale', 'discount', 'total']
        read_only_fields = ['total']

class QuoteSerializer(serializers.ModelSerializer):
    items = QuoteItemSerializer(source='quoteitem_set', many=True, required=False)
    client_name = serializers.CharField(source='client.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    date_issued = serializers.DateField(required=False, allow_null=True)
    valid_until = serializers.DateField(required=False, allow_null=True)
    
    class Meta:
        model = Quote
        fields = [
            'id', 'quote_number', 'client', 'client_name',
            'quote_type', 'date_issued', 'valid_until', 'status',
            'subtotal', 'total_amount',
            'notes', 'created_by', 'created_by_name',
            'created_at', 'items'
        ]
        read_only_fields = ['quote_number', 'subtotal', 'total_amount', 'created_by']

    def create(self, validated_data):
        from .models import QuoteItem
        from datetime import date
        
        items_data = validated_data.pop('quoteitem_set', [])
        
        # Set default dates if missing or null
        if not validated_data.get('date_issued'):
            validated_data['date_issued'] = date.today()
            
        if not validated_data.get('valid_until'):
            from datetime import timedelta
            validated_data['valid_until'] = date.today() + timedelta(days=30)
            
        # Set created_by
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
            
        # Generate quote number
        temp_instance = Quote()
        validated_data['quote_number'] = temp_instance.generate_quote_number()
        
        quote = Quote.objects.create(**validated_data)
        
        for item_data in items_data:
            QuoteItem.objects.create(quote=quote, **item_data)
            
        quote.calculate_totals()
        return quote

    def update(self, instance, validated_data):
        from .models import QuoteItem
        
        items_data = validated_data.pop('quoteitem_set', None)
        
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update items if provided
        if items_data is not None:
            # Simple approach: delete existing and recreateto ensure consistency
            instance.quoteitem_set.all().delete()
            for item_data in items_data:
                QuoteItem.objects.create(quote=instance, **item_data)
            
            instance.calculate_totals()
            
        return instance


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'title', 'message', 'notification_type', 'link', 'is_read', 'created_at']
        read_only_fields = ['created_at']
