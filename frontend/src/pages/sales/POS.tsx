import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import inventoryService from '@/services/inventoryService';
import type { Product } from '@/types';

import { Search, Boxes, AlertTriangle, ShoppingCart, Package } from 'lucide-react';
import salesService from '@/services/salesService';
import { CheckoutModal } from '@/components/sales/CheckoutModal';
import { CartSection } from '@/components/sales/CartSection';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import settingsService from '@/services/settingsService';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CartItem extends Product {
  cartQuantity: number;
  saleType: 'retail' | 'wholesale';
}

export function POS() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderType, setOrderType] = useState<'retail' | 'wholesale'>('retail');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedPosId, setSelectedPosId] = useState<number | null>(1); // Default to 1, but should be dynamic
  const [walkInDetails, setWalkInDetails] = useState({ name: '', phone: '' });
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [notes, setNotes] = useState<string>('');
  const [checkoutBreakdown, setCheckoutBreakdown] = useState({
    subtotal: 0,
    discount: 0,
    total: 0
  });
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const [searchParams] = useSearchParams();
  const isInvoiceMode = searchParams.get('mode') === 'invoice';

  useEffect(() => {
    settingsService.getSettings().then(s => {
      if (s.default_order_type) setOrderType(s.default_order_type);
    });
  }, []);

  const { data: posData } = useQuery({
    queryKey: ['points-of-sale'],
    queryFn: () => inventoryService.getPointsOfSale(),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => inventoryService.getCategories(),
  });

  const { data: productsData, isLoading, isError } = useQuery({
    queryKey: ['products', searchTerm, selectedCategory, selectedPosId],
    queryFn: () => inventoryService.getProducts({ 
      search: searchTerm,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      point_of_sale: selectedPosId || undefined,
      page_size: 100
    }),
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => inventoryService.getClients(),
  });

  const addToCart = (product: Product, type: 'retail' | 'wholesale') => {
    setOrderType(type);

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && item.saleType === type);
      const currentQtyInCart = existing ? existing.cartQuantity : 0;
      
      // Stock Validation
      if (currentQtyInCart + 1 > product.current_stock) {
         toast.error(`Stock insuffisant ! Max disponible: ${product.current_stock}`);
         return prev;
      }

      if (existing) {
        return prev.map(item => 
          (item.id === product.id && item.saleType === type)
            ? { ...item, cartQuantity: item.cartQuantity + 1 } 
            : item
        );
      }
      return [...prev, { ...product, cartQuantity: 1, saleType: type }];
    });
  };

  const removeFromCart = (productId: number, saleType: 'retail' | 'wholesale') => {
    setCart(prev => prev.filter(item => !(item.id === productId && item.saleType === saleType)));
  };

  const updateQuantity = (productId: number, saleType: 'retail' | 'wholesale', delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId && item.saleType === saleType) {
        const itemStock = productsData?.results?.find(p => p.id === productId)?.current_stock || 0;
        const newQty = item.cartQuantity + delta;
        
        if (newQty > itemStock) {
            toast.error(`Stock insuffisant ! Max disponible: ${itemStock}`);
            return item;
        }

        if (newQty < 1) return item; // Min 1

        return { ...item, cartQuantity: newQty };
      }
      return item;
    }));
  };

  const clearCart = () => {
    if (confirm('Êtes-vous sûr de vouloir vider le panier ?')) {
      setCart([]);
    }
  };

  const handleCheckoutInit = (breakdown: { subtotal: number; discount: number; total: number }) => {
    if (!selectedClientId) {
       toast.error('Veuillez sélectionner un client avant de valider la vente.');
       return;
    }
    setCheckoutBreakdown(breakdown);
    setIsCheckoutOpen(true);
  };

  const handleConfirmCheckout = async (paymentMethod: string, amountPaid: number) => {
    setIsProcessing(true);
    try {
      const orderItems = cart.map(item => ({
        product: item.id,
        quantity: item.cartQuantity,
        unit_price: item.saleType === 'retail' ? item.selling_price : item.wholesale_selling_price,
        is_wholesale: item.saleType === 'wholesale'
      }));

      await salesService.createOrder({
        client: selectedClientId!,
        invoice_type: orderType,
        status: 'delivered',
        payment_method: paymentMethod,
        amount_paid: amountPaid,
        items: orderItems,
        point_of_sale: selectedPosId || 1, 
        date_issued: new Date().toISOString().split('T')[0],
        date_due: new Date().toISOString().split('T')[0],
        // Send global discount from checkout breakdown
        discount: checkoutBreakdown.discount,
        // Send walk-in details only if Walk-in Mode is active
        walk_in_name: isWalkIn ? walkInDetails.name : undefined,
        walk_in_phone: isWalkIn ? walkInDetails.phone : undefined,
        // Send notes if provided
        notes: notes || undefined
      });

      // Invalidate queries to refresh the lists and stock
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });

      setCart([]);
      setIsCheckoutOpen(false);
      toast.success(isInvoiceMode ? 'Facture générée avec succès !' : 'Vente validée avec succès !');
      
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'response' in err) {
          const apiError = err as { response: { data: { detail: string } } };
          toast.error(apiError.response?.data?.detail || 'Une erreur est survenue lors de la validation.');
      } else {
          toast.error('Une erreur est survenue lors de la validation.');
      }
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] gap-4 overflow-hidden bg-muted/20 p-2 sm:p-4">
      {/* Search and Products Section */}
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        {/* Navigation & Search */}
        <div className="flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
               <input
                 type="text"
                 placeholder="Scanner un SKU ou rechercher un produit (Nom, Code)..."
                 className="w-full h-12 pl-11 pr-4 bg-white border-2 border-primary/5 rounded-2xl focus:outline-none focus:border-primary/20 focus:ring-4 focus:ring-primary/5 text-sm font-medium transition-all shadow-sm group-hover:border-primary/10"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 autoFocus
               />
               {searchTerm && (
                 <button 
                   onClick={() => setSearchTerm('')}
                   className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground hover:text-primary transition-colors"
                 >
                   EFFACER
                 </button>
               )}
            </div>
            
            {/* Select POS */}
            <div className="w-full sm:w-[200px] shrink-0">
               <Select
                 value={selectedPosId?.toString()}
                 onValueChange={(value) => setSelectedPosId(parseInt(value))}
               >
                 <SelectTrigger className="w-full h-12 rounded-2xl border-2 border-primary/5 bg-white font-bold">
                   <SelectValue placeholder="Choisir un magasin" />
                 </SelectTrigger>
                 <SelectContent>
                   {posData?.results?.map((pos) => (
                     <SelectItem key={pos.id} value={pos.id.toString()} className="font-medium">
                       {pos.code}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>
          </div>

          <div className="shrink-0">
             <Select
               value={selectedCategory}
               onValueChange={setSelectedCategory}
             >
               <SelectTrigger className="w-full sm:w-[250px] h-10 rounded-xl border-2 border-primary/5 bg-white font-bold text-xs">
                 <SelectValue placeholder="Toutes les catégories" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all" className="font-bold text-xs uppercase">
                   TOUTES LES CATÉGORIES
                 </SelectItem>
                 {categoriesData?.results?.map((cat) => (
                   <SelectItem key={cat.id} value={cat.id.toString()} className="font-bold text-xs uppercase">
                     {cat.name.toUpperCase()}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
           {isLoading ? (
             <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
               {[...Array(10)].map((_, i) => (
                 <div key={i} className="aspect-4/5 bg-muted/50 animate-pulse rounded-3xl border-2 border-dashed border-muted" />
               ))}
             </div>
           ) : isError ? (
             <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border-2 border-rose-50 shadow-sm">
                <div className="p-4 bg-rose-50 rounded-full mb-4">
                  <AlertTriangle className="h-8 w-8 text-rose-500" />
                </div>
                <h3 className="text-lg font-black text-rose-950 mb-1">Erreur de chargement</h3>
                <p className="text-sm text-rose-600/80 font-medium">Impossible de récupérer les produits pour ce point de vente.</p>
             </div>
           ) : productsData?.results?.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border-2 border-primary/5 shadow-sm">
                <div className="p-4 bg-primary/5 rounded-full mb-4">
                  <Boxes className="h-8 w-8 text-primary/40" />
                </div>
                <h3 className="text-lg font-black text-primary/80 mb-1">Aucun produit trouvé</h3>
                <p className="text-sm text-muted-foreground font-medium">Essayez de modifier vos critères de recherche.</p>
             </div>
           ) : (
             <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
               <AnimatePresence mode="popLayout">
                 {productsData?.results?.map((product) => {
                   // const stock = getStockDisplay(product);
                   return (

                      <motion.div
                        layout
                        key={product.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group relative bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-primary/20 transition-all duration-300 flex flex-col overflow-hidden"
                      >
                         <div className="p-3 flex-1 flex flex-col items-center">
                            {/* SKU Badge */}
                            <div className="mb-2">
                               <span className="px-2 py-0.5 bg-slate-50 text-[9px] font-bold text-slate-400 rounded-md tracking-wider">
                                 {product.sku || 'N/A'}
                               </span>
                            </div>

                            {/* Product Name */}
                            <h3 className="font-extrabold text-slate-800 text-sm leading-tight text-center mb-3 px-1 line-clamp-2 min-h-10" title={product.name}>
                              {product.name}
                            </h3>

                            {/* Retail Price Button (Purple Gradient) */}
                            <button
                               onClick={() => addToCart(product, 'retail')}
                               className="w-full mb-2 relative group/retail overflow-hidden"
                            >
                               <div className="absolute inset-0 bg-linear-to-r from-[#7C3AED] to-[#A855F7] opacity-90 group-hover/retail:opacity-100 transition-opacity rounded-xl" />
                               <div className="relative py-1.5 px-3 flex items-center justify-between text-white">
                                  <ShoppingCart className="h-4 w-4 opacity-90 group-hover/retail:scale-110 transition-transform" />
                                  <div className="flex flex-col items-end">
                                     <span className="text-[11px] font-black leading-none">
                                       {formatCurrency(product.selling_price)}
                                     </span>
                                     <span className="text-[8px] font-bold opacity-80 mt-0.5">
                                       (Détail)
                                     </span>
                                  </div>
                               </div>
                            </button>

                            {/* Wholesale Price Row */}
                            <button
                               onClick={() => addToCart(product, 'wholesale')}
                               className="w-full group/wholesale flex items-center justify-between px-3 py-1 hover:bg-emerald-50/50 rounded-lg transition-colors"
                            >
                               <Package className="h-4 w-4 text-emerald-600 group-hover/wholesale:scale-110 transition-transform" />
                               <div className="flex flex-col items-end">
                                  <span className="text-[11px] font-black text-emerald-700">
                                    {formatCurrency(product.wholesale_selling_price)}
                                  </span>
                                  <span className="text-[8px] font-bold text-emerald-600/70">
                                    (Gros)
                                  </span>
                               </div>
                            </button>
                         </div>

                         {/* Stock Footer */}
                         <div className="mt-1 bg-slate-50/50 border-t border-slate-100/50 py-2 flex items-center justify-center gap-2">
                            <Boxes className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-[10px] font-bold text-emerald-700">
                               Stock: {product.stock_analysis?.colis || 0} Colis / {product.stock_analysis?.unites || 0} U.
                            </span>
                         </div>
                      </motion.div>
                   );
                 })}
               </AnimatePresence>
             </div>
           )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="hidden lg:block lg:w-[380px] shrink-0 h-full">
         <CartSection
           cart={cart}
           onUpdateQuantity={updateQuantity}
           onRemove={removeFromCart}
           onClear={clearCart}
           clients={clientsData?.results || []}
           selectedClientId={selectedClientId}
           onSelectClient={setSelectedClientId}
           onCheckout={handleCheckoutInit}
           orderType={orderType}
           isProcessing={isProcessing}
           walkInDetails={walkInDetails}
           onWalkInChange={setWalkInDetails}
           isInvoiceMode={isInvoiceMode}
           notes={notes}
           onNotesChange={setNotes}
           isWalkIn={isWalkIn}
           onToggleWalkIn={setIsWalkIn}
         />
      </div>

      {/* Mobile Cart Button - Floating */}
      <button
        onClick={() => setIsMobileCartOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
      >
        <div className="relative">
          <ShoppingCart className="h-6 w-6" />
          {cart.length > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold">
              {cart.reduce((sum, item) => sum + item.cartQuantity, 0)}
            </Badge>
          )}
        </div>
      </button>

      {/* Mobile Cart Sheet */}
      <Sheet open={isMobileCartOpen} onOpenChange={setIsMobileCartOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 border-none">
          <SheetHeader className="sr-only">
            <SheetTitle>Panier Mobile</SheetTitle>
          </SheetHeader>
          <div className="h-screen">
            <CartSection
              cart={cart}
              onUpdateQuantity={updateQuantity}
              onRemove={removeFromCart}
              onClear={clearCart}
              clients={clientsData?.results || []}
              selectedClientId={selectedClientId}
              onSelectClient={setSelectedClientId}
              onCheckout={(breakdown) => {
                handleCheckoutInit(breakdown);
                setIsMobileCartOpen(false);
              }}
              orderType={orderType}
              isProcessing={isProcessing}
              walkInDetails={walkInDetails}
              onWalkInChange={setWalkInDetails}
              isInvoiceMode={isInvoiceMode}
              notes={notes}
              onNotesChange={setNotes}
              isWalkIn={isWalkIn}
              onToggleWalkIn={setIsWalkIn}
            />
          </div>
        </SheetContent>
      </Sheet>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onConfirm={handleConfirmCheckout}
        subtotal={checkoutBreakdown.subtotal}
        discount={checkoutBreakdown.discount}
        total={checkoutBreakdown.total}
        isProcessing={isProcessing}
        isInvoiceMode={isInvoiceMode}
      />
    </div>
  );
}
