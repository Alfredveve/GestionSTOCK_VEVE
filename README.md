# 📦 GestionSTOCK

Système de gestion de stock professionnel avec architecture moderne **SPA (React)** & **API (Django)**.

## 📋 Description

GestionSTOCK est une solution complète pour la gestion commerciale et logistique :

- 📊 **Inventaire & Produits** : Gestion avancée, suivi des stocks, seuils d'alerte.
- 🏪 **Multi-POS** : Points de vente multiples avec interfaces dédiées.
- 💰 **Ventes & Achats** : Gestion des factures, devis (quotes), et commandes fournisseurs.
- 💹 **Gestion Financière** : Suivi des dépenses, rapports de profits, et flux de trésorerie.
- 📈 **Rapports Dynamiques** : Graphiques interactifs et exports PDF/Excel.
- 🔐 **Permissions** : Système de rôles granulaires (Admin, Superuser, Staff).

## 🏗️ Architecture & Technologies

L'application utilise une architecture découplée (Decoupled API/SPA) pour une performance et une maintenabilité optimales.

### 💻 Frontend (SPA)

- **Framework** : [React 19](https://react.dev/)
- **Build Tool** : [Vite 7](https://vitejs.dev/)
- **Langage** : TypeScript
- **Styling** : [Tailwind CSS 4](https://tailwindcss.com/) & Radix UI
- **State Management** : Zustand
- **Data Fetching** : TanStack React Query v5
- **Charts** : Recharts
- **Icons** : Lucide React

### ⚙️ Backend (API)

- **Framework** : [Django 5.2](https://www.djangoproject.com/)
- **API** : Django REST Framework (DRF)
- **Auth** : JWT (SimpleJWT)
- **Base de données** : PostgreSQL (Production), SQLite (Dev)
- **Génération PDF** : WeasyPrint
- **Exports Excel** : Openpyxl

---

## 🚀 Installation & Configuration

### 1. Cloner le projet

```bash
git clone https://github.com/Alfredveve/GestionSTOCK_VEVE.git
cd GestionSTOCK
```

### 2. Backend (Django)

```bash
cd PGStock

# Créer et activer l'environnement virtuel
python -m venv venv
# Windows: venv\Scripts\activate | Linux: source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
cp .env.example .env  # Éditer .env avec vos clés

# Migrations et Superutilisateur
python manage.py migrate
python manage.py createsuperuser

# Lancer le serveur API (Port 8000 par défaut)
python manage.py runserver
```

### 3. Frontend (React)

```bash
cd ../frontend

# Installer les dépendances
npm install

# Lancer le mode développement (Port 5173 par défaut)
npm run dev
```

---

## 🛠️ Installation sur une nouvelle machine (Clone)

Si vous venez de cloner le dépôt sur un nouvel ordinateur, suivez ces étapes cruciales pour éviter les erreurs courantes (dépendances manquantes, base de données inexistante).

### 1. Pré-requis
- **Python 3.10+** et **Node.js 18+** installés.
- **PostgreSQL** installé et en cours d'exécution.

### 2. Installation Backend (Django)

```bash
# A la racine du projet
python -m venv venv

# Activation (Windows)
.\venv\Scripts\activate
# Activation (Mac/Linux)
# source venv/bin/activate

# Installation des dépendances (depuis la racine !)
pip install -r requirements.txt

# Initialisation de la Base de Données
# Assurez-vous que PostgreSQL tourne. L'utilisateur par défaut est 'postgres' avec mdp 'veve' (voir .env)
# Si la base n'existe pas, créez-la :
createdb -U postgres pgstock

# Migrations
cd PGStock
python manage.py migrate
```

**Note :** Si vous rencontrez une erreur `UnicodeDecodeError` lors de la connexion à la base de données, cela signifie souvent que la base n'existe pas et que le message d'erreur français fait planter le pilote. Créez la base manuellement.

### 3. Installation Frontend (React)

```bash
cd ../frontend
npm install
```

### 4. Lancer le projet

Terminal 1 (Backend) :
```bash
cd PGStock
python manage.py runserver
```

Terminal 2 (Frontend) :
```bash
cd frontend
npm run dev
```

---

## 🔧 Dépannage (Troubleshooting)

### Erreur : `ModuleNotFoundError: No module named '...'`
Cela signifie que des dépendances manquent. Relancez l'installation à la racine :
```bash
pip install -r requirements.txt
```

### Erreur : `UnicodeDecodeError: 'utf-8' codec can't decode...`
C'est une erreur masquée. Elle survient quand PostgreSQL renvoie un message d'erreur avec des accents (ex: "La base n'existe pas") et que Windows/Python échouent à le lire.
**Solution :**
1. Vérifiez que la base de données `pgstock` existe bien.
2. Forcez l'anglais pour voir la vraie erreur :
   ```powershell
   $env:LC_ALL="C"; $env:PGCLIENTENCODING="latin-1"; python manage.py migrate
   ```

## 📂 Structure du Projet

```text
GestionSTOCK/
├── PGStock/                # Backend Django API
│   ├── core/               # Logique d'authentification
│   ├── inventory/          # Gestion des produits & stock
│   ├── sales/              # Ventes & Facturation
│   ├── purchasing/         # Achats fournisseurs
│   └── stock/              # Mouvements de stock
├── frontend/               # SPA React
│   ├── src/
│   │   ├── components/     # Composants UI réutilisables
│   │   ├── pages/          # Vues principales de l'application
│   │   ├── services/       # Appels API (Axios/React Query)
│   │   ├── store/          # Gestion d'état (Zustand)
│   │   └── types/          # Définitions TypeScript
└── .gitignore              # Configuration Git
```

## 🔐 Sécurité

- ✅ Authentification sécurisée via **JWT**.
- ✅ Gestion stricte des variables d'environnement via `.env` (non commité).
- ✅ Validation des entrées côté API et Frontend.
- ✅ Système de permissions Django pour restreindre l'accès aux données sensibles.

## 📚 Documentation Additionnelle

- **[Manuel Utilisateur](MANUEL_UTILISATEUR.md)** - Guide d'utilisation des fonctionnalités.
- **[Guide Git](GIT_GUIDE.md)** - Guide pour les contributeurs.

---

**Propriétaire** : Alfred VEVE  
**Contact** : <vevebea2022@outlook.fr>  
**Dernière mise à jour** : Février 2026
