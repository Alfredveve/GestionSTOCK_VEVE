from .models import Settings

def company_settings(request):
    """
    Context processor to make company settings available in all templates.
    """
    settings = Settings.objects.first()
    if not settings:
        # Return default values if no settings exist
        return {
            'company_settings': {
                'company_name': 'GestionSTOCK',
                'company_logo': None,
                'language': 'fr',
                'currency': 'GNF',
                'email_notifications': True
            }
        }
    return {'company_settings': settings}
