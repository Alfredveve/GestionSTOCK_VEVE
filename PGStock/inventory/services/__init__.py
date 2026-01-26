"""
Service Layer for GestionSTOCK

This package contains business logic services following the Service Layer Pattern.
Services encapsulate complex business operations and ensure:
- Transaction atomicity
- Business rule validation
- Reusability across views, APIs, and background tasks
- Separation of concerns (Thin Views, Fat Services)
"""

from .stock_service import StockService
from .invoice_service import InvoiceService
from .receipt_service import ReceiptService
from .payment_service import PaymentService
from .finance_service import FinanceService
from .order_service import OrderService
from .quote_service import QuoteService
from .notification_service import NotificationService
from .report_service import ReportService
from .analytics_service import AnalyticsService
from .export_service import ExportService

__all__ = [
    'StockService',
    'InvoiceService',
    'ReceiptService',
    'PaymentService',
    'FinanceService',
    'OrderService',
    'QuoteService',
    'NotificationService',
    'ReportService',
    'AnalyticsService',
    'ExportService',
]

