from django.contrib import admin
from .models import Order, OrderItem

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1
    autocomplete_fields = ['product']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'client', 'order_type', 'status', 'total_amount', 'date_created']
    list_filter = ['order_type', 'status', 'payment_status', 'date_created']
    search_fields = ['order_number', 'client__name']
    inlines = [OrderItemInline]
    readonly_fields = ['subtotal', 'tax_amount', 'total_amount']
    date_hierarchy = 'date_created'
