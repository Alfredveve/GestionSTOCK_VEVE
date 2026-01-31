import { useState, useMemo } from 'react';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  User, 
  Zap,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/types';
import { motion } from 'framer-motion';


interface CartItem extends Product {
  cartQuantity: number;
  saleType: 'retail' | 'wholesale';
}

interface CartSectionProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: number, saleType: 'retail' | 'wholesale', delta: number) => void;
  onRemove: (productId: number, saleType: 'retail' | 'wholesale') => void;
  onClear: () => void;
  clients: { id: number; name: string }[];
  selectedClientId: number | null;
  onSelectClient: (id: number | null) => void;
  onCheckout: (breakdown: { subtotal: number; discount: number; total: number }) => void;
  orderType: 'retail' | 'wholesale';
  isProcessing: boolean;
  walkInDetails?: { name: string; phone: string };
  onWalkInChange?: (details: { name: string; phone: string }) => void;
  isInvoiceMode?: boolean;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  isWalkIn?: boolean;
  onToggleWalkIn?: (val: boolean) => void;
}

export function CartSection({
  cart,
  onUpdateQuantity,
  onRemove,
  onClear,
  clients,
  selectedClientId,
  onSelectClient,
  onCheckout,
  // orderType,
  isProcessing,
  walkInDetails,
  onWalkInChange,
  isInvoiceMode = false,
  notes = '',
  onNotesChange,
  isWalkIn = false,
  onToggleWalkIn
}: CartSectionProps) {
  const [discount, setDiscount] = useState<number>(0);
  const [showNotes, setShowNotes] = useState<boolean>(false);



  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const priceStr = item.saleType === 'retail' ? item.selling_price : item.wholesale_selling_price;
      const price = parseFloat(String(priceStr));
      return sum + (isNaN(price) ? 0 : price * item.cartQuantity);
    }, 0);
  }, [cart]);

  const total = Math.max(0, subtotal - (isNaN(discount) ? 0 : discount));

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('fr-GN', {
      maximumFractionDigits: 0
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount) + ' GNF';
  };

  return (
    <Card className="flex flex-col h-full shadow-2xl border-none bg-card/60 backdrop-blur-3xl rounded-3xl overflow-hidden max-h-[calc(100vh-2rem)]">
      {/* Header */}
      <CardHeader className="p-2 border-b border-primary/5 bg-background/40 shrink-0">
        <div className="flex justify-between items-center text-primary mb-1.5">
          <CardTitle className="flex items-center gap-2 text-base font-black tracking-tight">
            <div className="p-1 bg-primary/10 rounded-lg">
              <ShoppingCart className="h-3.5 w-3.5" />
            </div>
            Panier
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClear}
            disabled={cart.length === 0}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive font-black transition-all rounded-lg h-6 px-2 text-[9px]"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            VIDER
          </Button>
        </div>

        {/* Client Selector */}
        <div className="space-y-1">
           <div className="flex items-center justify-between">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 pl-1">Client</label>
              {isWalkIn && (
                 <motion.button
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="text-[9px] font-bold text-primary hover:underline flex items-center gap-1"
                   onClick={() => {
                     onToggleWalkIn?.(false);
                     onSelectClient(null);
                   }}
                 >
                    <User className="h-3 w-3" />
                    Client enregistré ?
                 </motion.button>
              )}
           </div>

           {isWalkIn ? (
             <div className="bg-muted/30 p-2 rounded-xl border border-primary/10 space-y-1">
                 <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 text-[8px] font-black uppercase">Passage</Badge>
                    <span className="text-[9px] font-bold text-muted-foreground">Informations (Optionnel)</span>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                     <input 
                      type="text" 
                      placeholder="Nom du client..."
                      className="bg-background/80 text-[10px] font-bold p-1.5 rounded-lg border-none outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:font-medium"
                      value={walkInDetails?.name || ''}
                      onChange={(e) => {
                        if (walkInDetails) {
                          onWalkInChange?.({ ...walkInDetails, name: e.target.value });
                        } else {
                          onWalkInChange?.({ name: e.target.value, phone: '' });
                        }
                      }}
                    />
                    <input 
                      type="tel" 
                      placeholder="Téléphone..."
                      className="bg-background/80 text-[10px] font-bold p-1.5 rounded-lg border-none outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:font-medium"
                      value={walkInDetails?.phone || ''}
                      onChange={(e) => {
                        if (walkInDetails) {
                          onWalkInChange?.({ ...walkInDetails, phone: e.target.value });
                        } else {
                          onWalkInChange?.({ name: '', phone: e.target.value });
                        }
                      }}
                    />
                 </div>
             </div>
           ) : (
             <div className="flex items-center space-x-2 bg-muted/20 p-1 rounded-lg border border-transparent focus-within:border-primary/20 transition-all shadow-inner">
                <div className="h-6 w-6 rounded-md bg-background shadow-sm flex items-center justify-center text-primary pointer-events-none">
                  <User className="h-3 w-3" />
                </div>
                <select 
                  aria-label="Sélectionner un client"
                  className="flex-1 bg-transparent text-[11px] font-bold outline-none cursor-pointer text-foreground appearance-none"
                   value={selectedClientId || ''}
                   onChange={(e) => onSelectClient(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="" disabled>Choisir un client...</option>
                  {clients?.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <div className="h-4 w-px bg-primary/10 mx-1" />
                <button 
                  onClick={() => {
                    onToggleWalkIn?.(true);
                    onSelectClient(1);
                  }}
                  className="px-1.5 py-0.5 h-6 rounded-md bg-primary/10 text-primary text-[8px] font-black uppercase hover:bg-primary hover:text-white transition-colors flex items-center gap-1"
                >
                  <User className="h-2.5 w-2.5" />
                  Passage
                </button>
             </div>
           )}
        </div>
      </CardHeader>
      
      {/* Cart Items List */}
      <CardContent className="flex-1 overflow-y-auto p-0 custom-scrollbar min-h-0">
        {!cart.length ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-3"
          >
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-linear-to-tr from-primary/5 to-transparent flex items-center justify-center">
                <ShoppingCart className="h-10 w-10 opacity-10 animate-pulse text-primary" />
              </div>
              <div className="absolute top-1 right-1 h-3 w-3 bg-primary/20 rounded-full animate-ping" />
            </div>
            <div>
              <p className="font-black text-base text-foreground/40 leading-tight">Votre panier<br/>est vide</p>
              <p className="text-[8px] uppercase font-black tracking-[0.3em] mt-2 opacity-30">Sélectionnez un produit</p>
            </div>
          </motion.div>
        ) : (
          <div className="divide-y divide-primary/5">
            <div className="grid grid-cols-12 gap-2 px-4 py-1.5 bg-primary/5 text-[8px] font-black uppercase tracking-[0.15em] text-primary/60 sticky top-0 z-10 backdrop-blur-sm">
              <div className="col-span-6">Désignation</div>
              <div className="col-span-3 text-center tracking-tighter">Qté</div>
              <div className="col-span-3 text-right">Total</div>
            </div>
            {cart.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, x: 10 }}
                 animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                 className="grid grid-cols-12 gap-2 p-1.5 items-center hover:bg-primary/2 transition-colors group relative"
              >
                {/* Product Info */}
                <div className="col-span-6 min-w-0 pr-1">
                  <h5 className="font-black text-[11px] truncate text-foreground group-hover:text-primary transition-colors">{item.name}</h5>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className={`text-[7px] h-3 px-1 rounded border-none font-black uppercase ${item.saleType === 'retail' ? 'bg-primary/10 text-primary' : 'bg-emerald-100 text-emerald-600'}`}>
                      {item.saleType === 'retail' ? 'Dét' : 'Gros'}
                    </Badge>
                    <span className="text-[8px] font-bold text-muted-foreground/60">
                      {formatCurrency(item.saleType === 'retail' ? item.selling_price : item.wholesale_selling_price)}
                    </span>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="col-span-3 flex items-center justify-center bg-muted/30 rounded-lg p-0.5 h-6 self-center border border-muted-foreground/5 shadow-inner">
                   <button
                      onClick={() => onUpdateQuantity(item.id, item.saleType, -1)}
                      aria-label="Diminuer"
                      className="w-6 h-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-background rounded-md transition-all disabled:opacity-30"
                   >
                     <Minus className="h-2.5 w-2.5" />
                   </button>
                   <span className="flex-1 text-center font-black text-[11px] leading-none">{item.cartQuantity}</span>
                   <button
                      onClick={() => onUpdateQuantity(item.id, item.saleType, 1)}
                      aria-label="Augmenter"
                      className="w-6 h-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-background rounded-md transition-all"
                   >
                     <Plus className="h-2.5 w-2.5" />
                   </button>
                </div>

                {/* Total & Action */}
                <div className="col-span-3 pl-1 flex flex-col items-end justify-center gap-0.5">
                  <span className="font-black text-[11px] text-foreground tracking-tight">
                    {formatCurrency(parseFloat(item.saleType === 'retail' ? item.selling_price : item.wholesale_selling_price) * item.cartQuantity)}
                  </span>
                  <button 
                    onClick={() => onRemove(item.id, item.saleType)}
                    aria-label="Retirer"
                    className="text-muted-foreground/30 hover:text-destructive hover:scale-110 transition-all p-0.5"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Footer / Totals */}
      <div className="bg-background/60 backdrop-blur-2xl border-t border-primary/5 shrink-0">
        <div className="p-2.5 space-y-1.5">
          <div className="space-y-1">
             {/* Subtotal */}
             <div className="flex justify-between items-center text-[10px]">
                <span className="text-muted-foreground font-black uppercase tracking-widest text-[8px]">Sous-total</span>
                <span className="font-black text-foreground">{formatCurrency(subtotal)}</span>
             </div>

             <div className="h-px bg-primary/5 w-full rounded-full" />

              {/* Total */}
             <div className="flex justify-between items-end">
                <span className="text-base font-black text-foreground tracking-tight">Total</span>
                <div className="text-right">
                  <span className="block text-lg font-black text-primary leading-none tracking-tighter shadow-sm">{formatCurrency(total)}</span>
                </div>
             </div>

              {/* Discount Input */}
             <div className="flex items-center gap-2 bg-muted/20 p-1.5 rounded-lg border border-transparent focus-within:border-primary/20 transition-all shadow-inner relative">
                <div className="p-0.5 bg-background rounded-md shadow-sm pointer-events-none">
                  <Zap className="h-2.5 w-2.5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[7px] font-black text-muted-foreground/50 uppercase tracking-widest mb-0.5">Remise</span>
                  <input 
                    type="number" 
                    min="0"
                    className="w-full bg-transparent border-none text-left font-black text-[11px] outline-none placeholder:opacity-20 h-3.5"
                    placeholder="Montant GNF..."
                    value={discount > 0 ? discount : ''}
                    onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value || '0')))}
                  />
                </div>
             </div>

             {/* Notes Section */}
             <div className="space-y-1">
               <button
                 type="button"
                 onClick={() => setShowNotes(!showNotes)}
                 className="text-[9px] font-black text-muted-foreground/60 hover:text-primary uppercase tracking-widest transition-colors flex items-center gap-1"
               >
                 {showNotes ? '−' : '+'} Ajouter des notes
               </button>
               {showNotes && (
                 <motion.div
                   initial={{ opacity: 0, height: 0 }}
                   animate={{ opacity: 1, height: 'auto' }}
                   exit={{ opacity: 0, height: 0 }}
                   className="overflow-hidden"
                 >
                   <textarea
                     className="w-full bg-muted/20 p-2 rounded-lg border border-primary/10 text-[10px] font-medium outline-none focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                     placeholder="Notes pour cette vente (optionnel)..."
                     rows={2}
                     value={notes}
                     onChange={(e) => onNotesChange?.(e.target.value)}
                   />
                 </motion.div>
               )}
             </div>
          </div>

          <button 
            className="w-full h-9 text-[11px] font-black shadow-lg shadow-primary/20 rounded-xl active:scale-[0.98] transition-all bg-primary text-white hover:brightness-110 flex items-center justify-center gap-2 group"
            disabled={cart.length === 0 || isProcessing}
            onClick={() => onCheckout({ subtotal, discount, total })}
          >
            {isProcessing ? (
               <div className="flex items-center gap-2">
                 <div className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                 <span className="tracking-widest text-[10px]">EN COURS...</span>
               </div>
            ) : (
               <>
                 <span className="tracking-tight uppercase">{isInvoiceMode ? "Émettre Facture" : "Confirmer la Vente"}</span>
                 <div className="p-1 bg-white/20 rounded-md group-hover:translate-x-1 transition-transform">
                   <Check className="h-3.5 w-3.5" />
                 </div>
               </>
            )}
          </button>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--primary), 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--primary), 0.2);
        }
      `}</style>
    </Card>
  );

}
