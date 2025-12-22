# Services Layer - GestionSTOCK

## 📚 Documentation Complète

Ce dossier contient la couche de services (Service Layer) de GestionSTOCK, implémentant le pattern **"Thin Views, Fat Services"**.

## 🎯 Objectif

Séparer la logique métier de la couche de présentation pour obtenir :

- Code plus maintenable et testable
- Réutilisabilité (Web, API, CLI, Celery)
- Transactions atomiques garanties
- Validation centralisée

## 📁 Structure

```
services/
├── __init__.py              # Exports publics
├── base.py                  # BaseService + utilitaires
├── stock_service.py         # Gestion du stock
├── invoice_service.py       # Gestion des factures
├── receipt_service.py       # Gestion des réceptions
├── payment_service.py       # Gestion des paiements
├── EXAMPLES.py             # Exemples d'utilisation
└── README.md               # Ce fichier
```

## 🚀 Utilisation Rapide

### Import des Services

```python
from inventory.services import (
    StockService,
    InvoiceService,
    ReceiptService,
    PaymentService
)
```

### Exemple : Créer une Facture

```python
# Dans votre vue
from inventory.services import InvoiceService
from inventory.services.base import ServiceException
from django.core.exceptions import ValidationError

def invoice_create(request):
    if request.method == 'POST':
        try:
            invoice_service = InvoiceService()
            invoice = invoice_service.create_invoice(
                client=client,
                point_of_sale=pos,
                user=request.user,
                items_data=[...],
                status='paid'  # Stock déduit automatiquement
            )
            messages.success(request, f'Facture {invoice.invoice_number} créée!')
            return redirect('invoice_detail', pk=invoice.pk)
        except (ValidationError, ServiceException) as e:
            messages.error(request, str(e))
    
    return render(request, 'invoice_form.html')
```

### Exemple : Mouvement de Stock

```python
from inventory.services import StockService

stock_service = StockService()

# Transfert entre magasins
movement = stock_service.process_transfer(
    product=product,
    quantity=Decimal('10'),
    from_point_of_sale=magasin_a,
    to_point_of_sale=magasin_b,
    user=request.user
)
```

## 🔍 Services Disponibles

### StockService

- `process_entry()` - Entrée de stock
- `process_exit()` - Sortie de stock
- `process_transfer()` - Transfert entre POS
- `process_adjustment()` - Ajustement d'inventaire
- `process_return()` - Retour client
- `bulk_update_inventory()` - Import en masse

### InvoiceService

- `create_invoice()` - Création avec déduction stock auto
- `update_invoice()` - Modification intelligente
- `cancel_invoice()` - Annulation avec restauration stock
- `add_invoice_item()` - Ajout article
- `remove_invoice_item()` - Suppression article

### ReceiptService

- `create_receipt()` - Création avec entrée stock auto
- `add_receipt_item()` - Ajout article
- `cancel_receipt()` - Annulation

### PaymentService

- `register_payment()` - Enregistrement paiement
- `process_full_payment()` - Paiement complet
- `get_payment_summary()` - Résumé paiements

## ⚠️ Gestion des Erreurs

Les services lèvent deux types d'exceptions :

```python
from django.core.exceptions import ValidationError
from inventory.services.base import ServiceException

try:
    service.do_something()
except ValidationError as e:
    # Erreur de validation de données
    messages.error(request, str(e))
except ServiceException as e:
    # Violation de règle métier
    messages.error(request, f"Erreur: {str(e)}")
```

## 🔒 Transactions Atomiques

Toutes les méthodes critiques utilisent `@transaction.atomic` :

```python
@transaction.atomic
def create_invoice(self, ...):
    # Tout réussit ou tout échoue
    invoice.save()
    items.save()
    self.deduct_stock()
```

## 📝 Logging

Les services loggent automatiquement :

```python
# Dans le service
self.log_info(f"Invoice created: {invoice.invoice_number}")
self.log_error(f"Stock insufficient for {product.name}")
```

Activer les logs détaillés dans `settings.py` :

```python
LOGGING = {
    'loggers': {
        'StockService': {'level': 'DEBUG'},
        'InvoiceService': {'level': 'DEBUG'},
    }
}
```

## 🧪 Tests

Exécuter les tests :

```bash
# Tous les tests de services
python manage.py test inventory.tests_services

# Un service spécifique
python manage.py test inventory.tests_services.StockServiceTest
```

## 📖 Documentation Complète

Voir les fichiers dans `brain/` :

- `architecture.md` - Architecture détaillée
- `implementation_plan.md` - Plan d'implémentation
- `EXAMPLES.py` - Exemples complets

## ✅ Bonnes Pratiques

### À FAIRE ✅

1. **Toujours passer par les services**

   ```python
   invoice_service.create_invoice(...)  # ✅
   ```

2. **Gérer les exceptions**

   ```python
   try:
       service.method()
   except (ValidationError, ServiceException) as e:
       handle_error(e)
   ```

3. **Tester les services**

   ```python
   def test_invoice_creation(self):
       invoice = InvoiceService().create_invoice(...)
       self.assertTrue(invoice.stock_deducted)
   ```

### À ÉVITER ❌

1. **Ne pas contourner les services**

   ```python
   Invoice.objects.create(...)  # ❌ Mauvais
   invoice_service.create_invoice(...)  # ✅ Bon
   ```

2. **Ne pas dupliquer la logique**

   ```python
   # ❌ Logique métier dans la vue
   for item in items:
       StockMovement.objects.create(...)
   
   # ✅ Déléguer au service
   invoice_service.create_invoice(items_data=items)
   ```

## 🎓 Règle d'Or

> **Si c'est de la logique métier, ça va dans un service.**
> **Si c'est de l'affichage, ça reste dans la vue.**

## 📞 Support

Pour toute question sur l'utilisation des services :

1. Consulter `EXAMPLES.py`
2. Lire `architecture.md`
3. Examiner les tests dans `tests_services.py`

---

**Version** : 1.0  
**Date** : 2025-12-20  
**Auteur** : Équipe GestionSTOCK
