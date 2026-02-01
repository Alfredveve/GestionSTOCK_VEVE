from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from inventory.api import (
    CategoryViewSet, SupplierViewSet, ProductViewSet, 
    InventoryViewSet, StockMovementViewSet, InvoiceViewSet,
    ReceiptViewSet, PaymentViewSet, ExpenseViewSet, MonthlyProfitReportViewSet,
    DashboardView, QuoteViewSet, ClientViewSet, PointOfSaleViewSet, ExpenseCategoryViewSet,
    SettingsViewSet, NotificationViewSet, UserViewSet, DiscountAnalyticsViewSet
)
from sales.api import OrderViewSet

# Create a router and register our viewsets with it.
router = DefaultRouter()

router.register(r'settings', SettingsViewSet)
router.register(r'users', UserViewSet)

# Inventory & Stock
router.register(r'categories', CategoryViewSet)
router.register(r'clients', ClientViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'pos', PointOfSaleViewSet)
router.register(r'products', ProductViewSet)
router.register(r'inventory', InventoryViewSet)
router.register(r'movements', StockMovementViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'receipts', ReceiptViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'expense-categories', ExpenseCategoryViewSet)
router.register(r'profit-reports', MonthlyProfitReportViewSet, basename='monthly-profit')
router.register(r'dashboard', DashboardView, basename='dashboard')
router.register(r'quotes', QuoteViewSet)
router.register(r'notifications', NotificationViewSet)
router.register(r'discount-analytics', DiscountAnalyticsViewSet, basename='discount-analytics')

# Sales
router.register(r'orders', OrderViewSet)

urlpatterns = [
    # API Router URLs
    path('', include(router.urls)),
    
    # Auth Endpoints (JWT)
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
