from .settings import *

# Override database for testing to use SQLite
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db_test.sqlite3',
    }
}

# Simplify password hashing for faster tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Ensure we're not using any PostgreSQL-specific settings
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
