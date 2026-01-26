import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Smartphone, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface Enable2FAModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Enable2FAModal({ isOpen, onClose }: Enable2FAModalProps) {
  const [step, setStep] = useState<'intro' | 'setup' | 'verify'>('intro');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock QR code and secret key
  const secretKey = 'JBSWY3DPEHPK3PXP';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/GestionSTOCK:user@example.com?secret=${secretKey}&issuer=GestionSTOCK`;

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secretKey);
    toast.success('Clé secrète copiée');
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Le code doit contenir 6 chiffres');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('2FA activé avec succès');
      handleClose();
    } catch (error) {
      toast.error('Code invalide, veuillez réessayer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('intro');
    setVerificationCode('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-white/95 backdrop-blur-xl border-none shadow-2xl rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight">
                Authentification à deux facteurs
              </DialogTitle>
              <DialogDescription className="text-xs font-medium mt-0.5">
                Renforcez la sécurité de votre compte
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Intro Step */}
        {step === 'intro' && (
          <div className="space-y-5 mt-4">
            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-emerald-900 mb-1">Pourquoi activer 2FA ?</p>
                  <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                    L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire en exigeant un code temporaire en plus de votre mot de passe.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Étapes à suivre :</p>
              <div className="space-y-2">
                {[
                  'Installer une application d\'authentification (Google Authenticator, Authy, etc.)',
                  'Scanner le QR code ou saisir la clé secrète',
                  'Entrer le code de vérification à 6 chiffres'
                ].map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl">
                    <Badge className="bg-primary text-white font-black text-[10px] h-5 w-5 flex items-center justify-center p-0 rounded-full">
                      {index + 1}
                    </Badge>
                    <p className="text-xs font-medium text-foreground flex-1">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-11 rounded-xl font-black"
              >
                Annuler
              </Button>
              <Button
                onClick={() => setStep('setup')}
                className="flex-1 h-11 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700"
              >
                Continuer
              </Button>
            </div>
          </div>
        )}

        {/* Setup Step */}
        {step === 'setup' && (
          <div className="space-y-5 mt-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white rounded-2xl shadow-lg">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code 2FA" 
                  className="w-48 h-48"
                />
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Ou saisissez manuellement
                </p>
                <div className="flex items-center gap-2 bg-muted/30 p-3 rounded-xl">
                  <code className="text-sm font-bold text-foreground flex-1">{secretKey}</code>
                  <button
                    onClick={handleCopySecret}
                    className="p-2 hover:bg-background rounded-lg transition-colors"
                  >
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('intro')}
                className="flex-1 h-11 rounded-xl font-black"
              >
                Retour
              </Button>
              <Button
                onClick={() => setStep('verify')}
                className="flex-1 h-11 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700"
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Vérifier
              </Button>
            </div>
          </div>
        )}

        {/* Verify Step */}
        {step === 'verify' && (
          <div className="space-y-5 mt-4">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-emerald-50 rounded-2xl">
                <Smartphone className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-foreground">
                Entrez le code de votre application
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                Ouvrez votre application d'authentification et saisissez le code à 6 chiffres
              </p>
            </div>

            <div className="space-y-2">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="h-14 text-center text-2xl font-black tracking-[0.5em] bg-muted/30 border-none rounded-xl"
                placeholder="000000"
              />
              {verificationCode.length === 6 && (
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-bold">Code complet</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('setup')}
                className="flex-1 h-11 rounded-xl font-black"
                disabled={isLoading}
              >
                Retour
              </Button>
              <Button
                onClick={handleVerify}
                className="flex-1 h-11 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700"
                disabled={verificationCode.length !== 6 || isLoading}
              >
                {isLoading ? 'Vérification...' : 'Activer 2FA'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
