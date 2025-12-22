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

__all__ = [
    'StockService',
    'InvoiceService',
    'ReceiptService',
    'PaymentService',
]
