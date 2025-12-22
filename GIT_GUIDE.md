# Guide Git - GestionSTOCK

Guide complet pour utiliser Git de manière sécurisée avec votre projet GestionSTOCK.

## 📋 Table des matières

1. [Configuration initiale](#configuration-initiale)
2. [Authentification GitHub](#authentification-github)
3. [Initialisation du projet](#initialisation-du-projet)
4. [Stratégie de branches](#stratégie-de-branches)
5. [Workflow quotidien](#workflow-quotidien)
6. [Commandes essentielles](#commandes-essentielles)
7. [Sécurité](#sécurité)

---

## 🔧 Configuration initiale

### 1. Installer Git

Si Git n'est pas installé, téléchargez-le depuis [git-scm.com](https://git-scm.com/)

### 2. Configurer votre identité

```bash
git config --global user.name "Votre Nom"
git config --global user.email "vevebea2022@outlook.fr"
```

### 3. Vérifier la configuration

```bash
git config --list
```

---

## 🔐 Authentification GitHub

GitHub ne permet plus l'authentification par mot de passe. Vous devez utiliser un **Personal Access Token (PAT)**.

### Créer un Personal Access Token

1. Connectez-vous sur [github.com](https://github.com)
2. Cliquez sur votre photo de profil → **Settings**
3. Dans le menu de gauche, allez à **Developer settings**
4. Cliquez sur **Personal access tokens** → **Tokens (classic)**
5. Cliquez sur **Generate new token (classic)**
6. Configurez le token :
   - **Note** : `GestionSTOCK-Dev` (nom descriptif)
   - **Expiration** : 90 jours (ou selon votre préférence)
   - **Scopes** : Cochez au minimum :
     - ✅ `repo` (accès complet aux dépôts privés)
     - ✅ `workflow` (si vous utilisez GitHub Actions)
7. Cliquez sur **Generate token**
8. **IMPORTANT** : Copiez le token immédiatement (vous ne pourrez plus le voir)

9. **Note** : Ne partagez jamais votre token !

### Utiliser le token

Quand Git vous demande un mot de passe, utilisez le **token** au lieu de votre mot de passe GitHub.

```bash
Username: vevebea2022@outlook.fr
Password: [COLLEZ VOTRE TOKEN ICI]
```

### Sauvegarder le token (optionnel)

Pour ne pas retaper le token à chaque fois :

```bash
# Windows - Gestionnaire d'identifications Windows
git config --global credential.helper wincred

# Ou utiliser le cache Git (15 minutes par défaut)
git config --global credential.helper cache
```

---

## 🚀 Initialisation du projet

### 1. Naviguer vers le projet

```bash
cd C:\Users\codeshester0011\Desktop\GestionSTOCK
```

### 2. Initialiser Git

```bash
git init
```

### 3. Créer le fichier .env

```bash
# Copier le fichier exemple
copy .env.example .env

# Éditer .env avec vos vraies valeurs (NE JAMAIS COMMITER CE FICHIER)
notepad .env
```

### 4. Premier commit

```bash
# Voir les fichiers à ajouter
git status

# Ajouter tous les fichiers (sauf ceux dans .gitignore)
git add .

# Créer le premier commit
git commit -m "Initial commit - Configuration du projet GestionSTOCK"
```

### 5. Créer le dépôt sur GitHub

1. Allez sur [github.com](https://github.com)
2. Cliquez sur **New repository**
3. Nom : `GestionSTOCK`
4. Description : `Système de gestion de stock avec Django`
5. **Privé** (recommandé pour les données sensibles)
6. **NE PAS** initialiser avec README, .gitignore ou licence
7. Cliquez sur **Create repository**

### 6. Lier le dépôt distant

```bash
# Remplacez VOTRE-USERNAME par votre nom d'utilisateur GitHub
git remote add origin https://github.com/VOTRE-USERNAME/GestionSTOCK.git

# Renommer la branche en main (si nécessaire)
git branch -M main

# Pousser vers GitHub
git push -u origin main
```

---

## 🌿 Stratégie de branches

Nous utilisons une stratégie simple et efficace :

```
main (production - code stable)
  ↑
develop (développement - code en cours)
  ↑
feature/xxx (nouvelles fonctionnalités)
fix/xxx (corrections de bugs)
```

### Branches principales

#### `main` - Production

- Code stable et testé
- Déployé en production
- **Protégée** : pas de push direct

#### `develop` - Développement

- Code en cours de développement
- Tests et validations
- Fusion régulière dans `main`

### Branches temporaires

#### `feature/nom-fonctionnalite`

Pour développer une nouvelle fonctionnalité :

```bash
git checkout develop
git checkout -b feature/gestion-fournisseurs
# ... développement ...
git push origin feature/gestion-fournisseurs
```

#### `fix/nom-bug`

Pour corriger un bug :

```bash
git checkout develop
git checkout -b fix/erreur-calcul-stock
# ... correction ...
git push origin fix/erreur-calcul-stock
```

### Créer les branches principales

```bash
# Créer et pousser la branche main
git checkout -b main
git push -u origin main

# Créer et pousser la branche develop
git checkout -b develop
git push -u origin develop
```

---

## 💼 Workflow quotidien

### 1. Commencer une nouvelle fonctionnalité

```bash
# Mettre à jour develop
git checkout develop
git pull origin develop

# Créer une nouvelle branche
git checkout -b feature/ma-nouvelle-fonctionnalite

# Travailler sur votre code...
```

### 2. Sauvegarder votre travail

```bash
# Voir les modifications
git status

# Voir les différences
git diff

# Ajouter les fichiers modifiés
git add .
# Ou ajouter des fichiers spécifiques
git add fichier1.py fichier2.py

# Créer un commit avec un message descriptif
git commit -m "Ajout de la fonctionnalité de gestion des fournisseurs"
```

### 3. Pousser vers GitHub

```bash
# Première fois
git push -u origin feature/ma-nouvelle-fonctionnalite

# Les fois suivantes
git push
```

### 4. Fusionner dans develop

```bash
# Retourner sur develop
git checkout develop

# Fusionner votre branche
git merge feature/ma-nouvelle-fonctionnalite

# Pousser develop
git push origin develop

# Supprimer la branche locale (optionnel)
git branch -d feature/ma-nouvelle-fonctionnalite
```

### 5. Mettre en production

```bash
# Quand develop est stable et testé
git checkout main
git merge develop
git push origin main

# Créer un tag de version
git tag -a v1.0.0 -m "Version 1.0.0 - Première release"
git push origin v1.0.0
```

---

## 📚 Commandes essentielles

### Informations

```bash
# Voir le statut des fichiers
git status

# Voir l'historique des commits
git log
git log --oneline
git log --graph --all --oneline

# Voir les différences
git diff                    # Modifications non ajoutées
git diff --staged          # Modifications ajoutées
git diff branche1 branche2 # Différences entre branches
```

### Branches

```bash
# Lister les branches
git branch              # Branches locales
git branch -a           # Toutes les branches (locales + distantes)

# Créer une branche
git branch nom-branche

# Changer de branche
git checkout nom-branche

# Créer et changer de branche
git checkout -b nom-branche

# Supprimer une branche
git branch -d nom-branche        # Locale
git push origin --delete nom-branche  # Distante
```

### Synchronisation

```bash
# Récupérer les modifications depuis GitHub
git pull origin nom-branche

# Pousser vers GitHub
git push origin nom-branche

# Récupérer les infos sans fusionner
git fetch origin
```

### Annulation

```bash
# Annuler les modifications d'un fichier (non ajouté)
git checkout -- fichier.py

# Retirer un fichier de l'index (après git add)
git reset HEAD fichier.py

# Annuler le dernier commit (garder les modifications)
git reset --soft HEAD~1

# Annuler le dernier commit (supprimer les modifications)
git reset --hard HEAD~1

# Revenir à un commit spécifique
git reset --hard <commit-hash>
```

### Stash (mettre de côté temporairement)

```bash
# Mettre de côté les modifications
git stash

# Voir la liste des stash
git stash list

# Récupérer le dernier stash
git stash pop

# Appliquer un stash spécifique
git stash apply stash@{0}
```

---

## 🔒 Sécurité

### ⚠️ NE JAMAIS COMMITER

- ❌ Fichiers `.env` (mots de passe, clés API)
- ❌ `SECRET_KEY` de Django
- ❌ Mots de passe en clair
- ❌ Tokens d'API
- ❌ Base de données avec données réelles
- ❌ Fichiers de configuration avec données sensibles

### ✅ Bonnes pratiques

1. **Toujours utiliser `.gitignore`**
   - Vérifiez que `.env` est bien ignoré
   - Vérifiez avant chaque commit : `git status`

2. **Utiliser des variables d'environnement**

   ```python
   # settings.py
   from decouple import config
   
   SECRET_KEY = config('SECRET_KEY')
   DEBUG = config('DEBUG', default=False, cast=bool)
   ```

3. **Vérifier avant de pousser**

   ```bash
   # Voir ce qui sera poussé
   git diff origin/main
   
   # Vérifier qu'aucun fichier sensible n'est tracké
   git ls-files | grep .env
   ```

4. **Utiliser SSH au lieu de HTTPS** (plus sécurisé)

   ```bash
   # Générer une clé SSH
   ssh-keygen -t ed25519 -C "vevebea2022@outlook.fr"
   
   # Ajouter la clé à GitHub (Settings → SSH and GPG keys)
   # Puis changer l'URL du dépôt
   git remote set-url origin git@github.com:VOTRE-USERNAME/GestionSTOCK.git
   ```

5. **Activer l'authentification à deux facteurs (2FA)** sur GitHub

### 🚨 Si vous avez commité des données sensibles

```bash
# 1. Supprimer le fichier de Git (mais le garder localement)
git rm --cached .env

# 2. Ajouter au .gitignore si pas déjà fait
echo ".env" >> .gitignore

# 3. Commiter
git add .gitignore
git commit -m "Retrait du fichier .env de Git"

# 4. Pousser
git push origin main

# 5. IMPORTANT : Changer TOUS les mots de passe/tokens exposés !
```

---

## 📝 Messages de commit

### Format recommandé

```
Type: Description courte (max 50 caractères)

Description détaillée si nécessaire (max 72 caractères par ligne)
```

### Types de commits

- `feat:` Nouvelle fonctionnalité
- `fix:` Correction de bug
- `docs:` Documentation
- `style:` Formatage, style
- `refactor:` Refactorisation du code
- `test:` Ajout de tests
- `chore:` Tâches de maintenance

### Exemples

```bash
git commit -m "feat: Ajout du module de gestion des fournisseurs"
git commit -m "fix: Correction du calcul du stock disponible"
git commit -m "docs: Mise à jour du README avec instructions d'installation"
git commit -m "refactor: Optimisation des requêtes de la vue produit"
```

---

## 🆘 Aide et ressources

### Commandes d'aide

```bash
# Aide générale
git help

# Aide sur une commande spécifique
git help commit
git help branch
```

### Ressources en ligne

- [Documentation Git officielle](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

### En cas de problème

1. **Vérifier le statut** : `git status`
2. **Voir les logs** : `git log --oneline`
3. **Chercher de l'aide** : Google + message d'erreur
4. **Demander de l'aide** : Stack Overflow, forums

---

## 📞 Support

Pour toute question sur ce projet :

- Email : <vevebea2022@outlook.fr>
- GitHub Issues : [Créer un ticket](https://github.com/VOTRE-USERNAME/GestionSTOCK/issues)

---

**Dernière mise à jour** : 6 décembre 2025
