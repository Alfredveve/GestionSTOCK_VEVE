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
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/services/inventoryService';
import { motion, AnimatePresence } from 'framer-motion';

interface CartItem extends Product {
  cartQuantity: number;
}

interface CartSectionProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: number, delta: number) => void;
  onRemove: (productId: number) => void;
  onClear: () => void;
  clients: { id: number; name: string }[];
  selectedClientId: number;
  onSelectClient: (id: number) => void;
  onCheckout: (finalTotal: number) => void;
  orderType: 'retail' | 'wholesale';
  isProcessing: boolean;
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
  orderType,
  isProcessing
}: CartSectionProps) {
  const [discount, setDiscount] = useState<number>(0);
  const [applyTax, setApplyTax] = useState(false);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const price = orderType === 'retail' ? item.selling_price : item.wholesale_selling_price;
      return sum + (parseFloat(price) * item.cartQuantity);
    }, 0);
  }, [cart, orderType]);

  const taxAmount = applyTax ? subtotal * 0.18 : 0;
  const total = Math.max(0, subtotal + taxAmount - discount);

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'GNF',
      maximumFractionDigits: 0
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  return (
    <Card className="flex flex-col h-full shadow-2xl border-none bg-card/60 backdrop-blur-xl rounded-3xl overflow-hidden">
      {/* Header */}
      <CardHeader className="p-6 border-b border-muted/20 bg-background/50">
        <div className="flex justify-between items-center text-primary">
          <CardTitle className="flex items-center gap-3 text-2xl font-black">
            <ShoppingCart className="h-6 w-6" />
            Panier
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClear}
            disabled={cart.length === 0}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive font-bold transition-colors"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Vider
          </Button>
        </div>

        {/* Client Selector */}
        <div className="mt-6 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-1">CLIENT</label>
          <div className="flex items-center space-x-2 bg-muted/30 p-2 rounded-xl border border-transparent focus-within:border-primary/30 transition-all">
            <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground">
              <User className="h-4 w-4" />
            </div>
            <select 
              aria-label="Sélectionner un client"
              className="flex-1 bg-transparent text-sm font-bold outline-none cursor-pointer text-foreground"
              value={selectedClientId}
              onChange={(e) => onSelectClient(Number(e.target.value))}
            >
              <option value={1}>Client de Passage</option>
              {clients?.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {/* Cart Items List */}
      <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-muted-foreground/20">
        {cart.length > 0 && (
           <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-muted/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-dashed border-muted/20">
             <div className="col-span-6">Produit</div>
             <div className="col-span-3 text-center">Qté</div>
             <div className="col-span-3 text-right">Total</div>
           </div>
        )}

        <AnimatePresence mode="popLayout">
          {cart.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-4"
            >
              <div className="relative">
                <div className="h-32 w-32 rounded-full bg-gradient-to-tr from-muted/20 to-transparent flex items-center justify-center">
                  <ShoppingCart className="h-12 w-12 opacity-20" />
                </div>
                <div className="absolute top-0 right-0 h-4 w-4 bg-primary/20 rounded-full animate-ping" />
              </div>
              <div>
                <p className="font-black text-lg text-foreground/50">Votre panier est vide</p>
                <p className="text-xs uppercase tracking-widest mt-2 opacity-40">Ajoutez des produits pour commencer</p>
              </div>
            </motion.div>
          ) : (
            <div className="divide-y divide-dashed divide-muted/20">
              {cart.map((item) => (
                <motion.div 
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="grid grid-cols-12 gap-2 p-4 items-center hover:bg-muted/10 transition-colors group"
                >
                  {/* Product Info */}
                  <div className="col-span-6 min-w-0 pr-2">
                    <h5 className="font-bold text-sm truncate text-foreground">{item.name}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] h-4 px-1 rounded-sm border-primary/20 text-muted-foreground font-mono">
                        {orderType === 'retail' ? 'Détail' : 'Gros'}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {formatCurrency(orderType === 'retail' ? item.selling_price : item.wholesale_selling_price)}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="col-span-3 flex items-center justify-center bg-muted/20 rounded-lg p-1 h-8 self-center">
                     <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="w-6 h-full flex items-center justify-center text-foreground hover:text-primary transition-colors disabled:opacity-50"
                     >
                       <Minus className="h-3 w-3" />
                     </button>
                     <span className="flex-1 text-center font-bold text-sm leading-none pt-[1px]">{item.cartQuantity}</span>
                     <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="w-6 h-full flex items-center justify-center text-foreground hover:text-primary transition-colors"
                     >
                       <Plus className="h-3 w-3" />
                     </button>
                  </div>

                  {/* Total & Action */}
                  <div className="col-span-3 pl-2 flex flex-col items-end justify-center gap-1">
                    <span className="font-black text-sm text-foreground">
                      {formatCurrency(parseFloat(orderType === 'retail' ? item.selling_price : item.wholesale_selling_price) * item.cartQuantity)}
                    </span>
                    <button 
                      onClick={() => onRemove(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 p-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </CardContent>

      {/* Footer / Totals */}
      <div className="bg-background/80 backdrop-blur-md border-t border-muted/20">
        <div className="p-6 space-y-4">
          <div className="space-y-3">
             {/* Subtotal */}
             <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-bold">Sous-total</span>
                <span className="font-black text-foreground">{formatCurrency(subtotal)}</span>
             </div>

             {/* VAT Toggle */}
             <div className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                   <Switch 
                     id="tax-mode" 
                     checked={applyTax}
                     onCheckedChange={setApplyTax} 
                   />
                   <label htmlFor="tax-mode" className="text-xs font-medium text-muted-foreground cursor-pointer select-none">Appliquer TVA (18%)</label>
                </div>
                <span className="font-bold text-muted-foreground text-sm">{formatCurrency(taxAmount)}</span>
             </div>

             <div className="h-px bg-muted/20 w-full" />

             {/* Total */}
             <div className="flex justify-between items-end">
                <span className="text-2xl font-black text-foreground">Total</span>
                <div className="text-right">
                  <span className="block text-3xl font-black text-primary leading-none tracking-tight">{formatCurrency(total)}</span>
                </div>
             </div>

             {/* Discount Input */}
             <div className="flex items-center gap-3 bg-muted/30 p-1 pl-3 rounded-xl border border-transparent focus-within:border-primary/20 transition-all mt-2">
                <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Remise (GNF)</span>
                <input 
                  type="number" 
                  min="0"
                  className="flex-1 bg-transparent border-none text-right font-black text-sm outline-none p-2"
                  placeholder="0"
                  value={discount > 0 ? discount : ''}
                  onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value || '0')))}
                />
             </div>
          </div>

          <Button 
            className="w-full h-14 text-lg font-black shadow-xl shadow-primary/20 rounded-xl active:scale-[0.98] transition-all bg-gradient-to-r from-primary to-primary/90 hover:to-primary"
            disabled={cart.length === 0 || isProcessing}
            onClick={() => onCheckout(total)}
          >
            {isProcessing ? (
               <span className="flex items-center gap-2">
                 <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                 TRAITEMENT...
               </span>
            ) : (
               <span className="flex items-center gap-2">
                 <Check className="h-5 w-5" />
                 VALIDER LA VENTE
               </span>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
