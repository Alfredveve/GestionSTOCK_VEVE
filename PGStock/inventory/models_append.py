
class PasswordResetCode(models.Model):
    """Code de réinitialisation de mot de passe"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Utilisateur")
    code = models.CharField(max_length=6, verbose_name="Code de vérification")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    expires_at = models.DateTimeField(verbose_name="Date d'expiration")
    used = models.BooleanField(default=False, verbose_name="Utilisé")

    class Meta:
        verbose_name = "Code de réinitialisation"
        verbose_name_plural = "Codes de réinitialisation"
        ordering = ['-created_at']

    def __str__(self):
        return f"Code pour {self.user.username}"

    def is_valid(self):
        """Vérifie si le code est valide (non expiré et non utilisé)"""
        from django.utils import timezone
        return not self.used and self.expires_at > timezone.now()
