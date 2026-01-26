import os
import django
from django.conf import settings
from django.core.mail import send_mail
from decouple import config

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
django.setup()

def verify_email_settings():
    print("=== Verification Configuration Email ===")
    print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"EMAIL_HOST_USER: {'*' * 5 if settings.EMAIL_HOST_USER else 'Non défini'}")
    print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    print("========================================")

    if settings.EMAIL_BACKEND == 'django.core.mail.backends.smtp.EmailBackend':
        if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
            print("\n[ATTENTION] La configuration SMTP est sélectionnée mais le USER ou PASSWORD est manquant.")
            print("Veuillez configurer .env avec vos identifiants Gmail/Outlook.")
            return

    try:
        print("\nTentative d'envoi d'email de test...")
        send_mail(
            'Test Configuration Email',
            'Ceci est un test pour vérifier que la configuration email fonctionne.',
            settings.DEFAULT_FROM_EMAIL,
            ['test_verification@example.com'],
            fail_silently=False,
        )
        print("[SUCCÈS] Email envoyé avec succès (ou affiché dans la console si backend console).")
    except Exception as e:
        print(f"\n[ERREUR] Impossible d'envoyer l'email: {e}")
        print("\nSi vous utilisez Gmail, vérifiez :")
        print("1. Avez-vous utilisé un Mot de passe d'application ?")
        print("2. Avez-vous activé l'accès IMAP/SMTP ?")
        print("\nSi vous utilisez Outlook :")
        print("1. Avez-vous activé Authenticated SMTP ?")


if __name__ == "__main__":
    verify_email_settings()
