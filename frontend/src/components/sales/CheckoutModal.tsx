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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, CreditCard, Banknote, Landmark, Smartphone, Loader2, Wallet, FileText } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: string, amountPaid: number) => void;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  discount: number;
  total: number;
  isProcessing: boolean;
  isInvoiceMode?: boolean;
}

export function CheckoutModal({ isOpen, onClose, onConfirm, subtotal, taxAmount, taxRate, discount, total, isProcessing, isInvoiceMode = false }: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState(isInvoiceMode ? 'credit' : 'cash');
  const [amountPaid, setAmountPaid] = useState<number>(total);

  // Set default amount only when modal becomes open
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen && !prevIsOpen) {
    // If invoice mode, default amount paid can be 0 (credit), otherwise total
    setAmountPaid(isInvoiceMode ? 0 : total);
    setPaymentMethod(isInvoiceMode ? 'credit' : 'cash');
    setPrevIsOpen(true);
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      maximumFractionDigits: 0
    }).format(amount) + ' GNF';
  };

  const methods = [
    { id: 'cash', name: 'Espèces', icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'card', name: 'Carte Bancaire', icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'transfer', name: 'Virement', icon: Landmark, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { id: 'mobile', name: 'Orange Money', icon: Smartphone, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  // Add Credit option if in invoice mode
  if (isInvoiceMode) {
    methods.unshift({ id: 'credit', name: 'Crédit / Différé', icon: FileText, color: 'text-primary', bg: 'bg-primary/10' });
  }

  const remaining = Math.max(0, total - amountPaid);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-full border-none shadow-2xl bg-white backdrop-blur-3xl rounded-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header Section - Fixed */}
        <div className="px-6 pt-6 pb-2 shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Check className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold tracking-tight text-gray-900">
                  {isInvoiceMode ? 'Émission de Facture' : 'Finaliser la Vente'}
                </DialogTitle>
                <DialogDescription className="text-[9px] font-semibold text-gray-500 tracking-wide">
                  {isInvoiceMode ? 'Confirmer les détails de la facture' : 'Détails du paiement et mode de règlement'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content Section */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-5 custom-scrollbar">
          <div className="bg-linear-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden group text-center shrink-0">
            <div className="absolute -right-8 -bottom-8 h-24 w-24 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />
            <div className="relative z-10 flex flex-col items-center">
              <span className="text-[8px] font-bold uppercase tracking-[0.25em] opacity-70 mb-1">Montant Total</span>
              <h2 className="text-2xl font-black tracking-tight">{formatCurrency(total)}</h2>
            </div>
          </div>

          {/* Breakdown Section - Always show TVA and Remise */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2 shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-600">Sous-total</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            
            {/* TVA - Always shown */}
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-600">Taxe ({taxRate.toFixed(2)}%)</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(taxAmount)}</span>
            </div>
            
            {/* Remise - Always shown */}
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-600">Remise</span>
              <span className="text-sm font-bold text-gray-900">- {formatCurrency(discount)}</span>
            </div>
            
            <div className="h-px bg-gray-200 my-2"></div>
            
            {/* Total TTC */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-900">Total TTC</span>
              <span className="text-lg font-black text-emerald-600">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 shrink-0">
            <div className="space-y-1.5">
              <Label htmlFor="amountPaid" className="text-[10px] font-bold uppercase tracking-wider text-gray-500 ml-1">Montant Versé (GNF)</Label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  id="amountPaid"
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="pl-10 h-12 bg-white border-gray-200 rounded-xl font-bold text-lg focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="Montant payé..."
                />
              </div>
            </div>

            {remaining > 0 && (
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest italic">Reste à payer :</span>
                <span className="text-sm font-black text-rose-600">{formatCurrency(remaining)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2.5 shrink-0">
            <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500 pl-1">Mode de Paiement</label>
            <div className="grid grid-cols-2 gap-2.5">
              {methods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all duration-200 relative group/item ${
                    paymentMethod === method.id 
                      ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10" 
                      : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50"
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-transform group-hover/item:scale-105 ${method.bg} ${method.color}`}>
                    <method.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-left">
                      <span className="block text-[11px] font-bold text-gray-800 tracking-tight">{method.name}</span>
                      <span className="text-[8px] text-gray-500 font-medium">Sélectionner</span>
                  </div>
                  {paymentMethod === method.id && (
                    <div className="h-4 w-4 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-sm">
                      <Check className="h-2.5 w-2.5 stroke-[3px]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Section - Fixed */}
        <div className="p-6 pt-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <DialogFooter className="flex sm:justify-between items-center gap-3">
            <Button 
                variant="ghost" 
                onClick={onClose} 
                disabled={isProcessing} 
                className="font-bold text-[10px] tracking-wide text-gray-500 hover:text-gray-700 hover:bg-gray-100 h-11 px-5 rounded-xl transition-colors"
            >
              Annuler
            </Button>
            <Button 
              onClick={() => onConfirm(paymentMethod, amountPaid)} 
              disabled={isProcessing}
              className="flex-1 h-14 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 rounded-2xl font-extrabold text-sm tracking-tight bg-linear-to-br from-emerald-500 via-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 group"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Traitement...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <span>{isInvoiceMode ? 'Fermer la Facture' : 'Confirmer la Vente'}</span>
                  <div className="p-1 bg-white/20 rounded-lg group-hover:translate-x-0.5 transition-transform">
                    <Check className="h-4 w-4" />
                  </div>
                </div>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
