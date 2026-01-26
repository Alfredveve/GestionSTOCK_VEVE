import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import inventoryService from '@/services/inventoryService';
import type { Product } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Search, ShoppingCart, Zap, Boxes, AlertTriangle } from 'lucide-react';
import salesService from '@/services/salesService';
import { CheckoutModal } from '@/components/sales/CheckoutModal';
import { CartSection } from '@/components/sales/CartSection';
import { motion, AnimatePresence } from 'framer-motion';
import settingsService from '@/services/settingsService';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [checkoutBreakdown, setCheckoutBreakdown] = useState({
    subtotal: 0,
    taxAmount: 0,
    taxRate: 0,
    discount: 0,
    total: 0,
    applyTax: false
  });

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

  const { data: productsData, isLoading, isError, error } = useQuery({
    queryKey: ['products', searchTerm, selectedCategory, selectedPosId],
    queryFn: () => inventoryService.getProducts({ 
      search: searchTerm,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      pos_id: selectedPosId || undefined,
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

  const handleCheckoutInit = (breakdown: { subtotal: number; taxAmount: number; taxRate: number; discount: number; total: number; applyTax: boolean }) => {
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
        client: selectedClientId || (clientsData?.results?.[0]?.id || 1),
        invoice_type: orderType,
        status: 'paid',
        payment_method: paymentMethod,

        amount_paid: amountPaid,
        items: orderItems,
        point_of_sale: selectedPosId || 1, 
        date_issued: new Date().toISOString().split('T')[0],
        date_due: new Date().toISOString().split('T')[0],
        apply_tax: checkoutBreakdown.applyTax
      });

      // Invalidate queries to refresh the lists and stock
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      setCart([]);
      setIsCheckoutOpen(false);
      toast.success('Vente enregistrée avec succès !');
    } catch (error: unknown) {
      console.error('Checkout Error:', error);
      const err = error as any;
      const errorMessage = err.response?.data?.detail 
        || (typeof err.response?.data === 'object' ? JSON.stringify(err.response.data) : null)
        || 'Erreur lors de la validation de la vente.';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStockDisplay = (product: Product) => {
    if (product.stock_analysis) {
       return `${product.stock_analysis.colis} Colis / ${product.stock_analysis.unites} U.`;
    }
    const boxes = Math.floor(product.current_stock / product.units_per_box);
    const units = product.current_stock % product.units_per_box;
    return `${boxes} Colis / ${units} U.`;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6 overflow-hidden bg-background/50 p-4 lg:p-6">
      {/* Product Selection Area */}
      <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
        {/* Header & Search Area */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4 shrink-0">
           {/* Top Row: Label, Order Type, Category */}
           <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-primary">
                 <Search className="h-5 w-5 stroke-[2.5]" />
                 <span className="font-black text-lg tracking-tight">
                    {isInvoiceMode ? 'Nouvelle Facture - Sélection Produits' : 'Recherche Produits'}
                 </span>
              </div>

              <div className="flex items-center gap-3">
                 {/* Order Type Toggle */}
                 <div className="bg-gray-100 p-1 rounded-xl flex">
                    <button 
                      onClick={() => setOrderType('retail')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${orderType === 'retail' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Détail
                    </button>
                    <button 
                      onClick={() => setOrderType('wholesale')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${orderType === 'wholesale' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Gros
                    </button>
                 </div>

                 {/* Category Select */}
                  <select 
                    aria-label="Filtrer par catégorie"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-gray-100 text-sm font-bold text-gray-600 py-2 px-3 rounded-xl border-none outline-none cursor-pointer hover:bg-gray-200 transition-colors"
                  >
                    <option value="all">Toutes catégories</option>
                    {categoriesData?.results?.map((cat: { id: number; name: string }) => (
                      <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
                    ))}
                  </select>

                 {/* POS Selector */}
                  <select 
                    aria-label="Point de Vente"
                    value={selectedPosId || ''}
                    onChange={(e) => {
                      setSelectedPosId(Number(e.target.value));
                      setCart([]); // Clear cart on POS switch to avoid stock mismatch
                    }}
                    className="bg-blue-50 text-sm font-bold text-blue-600 py-2 px-3 rounded-xl border-none outline-none cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    {posData?.results?.map((pos: { id: number; name: string }) => (
                      <option key={pos.id} value={pos.id}>{pos.name}</option>
                    ))}
                  </select>
              </div>
           </div>

           {/* Search Input */}
           <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
             <input 
               placeholder="Tapez le nom ou le code du produit..." 
               className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all placeholder:text-gray-400"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-24 lg:pb-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
               <div className="relative">
                 <div className="h-16 w-16 rounded-full border-3 border-primary/10 border-t-primary animate-spin" />
               </div>
               <p className="text-sm font-bold text-muted-foreground italic">Chargement...</p>
            </div>
          ) : isError ? (
             <div className="flex flex-col items-center justify-center h-full space-y-4 text-center p-6">
                <div className="h-16 w-16 rounded-full bg-rose-100 flex items-center justify-center">
                   <Zap className="h-8 w-8 text-rose-500" />
                </div>
                <div>
                   <h3 className="text-lg font-black text-gray-800">Erreur de chargement</h3>
                   <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
                     Impossible de charger les produits. Veuillez vérifier votre connexion ou réessayer.
                   </p>
                   {error && <p className="text-xs text-rose-500 mt-2 font-mono bg-rose-50 p-2 rounded">{(error as Error).message}</p>}
                </div>
                <button 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow hover:bg-primary/90"
                >
                  Réessayer
                </button>
             </div>
          ) : !productsData?.results || productsData.results.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full space-y-4 text-center p-6">
                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                   <Search className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                   <h3 className="text-lg font-black text-gray-800">Aucun produit trouvé</h3>
                   <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
                     Essayez de modifier vos termes de recherche ou sélectionnez une autre catégorie.
                   </p>
                </div>
             </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {productsData?.results?.map((product: Product) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className={`border shadow-sm hover:shadow-lg hover:shadow-primary/8 transition-all duration-300 rounded-2xl overflow-hidden group bg-white h-full ${
                        product.current_stock <= product.reorder_level ? 'border-rose-200 bg-rose-50/10' : 'border-gray-200/60'
                    }`}>
                      <CardContent className="p-4 flex flex-col h-full relative">
                         {/* SKU Badge */}
                         <div className="absolute top-4 left-4 flex gap-2">
                            <span className="bg-gray-100 text-gray-500 text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-wider">
                              {product.sku || `REF-${product.id}`}
                            </span>
                            
                            {/* Low Stock Indicator */}
                            {product.current_stock <= product.reorder_level && (
                                <span className="bg-rose-100 text-rose-600 text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-wider flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Stock Bas
                                </span>
                            )}
                         </div>

                         {/* Spacer for SKU */}
                         <div className="h-6 mb-2"></div>
                         
                         {/* Product Name */}
                         <h4 className="font-bold text-xs text-gray-700 leading-snug mb-3 line-clamp-2">
                           {product.name}
                         </h4>

                         {/* Actions Container */}
                         <div className="space-y-2.5 mt-auto">
                            {/* Wholesale Button (Primary - Now on top) */}
                            <button 
                              onClick={() => addToCart(product, 'wholesale')}
                              disabled={product.current_stock <= 0}
                              className="w-full bg-linear-to-br from-emerald-500 via-emerald-500 to-emerald-600 text-white rounded-2xl py-2.5 px-3 shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex flex-col items-center justify-center group/btn border border-emerald-400/20 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                            >
                               <div className="flex items-center gap-1.5">
                                 <Zap className="h-3.5 w-3.5 fill-current" />
                                 <span className="font-extrabold text-sm tracking-tight">{formatCurrency(product.wholesale_selling_price)}</span>
                               </div>
                               <span className="text-[9px] uppercase font-semibold opacity-90 tracking-wide">(Gros)</span>
                            </button>

                            {/* Retail Button (Secondary - Now below) */}
                            <button 
                              onClick={() => addToCart(product, 'retail')}
                              disabled={product.current_stock <= 0}
                              className="w-full flex items-center justify-center gap-1.5 text-primary hover:bg-primary/5 py-1.5 rounded-xl transition-all duration-200 group/retail border border-transparent hover:border-primary/20 disabled:text-gray-300 disabled:cursor-not-allowed"
                            >
                               <ShoppingCart className="h-3 w-3 opacity-80 group-hover/retail:opacity-100" />
                               <div className="flex flex-col items-start leading-none">
                                 <span className="font-bold text-[11px] tracking-tight">{formatCurrency(product.selling_price)}</span>
                                 <span className="text-[8px] font-medium uppercase opacity-60 tracking-wider">(Détail)</span>
                               </div>
                            </button>
                         </div>

                         {/* Stock Footer */}
                         <div className={`mt-4 pt-3 border-t flex items-center justify-center gap-1.5 ${product.current_stock <= product.reorder_level ? 'text-rose-500 border-rose-100' : 'text-gray-500 border-gray-100'}`}>
                            <Boxes className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Stock: {getStockDisplay(product)}</span>
                         </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-[400px] lg:shrink-0 flex flex-col transition-all duration-300">
        <CartSection 
          cart={cart}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onClear={clearCart}
          clients={clientsData?.results || []}
          selectedClientId={selectedClientId || 0}
          onSelectClient={setSelectedClientId}
          onCheckout={handleCheckoutInit}
          orderType={orderType}
          isProcessing={isProcessing}
          walkInDetails={walkInDetails}
          onWalkInChange={setWalkInDetails}
          isInvoiceMode={isInvoiceMode}
        />
      </div>

      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onConfirm={handleConfirmCheckout}
        subtotal={checkoutBreakdown.subtotal}
        taxAmount={checkoutBreakdown.taxAmount}
        taxRate={checkoutBreakdown.taxRate}
        discount={checkoutBreakdown.discount}
        total={checkoutBreakdown.total}
        isProcessing={isProcessing}
        isInvoiceMode={isInvoiceMode}
      />

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
    </div>
  );
}
