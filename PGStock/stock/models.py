"""
Modèles pour l'application Stock

Note: Le modèle StockMovement est défini dans inventory.models
pour éviter la duplication et maintenir une source unique de vérité avec toute
la logique métier complexe (validation, clean(), save(), delete()).
Cette application réutilise ce modèle via un import.
"""

# Import du modèle depuis inventory (source unique de vérité)
from inventory.models import StockMovement

# Exposer le modèle pour faciliter les imports depuis stock.models
__all__ = ['StockMovement']
