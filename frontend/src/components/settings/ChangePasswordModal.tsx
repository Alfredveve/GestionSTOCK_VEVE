import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Mot de passe modifié avec succès');
      handleClose();
    } catch (error) {
      toast.error('Erreur lors de la modification du mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    onClose();
  };

  const passwordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    if (password.length < 8) return { strength: 25, label: 'Faible', color: 'bg-red-500' };
    if (password.length < 12) return { strength: 50, label: 'Moyen', color: 'bg-orange-500' };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) return { strength: 50, label: 'Moyen', color: 'bg-orange-500' };
    return { strength: 100, label: 'Fort', color: 'bg-green-500' };
  };

  const strength = passwordStrength(newPassword);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-none shadow-2xl rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Lock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight">Modifier le mot de passe</DialogTitle>
              <DialogDescription className="text-xs font-medium mt-0.5">
                Assurez-vous d'utiliser un mot de passe sécurisé
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Current Password */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-foreground">
              Mot de passe actuel
            </label>
            <div className="relative">
              <Input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-11 bg-muted/30 border-none rounded-xl font-medium pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-foreground">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <Input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 bg-muted/30 border-none rounded-xl font-medium pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="space-y-1.5">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${strength.strength}%` }}
                  />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground">
                  Force: <span className={strength.strength === 100 ? 'text-green-600' : strength.strength >= 50 ? 'text-orange-600' : 'text-red-600'}>{strength.label}</span>
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-foreground">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 bg-muted/30 border-none rounded-xl font-medium pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {confirmPassword && newPassword === confirmPassword && (
                <CheckCircle2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 h-11 rounded-xl font-black"
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 rounded-xl font-black bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? 'Modification...' : 'Confirmer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
