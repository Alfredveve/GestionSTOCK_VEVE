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

Si vous venez de cloner le dépôt sur un nouvel ordinateur, suivez ces étapes cruciales :

1. **Dépendances Backend** :

   ```bash
   cd PGStock
   python -m venv venv
   # Activer venv...
   pip install -r requirements.txt
   ```

2. **Dépendances Frontend** :

   ```bash
   cd ../frontend
   npm install
   ```

3. **Variables d'Environnement** :
   Assurez-vous de créer les fichiers `.env` (basés sur les `.env.example` s'ils existent) dans les dossiers `PGStock` et `frontend`.
4. **Lancer les serveurs** :
   Ouvrez deux terminaux et lancez `python manage.py runserver` (Backend) et `npm run dev` (Frontend).

---

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
