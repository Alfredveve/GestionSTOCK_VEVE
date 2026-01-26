import os

env_content = """# Configuration Django
DEBUG=True
SECRET_KEY=django-insecure-w_^vn98&qwrr8u+nyv6x^gb)^4v58bxc==5sn_cx+-=nk!vlpp

# Database
DB_NAME=pgstock
DB_USER=postgres
DB_PASSWORD=veve
DB_HOST=localhost
DB_PORT=5432

# Email
EMAIL_HOST_USER=codeshester@gmail.com
EMAIL_HOST_PASSWORD=votre_mot_de_passe
DEFAULT_FROM_EMAIL=codeshester@gmail.com
"""

with open(".env", "w", encoding="utf-8") as f:
    f.write(env_content)

print(".env file has been cleaned and updated.")
