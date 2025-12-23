# Manuel d'Utilisation : GestionSTOCK

Bienvenue dans le manuel d'utilisation de **GestionSTOCK**. Cette application est conçue pour simplifier la gestion de votre inventaire, de vos ventes et de vos achats sur plusieurs points de vente.

---

## 1. Concepts Clés

- **Points de Vente (POS) / Magasins** : L'application gère plusieurs emplacements (magasins ou entrepôts). Le stock est suivi individuellement pour chaque point de vente.
- **Vente en Gros vs Détail** : Les produits peuvent être gérés avec des unités différentes (ex: carton de 12 unités). Les prix et les stocks s'adaptent automatiquement.
- **Mouvements de Stock** : Chaque changement de stock (arrivée, vente, transfert) est enregistré pour une traçabilité totale.

---

## 2. Guide de Démarrage

### Connexion

Pour accéder à l'application :

1. Entrez votre nom d'utilisateur et votre mot de passe sur la page de connexion.
2. Si vous oubliez votre mot de passe, utilisez l'option "Mot de passe oublié" pour recevoir un code de réinitialisation.

### Tableau de Bord (Dashboard)

Une fois connecté, vous verrez une vue d'ensemble :

- **Statistiques** : Chiffre d'affaires, nombre de produits, alertes de stock faible.
- **Graphiques** : Évolution du stock et distribution par catégorie.
- **Raccourcis** : Accès rapide à la "Vente Rapide (POS)".

---

## 3. Gestion du Catalogue

### Catégories

Organisez vos produits en catégories (ex: Électronique, Alimentation).

- Allez dans `Catalogue > Catégories` pour créer ou modifier vos catégories.

### Produits

- **Ajout** : Remplissez le nom, la catégorie et le fournisseur.
- **SKU** : L'application peut générer automatiquement un code SKU unique.
- **Prix** : Définissez le prix d'achat et la marge pour calculer automatiquement le prix de vente.
- **Gros** : Configurez le nombre d'unités par carton et le prix de gros.

---

## 4. Gestion des Stocks

### Inventaire

Consultez l'état de vos stocks par magasin dans `Stock > Inventaire`.

- **Seuil d'alerte** : Configurez une "Quantité de réapprovisionnement". Si le stock tombe en dessous, le produit apparaîtra en "Stock faible".

### Mouvements de Stock

Enregistrez manuellement des mouvements dans `Stock > Mouvements` :

- **Entrée** : Pour un ajout manuel.
- **Sortie** : Pour un retrait manuel (perte, usage interne).
- **Transfert** : Pour déplacer des produits d'un magasin à un autre.

---

## 5. Cycle de Vente

### Factures et Paiements

1. **Création** : Allez dans `Ventes > Factures > Créer`.
2. **Articles** : Ajoutez les produits (choisissez le type : Détail ou Gros).
3. **Paiement** : Une fois la facture créée, enregistrez un paiement (Espèces, Virement, Mobile Money).
4. **Validation** : Le stock est automatiquement déduit dès que la facture est marquée comme payée ou envoyée.

### Vente Rapide (POS)

Pour une vente au comptoir :

1. Cliquez sur **Vente Rapide (POS)** sur le tableau de bord.
2. Recherchez les produits et ajoutez-les au panier.
3. Validez la transaction pour générer instantanément la facture et déduire le stock.

### Devis

Créez des devis pour vos clients. Un devis accepté peut être converti en facture en un seul clic dans la vue détaillée du devis.

---

## 6. Gestion des Achats

### Fournisseurs

Gérez vos contacts fournisseurs dans `Achats > Fournisseurs`.

### Bons de Réception

Utilisez les bons de réception pour entrer de la nouvelle marchandise en stock.

- Les frais de livraison peuvent être répartis automatiquement sur le coût unitaire des produits pour un calcul précis de vos marges.

---

## 7. Rapports et Analyses

Accédez à la section `Rapports` pour :

- Exporter votre inventaire en **Excel** ou **PDF**.
- Analyser les ventes mensuelles.
- Consulter la liste des produits en rupture de stock.

---

## 8. Paramètres

- **Profil** : Changez votre photo de profil ou votre mot de passe dans les paramètres.
- **Entreprise** : (Admin) Configurez le logo et le nom de l'entreprise qui apparaîtront sur les factures.
- **Réinitialisation** : (Admin) Une option permet de réinitialiser les données de test avant le lancement officiel.

---
*Fin du manuel d'utilisation.*
