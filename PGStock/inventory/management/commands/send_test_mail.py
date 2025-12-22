from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
import sys


class Command(BaseCommand):
    help = 'Send a test email to verify mail setup (uses current email backend).'

    def add_arguments(self, parser):
        parser.add_argument('--to', '-t', nargs='+', help='Recipient email(s)', required=True)
        parser.add_argument('--subject', '-s', default='PGStock test email', help='Subject')
        parser.add_argument('--body', '-b', default='Ceci est un e-mail de test depuis GestionSTOCK.', help='Body')
        parser.add_argument('--from-email', '-f', default=None, help='From email (defaults to DEFAULT_FROM_EMAIL)')

    def handle(self, *args, **options):
        to = options['to']
        subject = options['subject']
        body = options['body']
        from_email = options['from_email'] or getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'no-reply@example.com'

        self.stdout.write(f"Using EMAIL_BACKEND={getattr(settings, 'EMAIL_BACKEND', 'unknown')}")
        try:
            result = send_mail(subject, body, from_email, to, fail_silently=False)
            self.stdout.write(self.style.SUCCESS(f'send_mail returned: {result}'))
            # If file-based backend configured, show path
            if getattr(settings, 'EMAIL_FILE_PATH', None):
                self.stdout.write(self.style.SUCCESS(f'Emails are written to: {settings.EMAIL_FILE_PATH}'))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Error sending email: {e}'))
            import traceback
            traceback.print_exc()
            sys.exit(1)
