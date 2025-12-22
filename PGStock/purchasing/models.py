"""
Modèles pour l'application Purchasing (Achats)

Note: Les modèles Supplier, Receipt et ReceiptItem sont définis dans inventory.models
pour éviter la duplication et maintenir une source unique de vérité.
Cette application réutilise ces modèles via des imports.
"""

# Import des modèles depuis inventory (source unique de vérité)
from inventory.models import Supplier, Receipt, ReceiptItem

# Exposer les modèles pour faciliter les imports depuis purchasing.models
__all__ = ['Supplier', 'Receipt', 'ReceiptItem']
