from django.contrib import admin
from .models import (
    Category, Supplier, Client, Product, Inventory, 
    StockMovement, Invoice, InvoiceItem, Receipt, ReceiptItem, Payment, Settings,
    Quote, QuoteItem
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'get_product_count', 'created_at']
    search_fields = ['name', 'description']
    list_per_page = 20


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_person', 'email', 'phone', 'city', 'created_at']
    search_fields = ['name', 'contact_person', 'email', 'phone']
    list_filter = ['city', 'country', 'created_at']
    list_per_page = 20


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['name', 'client_type', 'contact_person', 'email', 'phone', 'city', 'created_at']
    search_fields = ['name', 'contact_person', 'email', 'phone', 'tax_id']
    list_filter = ['client_type', 'city', 'created_at']
    list_per_page = 20


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'sku', 'category', 'supplier', 'selling_price', 'get_stock_status', 'created_at']
    list_filter = ['category', 'supplier', 'created_at']
    search_fields = ['name', 'sku', 'description']
    list_per_page = 20


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ['product', 'quantity', 'reorder_level', 'get_status_display', 'location', 'last_updated']
    list_filter = ['last_updated']
    search_fields = ['product__name', 'product__sku', 'location']
    list_per_page = 20


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['product', 'movement_type', 'quantity', 'reference', 'user', 'created_at']
    list_filter = ['movement_type', 'created_at']
    search_fields = ['product__name', 'product__sku', 'reference', 'notes']
    readonly_fields = ['created_at']
    list_per_page = 20

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1
    fields = ['product', 'quantity', 'unit_price', 'discount', 'total']
    readonly_fields = ['total']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'client', 'date_issued', 'date_due', 'status', 'total_amount', 'created_at']
    list_filter = ['status', 'date_issued', 'created_at']
    search_fields = ['invoice_number', 'client__name', 'notes']
    readonly_fields = ['subtotal', 'tax_amount', 'total_amount', 'created_at', 'updated_at']
    inlines = [InvoiceItemInline]
    list_per_page = 20


class ReceiptItemInline(admin.TabularInline):
    model = ReceiptItem
    extra = 1
    fields = ['product', 'quantity', 'unit_cost', 'total']
    readonly_fields = ['total']


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ['receipt_number', 'supplier', 'date_received', 'status', 'total_amount', 'created_at']
    list_filter = ['status', 'date_received', 'created_at']
    search_fields = ['receipt_number', 'supplier__name', 'supplier_reference', 'notes']
    readonly_fields = ['total_amount', 'created_at', 'updated_at']
    inlines = [ReceiptItemInline]
    list_per_page = 20


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'amount', 'payment_date', 'payment_method', 'reference', 'created_by']
    list_filter = ['payment_method', 'payment_date', 'created_at']
    search_fields = ['invoice__invoice_number', 'reference', 'notes']
    readonly_fields = ['created_at']
    list_per_page = 20


@admin.register(Settings)
class SettingsAdmin(admin.ModelAdmin):
    list_display = ['company_name', 'language', 'currency', 'email_notifications']
    
    def has_add_permission(self, request):
        # Only allow one settings instance
        if self.model.objects.exists():
            return False
        return super().has_add_permission(request)


class QuoteItemInline(admin.TabularInline):
    model = QuoteItem
    extra = 1
    fields = ['product', 'quantity', 'unit_price', 'discount', 'total']
    readonly_fields = ['total']


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ['quote_number', 'client', 'date_issued', 'valid_until', 'status', 'total_amount', 'created_at']
    list_filter = ['status', 'date_issued', 'created_at']
    search_fields = ['quote_number', 'client__name', 'notes']
    readonly_fields = ['subtotal', 'tax_amount', 'total_amount', 'created_at', 'updated_at']
    inlines = [QuoteItemInline]
    list_per_page = 20
