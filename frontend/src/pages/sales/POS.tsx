import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  ShoppingCart, 
  Zap,
  Plus,
  ShoppingBag,
  Boxes
} from 'lucide-react';
import inventoryService from '@/services/inventoryService';
import type { Product } from '@/services/inventoryService';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import salesService from '@/services/salesService';
import { CheckoutModal } from '@/components/sales/CheckoutModal';
import { CartSection } from '@/components/sales/CartSection';
import { motion, AnimatePresence } from 'framer-motion';

interface CartItem extends Product {
  cartQuantity: number;
}

export function POS() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderType, setOrderType] = useState<'retail' | 'wholesale'>('retail');
  const [selectedClientId, setSelectedClientId] = useState<number>(1);
  const [finalTotal, setFinalTotal] = useState(0);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', searchTerm],
    queryFn: () => inventoryService.getProducts({ search: searchTerm }),
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => inventoryService.getClients(),
  });

  const addToCart = (product: Product, type: 'retail' | 'wholesale') => {
    // If switching type, we might want to ask or just clear if current items are different? 
    // Usually POS allows mixing if the backend supports it, but here we have a global orderType state.
    // Let's set the global orderType to the last added type for consistency in the cart view.
    setOrderType(type);

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, cartQuantity: item.cartQuantity + 1 } 
            : item
        );
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.cartQuantity + delta);
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

  const handleCheckoutInit = (total: number) => {
    setFinalTotal(total);
    setIsCheckoutOpen(true);
  };

  const handleConfirmCheckout = async () => {
    setIsProcessing(true);
    try {
      const orderItems = cart.map(item => ({
        product: item.id,
        quantity: item.cartQuantity,
        unit_price: orderType === 'retail' ? item.selling_price : item.wholesale_selling_price
      }));

      await salesService.createOrder({
        client: selectedClientId,
        order_type: orderType,
        items: orderItems,
      });

      setCart([]);
      setIsCheckoutOpen(false);
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la validation de la vente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'GNF',
      maximumFractionDigits: 0
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const getStockDisplay = (product: Product) => {
    if (!product.units_per_box) return `${product.current_stock} U.`;
    const boxes = Math.floor(product.current_stock / product.units_per_box);
    const units = product.current_stock % product.units_per_box;
    return `${boxes} Colis / ${units} U.`;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6 overflow-hidden bg-background/50">
      {/* Product Selection Area */}
      <div className="flex-1 flex flex-col space-y-6 lg:min-w-[55%] overflow-hidden p-2">
        {/* Search Bar & Categories (Placeholder for layout consistency) */}
        <div className="flex flex-col space-y-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Recherche Produits
            </h2>
            <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-xl border border-muted/20">
              <span className="text-xs font-bold text-primary">Détail</span>
              <Plus className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="bg-muted/30 px-4 py-1.5 rounded-xl border border-muted/20 text-xs font-bold text-muted-foreground">
              Toutes catégories
            </div>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Tapez le nom ou le code du produit..." 
              className="pl-12 py-7 text-lg bg-card border-none shadow-md focus-visible:ring-2 focus-visible:ring-primary/20 transition-all rounded-2xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/10 pb-20 lg:pb-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground italic space-y-4">
               <Zap className="h-12 w-12 animate-pulse text-primary/20" />
               <p>Chargement des produits...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence>
                {productsData?.results?.map((product: Product) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card className="border-none shadow-lg bg-card/60 backdrop-blur-sm hover:shadow-2xl transition-all rounded-[1.5rem] overflow-hidden group">
                      <CardContent className="p-0">
                         {/* Header Info */}
                         <div className="p-5 space-y-3">
                            <Badge variant="outline" className="bg-muted/20 border-none text-[10px] uppercase font-bold text-muted-foreground rounded-lg px-2 py-1">
                              {product.sku || 'REF: ' + product.id}
                            </Badge>
                            <h4 className="font-black text-lg text-foreground leading-tight">{product.name}</h4>
                         </div>

                         {/* Action Buttons */}
                         <div className="px-5 pb-5 space-y-3">
                            <button 
                              onClick={() => addToCart(product, 'retail')}
                              className="w-full flex items-center justify-between p-4 bg-primary text-primary-foreground rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
                            >
                               <div className="flex items-center gap-3">
                                  <ShoppingCart className="h-5 w-5" />
                                  <span className="font-black text-sm">{formatCurrency(product.selling_price)} (Détail)</span>
                               </div>
                            </button>

                            <button 
                              onClick={() => addToCart(product, 'wholesale')}
                              className="w-full flex items-center justify-between p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl hover:bg-emerald-100 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                               <div className="flex items-center gap-3">
                                  <ShoppingBag className="h-5 w-5" />
                                  <span className="font-black text-sm">{formatCurrency(product.wholesale_selling_price)} (Gros)</span>
                               </div>
                            </button>
                         </div>

                         {/* Stock Info Footer */}
                         <div className="bg-muted/10 p-3 px-5 flex items-center justify-center gap-2 border-t border-muted/10">
                            <Boxes className="h-4 w-4 text-emerald-600" />
                            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-tight">
                              Stock: {getStockDisplay(product)}
                            </span>
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
      <div className="w-full lg:w-[420px] lg:shrink-0 flex flex-col transition-all duration-300">
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
        />
      </div>

      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onConfirm={handleConfirmCheckout}
        total={finalTotal}
        isProcessing={isProcessing}
      />
    </div>
  );
}
