from django.utils import translation
from .models import Settings

class CompanySettingsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Get settings
        try:
            settings = Settings.objects.first()
            if settings and settings.language:
                translation.activate(settings.language)
                request.LANGUAGE_CODE = translation.get_language()
        except:
            pass

        response = self.get_response(request)
        return response
