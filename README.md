# 📦 GestionSTOCK

Système de gestion de stock professionnel développé avec Django.

## 📋 Description

GestionSTOCK est une application web complète pour la gestion de stock, incluant :

- 📊 Gestion des produits et inventaire
- 🏪 Gestion multi-points de vente (POS)
- 📝 Facturation et gestion des clients
- 👥 Gestion des fournisseurs
- 📈 Rapports et statistiques
- 🔐 Système de permissions utilisateurs (Admin, Superuser, Staff)

## 🚀 Installation

### Prérequis

- Python 3.8 ou supérieur
- pip (gestionnaire de paquets Python)
- Git

### 1. Cloner le projet

```bash
git clone https://github.com/VOTRE-USERNAME/GestionSTOCK.git
cd GestionSTOCK
```

### 2. Créer un environnement virtuel

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 3. Installer les dépendances

```bash
pip install -r requirements.txt
```

### 4. Configuration des variables d'environnement

```bash
# Copier le fichier exemple
copy .env.example .env

# Éditer .env avec vos vraies valeurs
notepad .env
```

**Variables importantes à configurer dans `.env` :**

```env
SECRET_KEY=votre-cle-secrete-django
DEBUG=True
EMAIL_HOST_USER=votre-email@gmail.com
EMAIL_HOST_PASSWORD=votre-mot-de-passe-application
```

> ⚠️ **IMPORTANT** : Ne jamais commiter le fichier `.env` sur GitHub !

### 5. Appliquer les migrations

```bash
cd PGStock
python manage.py migrate
```

### 6. Créer un superutilisateur

```bash
python manage.py createsuperuser
```

### 7. Lancer le serveur de développement

```bash
python manage.py runserver
```

L'application sera accessible sur : `http://127.0.0.1:8000/`

## 📚 Documentation

- **[Guide Git](GIT_GUIDE.md)** - Guide complet pour utiliser Git avec ce projet
- **[Documentation Django](https://docs.djangoproject.com/)** - Documentation officielle de Django

## 🏗️ Structure du projet

```
GestionSTOCK/
├── PGStock/              # Projet Django principal
│   ├── PGStock/          # Configuration du projet
│   ├── inventory/        # Application principale
│   ├── manage.py         # Script de gestion Django
│   └── db.sqlite3        # Base de données (non commité)
├── .env                  # Variables d'environnement (non commité)
├── .env.example          # Exemple de configuration
├── .gitignore            # Fichiers ignorés par Git
├── GIT_GUIDE.md          # Guide Git
└── README.md             # Ce fichier
```

## 🔐 Sécurité

Ce projet utilise des variables d'environnement pour protéger les données sensibles :

- ✅ Fichier `.env` pour les secrets (non commité)
- ✅ Fichier `.gitignore` configuré
- ✅ Utilisation de `python-decouple` pour la configuration

**Ne jamais commiter :**
- Fichiers `.env`
- Base de données avec données réelles
- Mots de passe ou tokens

### Configuration e-mail (Sécurisée)

 - **Toujours** stocker les identifiants SMTP dans des variables d'environnement (fichier `.env` local non commité). Ce projet utilise `python-decouple`.
 - **Gmail** : préférez un mot de passe d'application (App Password) plutôt que le mot de passe principal. Activez l'authentification à deux facteurs puis générez un mot de passe d'application.
 - **TLS/SSL** : utilisez `EMAIL_USE_TLS=True` et `EMAIL_PORT=587` pour TLS, ou `EMAIL_USE_SSL=True` et `EMAIL_PORT=465` si vous préférez SSL en prod.
 - **DEBUG** : laissez `DEBUG=True` en développement. En production, mettez `DEBUG=False` et vérifiez `ALLOWED_HOSTS` et `DEFAULT_FROM_EMAIL`.
 - **Transactional Email Provider** : pour la production, utilisez des services spécialisés (SendGrid, Mailgun, Amazon SES) plutôt que SMTP direct si vous envoyez un grand volume.
 - **Logs & Monitoring** : surveillez les erreurs d'envoi via vos logs (Sentry, Papertrail) et activez l'envoi d'alerte si nécessaire.

Tests locaux sûrs
 - Pour tester sans envoyer d'e-mails réels, activez dans `.env` : `EMAIL_FILE_BASED=True`. Les e-mails seront écrits dans `sent_emails/` (ignoré par Git).
 - Vous pouvez aussi utiliser le backend console (défaut en dev) : les e-mails s'affichent dans le terminal où tourne `manage.py runserver`.

Commande de test
 - Une commande de gestion est fournie pour tester l'envoi en respectant la configuration actuelle :

```powershell
# Exemple : envoyer un e-mail de test à votre adresse
cd PGStock
python manage.py send_test_mail --to vous@exemple.com --subject "Test e-mail" --body "Corps du message"
```

 - La commande affiche quel `EMAIL_BACKEND` est utilisé et, si le backend fichier est activé, le chemin où le fichier a été créé.

Bonnes pratiques de sécurité
 - Ne mettez jamais de credentials SMTP dans le dépôt.
 - Utilisez un compte dédié aux envois (adresse `no-reply@votredomaine` ou compte transactionnel).
 - Protégez l'accès à la console de production et limitez qui peut déclencher des envois massifs.

## 🌿 Workflow Git

Nous utilisons une stratégie de branches simple :

```
main (production)
  ↑
develop (développement)
  ↑
feature/xxx (fonctionnalités)
```

Consultez le [Guide Git](GIT_GUIDE.md) pour plus de détails.

## 🛠️ Technologies utilisées

- **Backend** : Django 4.x
- **Frontend** : HTML, CSS, JavaScript, Tailwind CSS, DaisyUI
- **Base de données** : SQLite (développement), PostgreSQL (production recommandée)
- **Authentification** : Django Auth avec permissions personnalisées

## 👥 Rôles et permissions

- **ADMIN** : Accès complet au système
- **SUPERUSER** : Gestion multi-POS, rapports globaux
- **STAFF** : Gestion d'un seul point de vente

## 📧 Contact

- **Email** : vevebea2022@outlook.fr
- **GitHub** : [Créer un ticket](https://github.com/VOTRE-USERNAME/GestionSTOCK/issues)

## 📄 Licence

Ce projet est privé et propriétaire.

---

**Dernière mise à jour** : 6 décembre 2025
