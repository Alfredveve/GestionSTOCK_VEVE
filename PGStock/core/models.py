from django.db import models
from django.utils.translation import gettext_lazy as _

class TimeStampedModel(models.Model):
    """
    Classe de base abstraite qui ajoute automatiquement les champs
    created_at et updated_at aux modèles.
    """
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Date de création"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Dernière modification"))

    class Meta:
        abstract = True
