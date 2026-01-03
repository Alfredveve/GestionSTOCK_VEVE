from django.urls import path
from . import views

app_name = 'inventory'

urlpatterns = [
    # Dashboard
    path('', views.dashboard, name='dashboard'),
    # Authentication
    path('login/', views.user_login, name='login'),
    path('logout/', views.user_logout, name='logout'),
    path('register/', views.user_register, name='register'),
    path('password-reset/', views.password_reset_request, name='password_reset_request'),
    path('password-reset/verify/', views.password_reset_verify, name='password_reset_verify'),
    path('password-reset/confirm/', views.password_reset_confirm, name='password_reset_confirm'),
    # User Management
    path('users/', views.user_list, name='user_list'),
    path('users/create/', views.user_create, name='user_create'),
    path('users/<int:pk>/update/', views.user_update, name='user_update'),
    path('users/<int:pk>/delete/', views.user_delete, name='user_delete'),
    # Category
    path('categories/', views.CategoryListView.as_view(), name='category_list'),
    path('categories/create/', views.CategoryCreateView.as_view(), name='category_create'),
    path('categories/<int:pk>/update/', views.CategoryUpdateView.as_view(), name='category_update'),
    path('categories/<int:pk>/delete/', views.CategoryDeleteView.as_view(), name='category_delete'),
    # Product
    path('products/', views.ProductListView.as_view(), name='product_list'),
    path('products/create/', views.ProductCreateView.as_view(), name='product_create'),
    path('products/<int:pk>/update/', views.ProductUpdateView.as_view(), name='product_update'),
    path('products/<int:pk>/delete/', views.ProductDeleteView.as_view(), name='product_delete'),
    path('products/<int:pk>/', views.product_detail, name='product_detail'),
    path('products/import/', views.product_import, name='product_import'),
    path('products/import/template/', views.download_product_template, name='product_import_template'),
    path('products/export/excel/', views.export_products_excel, name='export_products_excel'),
    path('products/export/pdf/', views.export_products_pdf, name='export_products_pdf'),
    # Inventory
    path('inventory/', views.inventory_list, name='inventory_list'),
    path('inventory/export/excel/', views.export_inventory_excel, name='export_inventory_excel'),
    path('inventory/export/pdf/', views.export_inventory_pdf, name='export_inventory_pdf'),
    path('inventory/<int:pk>/update/', views.inventory_update, name='inventory_update'),
    path('inventory/<int:pk>/', views.inventory_detail, name='inventory_detail'),
    # Stock Movement
    path('movements/', views.movement_list, name='movement_list'),
    path('movements/create/', views.movement_create, name='movement_create'),
    path('movements/<int:pk>/', views.movement_detail, name='movement_detail'),
    # Suppliers
    path('suppliers/', views.supplier_list, name='supplier_list'),
    path('suppliers/create/', views.supplier_create, name='supplier_create'),
    path('suppliers/<int:pk>/update/', views.supplier_update, name='supplier_update'),
    path('suppliers/<int:pk>/delete/', views.supplier_delete, name='supplier_delete'),
    path('suppliers/<int:pk>/', views.supplier_detail, name='supplier_detail'),
    # Clients
    path('clients/', views.client_list, name='client_list'),
    path('clients/create/', views.client_create, name='client_create'),
    path('clients/<int:pk>/update/', views.client_update, name='client_update'),
    path('clients/<int:pk>/delete/', views.client_delete, name='client_delete'),
    path('clients/<int:pk>/', views.client_detail, name='client_detail'),
    # Invoices
    path('invoices/', views.invoice_list, name='invoice_list'),
    path('invoices/create/', views.invoice_create, name='invoice_create'),
    path('invoices/<int:pk>/update/', views.invoice_update, name='invoice_update'),
    path('invoices/<int:pk>/delete/', views.invoice_delete, name='invoice_delete'),
    path('invoices/<int:pk>/', views.invoice_detail, name='invoice_detail'),
    path('invoices/<int:pk>/add_item/', views.invoice_add_item, name='invoice_add_item'),
    path('invoices/<int:pk>/delete_item/<int:item_pk>/', views.invoice_delete_item, name='invoice_delete_item'),
    path('invoices/<int:pk>/receipt/', views.invoice_receipt, name='invoice_receipt'),
    # Receipts
    path('receipts/', views.receipt_list, name='receipt_list'),
    path('receipts/create/', views.receipt_create, name='receipt_create'),
    path('receipts/export/excel/', views.export_receipt_list_excel, name='export_receipt_list_excel'),
    path('receipts/export/pdf/', views.export_receipt_list_pdf, name='export_receipt_list_pdf'),
    path('receipts/<int:pk>/update/', views.receipt_update, name='receipt_update'),
    path('receipts/<int:pk>/delete/', views.receipt_delete, name='receipt_delete'),
    path('receipts/<int:pk>/', views.receipt_detail, name='receipt_detail'),
    path('receipts/<int:pk>/add_item/', views.receipt_add_item, name='receipt_add_item'),
    path('receipts/<int:pk>/delete_item/<int:item_pk>/', views.receipt_delete_item, name='receipt_delete_item'),
    path('receipts/<int:pk>/status/<str:status>/', views.receipt_change_status, name='receipt_change_status'),
    path('receipts/<int:pk>/validate/', views.receipt_validate, name='receipt_validate'),
    # Quotes
    path('quotes/', views.quote_list, name='quote_list'),
    path('quotes/create/', views.quote_create, name='quote_create'),
    path('quotes/<int:pk>/update/', views.quote_update, name='quote_update'),
    path('quotes/<int:pk>/delete/', views.quote_delete, name='quote_delete'),
    path('quotes/<int:pk>/', views.quote_detail, name='quote_detail'),
    path('quotes/<int:pk>/convert/', views.quote_convert, name='quote_convert'),
    path('quotes/<int:pk>/add_item/', views.quote_add_item, name='quote_add_item'),
    path('quotes/<int:pk>/delete_item/<int:item_pk>/', views.quote_delete_item, name='quote_delete_item'),
    # API endpoints for charts
    path('api/stock-evolution/', views.api_stock_evolution, name='api_stock_evolution'),
    path('api/category-distribution/', views.api_category_distribution, name='api_category_distribution'),
    # Payments
    path('payments/', views.payment_list, name='payment_list'),
    path('invoices/<int:pk>/payment/', views.payment_create, name='payment_create'),
    # Settings
    path('settings/', views.settings_view, name='settings'),
    path('settings/profile/', views.update_profile, name='update_profile'),
    path('settings/password/', views.change_password, name='change_password'),
    # Reports
    path('reports/', views.reports_view, name='reports'),
    path('reports/export/excel/', views.export_reports_excel, name='export_reports_excel'),
    path('reports/export/pdf/', views.export_reports_pdf, name='export_reports_pdf'),
    # Points of Sale
    path('pos/', views.pos_list, name='pos_list'),
    path('pos/create/', views.pos_create, name='pos_create'),
    path('pos/<int:pk>/', views.pos_detail, name='pos_detail'),
    path('pos/<int:pk>/update/', views.pos_update, name='pos_update'),
    path('pos/<int:pk>/delete/', views.pos_delete, name='pos_delete'),
    path('pos/<int:pk>/replenish/', views.replenish_pos, name='replenish_pos'),
    # Quick Sale (POS)
    path('vendre/', views.quick_sale, name='quick_sale'),
    path('api/pos/products/', views.api_search_products, name='api_pos_search_products'),
    path('api/pos/clients/create/', views.api_create_client, name='api_pos_create_client'),
    # Bulk Stock Configuration
    path('stock/configure/', views.bulk_stock_configuration, name='bulk_stock_configuration'),
    # API endpoints for charts
    path('api/stock-evolution/', views.api_stock_evolution, name='api_stock_evolution'),
    path('api/category-distribution/', views.api_category_distribution, name='api_category_distribution'),
    path('api/monthly-revenue/', views.api_monthly_revenue, name='api_monthly_revenue'),
    path('api/product-sales-type/', views.api_product_sales_type, name='api_product_sales_type'),
    path('api/product/<int:pk>/info/', views.api_product_info, name='api_product_info'),
    # Reset Data
    path('settings/reset-data/', views.reset_data, name='reset_data'),
    
    # Advanced Reports
    path('reports/advanced/', views.advanced_reports_view, name='advanced_reports'),
    
    # Sales Activities Exports
    path('reports/sales-activities/excel/', views.export_sales_activities_excel, name='export_sales_activities_excel'),
    path('reports/sales-activities/pdf/', views.export_sales_activities_pdf, name='export_sales_activities_pdf'),
    
    # Invoice Status Exports
    path('reports/invoice-status/excel/', views.export_invoice_status_excel, name='export_invoice_status_excel'),
    path('reports/invoice-status/pdf/', views.export_invoice_status_pdf, name='export_invoice_status_pdf'),
    
    # Stock Distribution Exports
    path('reports/stock-distribution/excel/', views.export_stock_distribution_excel, name='export_stock_distribution_excel'),
    path('reports/stock-distribution/pdf/', views.export_stock_distribution_pdf, name='export_stock_distribution_pdf'),
    
    # Low Stock Exports
    path('reports/low-stock/excel/', views.export_low_stock_excel, name='export_low_stock_excel'),
    path('reports/low-stock/pdf/', views.export_low_stock_pdf, name='export_low_stock_pdf'),
    
    # Stock Movements Exports
    path('reports/stock-movements/excel/', views.export_stock_movements_excel, name='export_stock_movements_excel'),
    path('reports/stock-movements/pdf/', views.export_stock_movements_pdf, name='export_stock_movements_pdf'),
    
    # Returned Products Exports
    path('reports/returned-products/excel/', views.export_returned_products_excel, name='export_returned_products_excel'),
    path('reports/returned-products/pdf/', views.export_returned_products_pdf, name='export_returned_products_pdf'),
    
    # Gestion Financière (Dépenses & Profit)
    path('finance/expenses/', views.expense_list, name='expense_list'),
    path('finance/expenses/add/', views.expense_add, name='expense_add'),
    path('finance/expenses/<int:pk>/', views.expense_detail, name='expense_detail'),
    path('finance/expenses/<int:pk>/edit/', views.expense_edit, name='expense_edit'),
    path('finance/expenses/<int:pk>/delete/', views.expense_delete, name='expense_delete'),
    path('finance/profit-report/', views.profit_report, name='profit_report'),
]


