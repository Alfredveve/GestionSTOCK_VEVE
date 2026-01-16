import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Banknote, Landmark, Smartphone, Loader2 } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: string) => void;
  total: number;
  isProcessing: boolean;
}

export function CheckoutModal({ isOpen, onClose, onConfirm, total, isProcessing }: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'GNF',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const methods = [
    { id: 'cash', name: 'Espèces', icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'card', name: 'Carte Bancaire', icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'transfer', name: 'Virement', icon: Landmark, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { id: 'mobile', name: 'Orange Money', icon: Smartphone, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-none shadow-2xl bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Finaliser la Vente</DialogTitle>
          <DialogDescription>
            Choisissez le mode de règlement pour confirmer la transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10 flex flex-col items-center">
            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Total à payer</span>
            <h2 className="text-4xl font-black text-primary">{formatCurrency(total)}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {methods.map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all relative overflow-hidden ${
                  paymentMethod === method.id 
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/5" 
                    : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50"
                }`}
              >
                {paymentMethod === method.id && (
                  <div className="absolute top-2 right-2 h-4 w-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className={`p-2 rounded-lg ${method.bg} ${method.color} mb-2`}>
                  <method.icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-black tracking-tight">{method.name}</span>
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-4">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing} className="font-bold">
            Annuler
          </Button>
          <Button 
            onClick={() => onConfirm(paymentMethod)} 
            disabled={isProcessing}
            className="flex-1 h-12 shadow-lg shadow-primary/20 font-black text-lg"
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Check className="mr-2 h-5 w-5" />
            )}
            Confirmer & Imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
