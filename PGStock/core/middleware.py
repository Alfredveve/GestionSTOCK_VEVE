"""
Middleware to handle JWT authentication errors gracefully.
This catches InvalidToken exceptions that occur during request.user access,
before DRF's exception handler can process them.
"""
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.exceptions import AuthenticationFailed
from django.http import JsonResponse
import logging

logger = logging.getLogger(__name__)


class JWTAuthenticationMiddleware:
    """
    Middleware to catch JWT authentication errors early in the request cycle.
    This prevents SystemError crashes when tokens are expired or invalid.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        try:
            response = self.get_response(request)
            return response
        except (InvalidToken, TokenError, AuthenticationFailed) as exc:
            # Log the authentication error
            exc_class_name = exc.__class__.__name__
            logger.warning(f"JWT Authentication error caught by middleware: {exc_class_name}")
            
            # Extract detail message if available
            detail_msg = "Token is invalid or expired"
            messages = []
            
            if hasattr(exc, 'detail'):
                if isinstance(exc.detail, dict):
                    detail_msg = exc.detail.get('detail', detail_msg)
                    messages = exc.detail.get('messages', [])
                elif isinstance(exc.detail, str):
                    detail_msg = exc.detail
            
            # Return a proper 401 JSON response
            return JsonResponse(
                {
                    "detail": detail_msg,
                    "code": "token_not_valid",
                    "messages": messages
                },
                status=401
            )
        except Exception as exc:
            # Let other exceptions bubble up normally
            raise
