
# Password Reset Views
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from django.utils.crypto import get_random_string
from .models import PasswordResetCode
from .forms import PasswordResetRequestForm, PasswordResetVerifyForm, SetNewPasswordForm

def password_reset_request(request):
    if request.method == 'POST':
        form = PasswordResetRequestForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            user = User.objects.get(email=email)
            
            # Generate code
            code = get_random_string(length=6, allowed_chars='0123456789')
            
            # Save code
            PasswordResetCode.objects.create(
                user=user,
                code=code,
                expires_at=timezone.now() + timedelta(minutes=15)
            )
            
            # Send email
            send_mail(
                subject='Réinitialisation de votre mot de passe',
                message=f'Votre code de vérification est : {code}. Ce code expire dans 15 minutes.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            
            # Store email in session for next step
            request.session['reset_email'] = email
            return redirect('inventory:password_reset_verify')
    else:
        form = PasswordResetRequestForm()
    
    return render(request, 'inventory/password_reset_request.html', {'form': form})

def password_reset_verify(request):
    email = request.session.get('reset_email')
    if not email:
        return redirect('inventory:password_reset_request')
        
    if request.method == 'POST':
        form = PasswordResetVerifyForm(request.POST)
        if form.is_valid():
            code = form.cleaned_data['code']
            try:
                user = User.objects.get(email=email)
                reset_code = PasswordResetCode.objects.filter(
                    user=user,
                    code=code,
                    used=False,
                    expires_at__gt=timezone.now()
                ).first()
                
                if reset_code:
                    reset_code.used = True
                    reset_code.save()
                    request.session['reset_verified'] = True
                    return redirect('inventory:password_reset_confirm')
                else:
                    form.add_error('code', 'Code invalide ou expiré.')
            except User.DoesNotExist:
                form.add_error(None, 'Une erreur est survenue.')
    else:
        form = PasswordResetVerifyForm()
    
    return render(request, 'inventory/password_reset_verify.html', {'form': form, 'email': email})

def password_reset_confirm(request):
    email = request.session.get('reset_email')
    verified = request.session.get('reset_verified')
    
    if not email or not verified:
        return redirect('inventory:password_reset_request')
        
    if request.method == 'POST':
        form = SetNewPasswordForm(request.POST)
        if form.is_valid():
            new_password = form.cleaned_data['new_password']
            user = User.objects.get(email=email)
            user.set_password(new_password)
            user.save()
            
            # Clean up session
            del request.session['reset_email']
            del request.session['reset_verified']
            
            messages.success(request, 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.')
            return redirect('inventory:login')
    else:
        form = SetNewPasswordForm()
        
    return render(request, 'inventory/password_reset_confirm.html', {'form': form})
