"""
Base Service Class

Provides common functionality for all services:
- Logging
- Error handling
- Validation utilities
"""

import logging
from typing import Any, Dict, Optional
from django.core.exceptions import ValidationError
from django.db import transaction
from decimal import Decimal


class ServiceException(Exception):
    """Custom exception for service layer errors"""
    pass


class BaseService:
    """
    Base class for all business services.
    
    Provides:
    - Configured logger
    - Common validation methods
    - Error handling utilities
    """
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
    
    @staticmethod
    def validate_positive_decimal(value: Any, field_name: str = "Valeur") -> Decimal:
        """
        Validate that a value is a positive decimal.
        
        Args:
            value: Value to validate
            field_name: Name of the field for error messages
            
        Returns:
            Decimal value
            
        Raises:
            ValidationError: If value is not positive
        """
        try:
            decimal_value = Decimal(str(value))
            if decimal_value <= 0:
                raise ValidationError(f"{field_name} doit être supérieur à 0.")
            return decimal_value
        except (ValueError, TypeError):
            raise ValidationError(f"{field_name} doit être un nombre valide.")
    
    @staticmethod
    def validate_non_negative_decimal(value: Any, field_name: str = "Valeur") -> Decimal:
        """
        Validate that a value is a non-negative decimal.
        
        Args:
            value: Value to validate
            field_name: Name of the field for error messages
            
        Returns:
            Decimal value
            
        Raises:
            ValidationError: If value is negative
        """
        try:
            decimal_value = Decimal(str(value))
            if decimal_value < 0:
                raise ValidationError(f"{field_name} ne peut pas être négatif.")
            return decimal_value
        except (ValueError, TypeError):
            raise ValidationError(f"{field_name} doit être un nombre valide.")
    
    @staticmethod
    def validate_required(value: Any, field_name: str) -> Any:
        """
        Validate that a required field is not None or empty.
        
        Args:
            value: Value to validate
            field_name: Name of the field for error messages
            
        Returns:
            The value if valid
            
        Raises:
            ValidationError: If value is None or empty
        """
        if value is None or (isinstance(value, str) and not value.strip()):
            raise ValidationError(f"{field_name} est requis.")
        return value
    
    def log_info(self, message: str, **kwargs):
        """Log an info message with optional context"""
        self.logger.info(message, extra=kwargs)
    
    def log_warning(self, message: str, **kwargs):
        """Log a warning message with optional context"""
        self.logger.warning(message, extra=kwargs)
    
    def log_error(self, message: str, **kwargs):
        """Log an error message with optional context"""
        self.logger.error(message, extra=kwargs)
    
    def log_exception(self, message: str, exc_info=True):
        """Log an exception with traceback"""
        self.logger.exception(message, exc_info=exc_info)
