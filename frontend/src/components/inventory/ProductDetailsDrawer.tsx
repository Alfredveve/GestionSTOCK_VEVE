import { X, ShoppingCart, Box, Info, Target, TrendingUp, Truck, Package, AlertTriangle, BarChart3, Percent } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface ProductDetailsDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onStartSale?: (product: Product) => void;
  onEdit?: (product: Product) => void;
}

export function ProductDetailsDrawer({ product, isOpen, onClose, onStartSale, onEdit }: ProductDetailsDrawerProps) {
  if (!product) return null;

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'GNF', 
      maximumFractionDigits: 0 
    }).format(typeof value === 'string' ? parseFloat(value) : value);
  };

  const margin = parseFloat(product.margin);
  const wholesaleMargin = parseFloat(product.wholesale_margin);
  const retailPrice = parseFloat(product.selling_price);
  const wholesalePrice = parseFloat(product.wholesale_selling_price);
  const purchasePrice = parseFloat(product.purchase_price);
  
  // Calculate margin percentages
  const retailMarginPercent = purchasePrice > 0 ? ((margin / purchasePrice) * 100).toFixed(1) : '0';
  const wholesaleMarginPercent = parseFloat(product.wholesale_purchase_price || '0') > 0 
    ? ((wholesaleMargin / parseFloat(product.wholesale_purchase_price || '0')) * 100).toFixed(1) 
    : '0';

  // Stock status
  const stockPercentage = product.reorder_level > 0 
    ? Math.min((product.current_stock / product.reorder_level) * 100, 100) 
    : 100;
  const isLowStock = product.current_stock <= product.reorder_level;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-[#0b0c10]/70 backdrop-blur-md z-50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={cn(
        "fixed right-0 top-0 h-full w-full max-w-2xl bg-linear-to-br from-slate-50 to-slate-100 shadow-[-20px_0_50px_rgba(0,0,0,0.2)] z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] flex flex-col rounded-l-4xl overflow-hidden",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header - Enhanced Dark Theme with Gradient */}
        <div className="bg-linear-to-br from-[#1a1c23] via-[#1e2028] to-[#252830] p-10 text-white relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl -ml-24 -mb-24 animate-pulse delay-1000"></div>
          
          <div className="relative z-10 flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
               <div className="bg-linear-to-br from-blue-600 to-blue-700 p-3 rounded-2xl shadow-lg shadow-blue-600/30">
                 <Box className="h-6 w-6 text-white" />
               </div>
               <h3 className="text-2xl font-black tracking-tight bg-linear-to-r from-white to-blue-100 bg-clip-text text-transparent">Détails du Produit</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all hover:scale-110">
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="relative z-10 flex items-center gap-6">
            <div className="h-32 w-32 rounded-4xl bg-white/5 border border-white/10 p-1.5 flex items-center justify-center overflow-hidden shadow-2xl backdrop-blur-sm hover:scale-105 transition-transform duration-300">
              {product.image ? (
                <img src={product.image} alt={product.name} className="h-full w-full object-cover rounded-[1.6rem]" />
              ) : (
                <Box className="h-14 w-14 text-blue-500 opacity-50" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-3xl font-black text-white uppercase leading-tight mb-2">
                {product.name}
              </h4>
              <p className="text-blue-400 font-mono text-sm tracking-widest opacity-80 mb-3"># {product.sku}</p>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600/20 text-blue-300 border border-blue-400/30 px-4 py-1.5 rounded-full font-bold uppercase text-[10px] tracking-widest backdrop-blur-sm">
                  {product.category_name}
                </Badge>
                {isLowStock && (
                  <Badge className="bg-rose-600/20 text-rose-300 border border-rose-400/30 px-4 py-1.5 rounded-full font-bold uppercase text-[10px] tracking-widest backdrop-blur-sm animate-pulse">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Stock Faible
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
          
          {/* Price Analysis Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#1a1c23]">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h5 className="font-bold text-lg">Analyse des Prix</h5>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Retail Card - Enhanced */}
              <div className="group relative overflow-hidden rounded-4xl bg-linear-to-br from-white to-blue-50/30 shadow-lg border border-blue-100/50 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-blue-500/10 to-transparent rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-linear-to-tr from-cyan-500/10 to-transparent rounded-full blur-2xl"></div>
                
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-600/10 rounded-xl">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-blue-600">Vente Détail</span>
                    </div>
                    <Badge className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black">
                      <Percent className="h-3 w-3 mr-1" />
                      {retailMarginPercent}%
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-4xl font-black text-[#1a1c23] tracking-tight mb-2">
                      {formatCurrency(retailPrice)}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Profit</span>
                      <Badge className="bg-linear-to-r from-emerald-500 to-emerald-600 text-white border-none px-3 py-1 rounded-lg text-xs font-black shadow-lg shadow-emerald-500/30">
                        +{formatCurrency(margin)}
                      </Badge>
                    </div>
                  </div>

                  {/* Visual profit bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                      <span>Coût</span>
                      <span>Marge</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(parseFloat(retailMarginPercent), 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-linear-to-r from-blue-500 to-emerald-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Wholesale Card - Enhanced */}
              <div className="group relative overflow-hidden rounded-4xl bg-linear-to-br from-white to-violet-50/30 shadow-lg border border-violet-100/50 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-violet-500/10 to-transparent rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-linear-to-tr from-purple-500/10 to-transparent rounded-full blur-2xl"></div>
                
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-violet-600/10 rounded-xl">
                        <Target className="h-4 w-4 text-violet-600" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-violet-600">Vente Gros</span>
                    </div>
                    <Badge className="bg-violet-600 text-white px-3 py-1 rounded-full text-[10px] font-black">
                      <Percent className="h-3 w-3 mr-1" />
                      {wholesaleMarginPercent}%
                    </Badge>
                  </div>
                  
                  <div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <p className="text-4xl font-black text-[#1a1c23] tracking-tight">
                        {formatCurrency(wholesalePrice)}
                      </p>
                      <span className="text-xs font-bold text-slate-400">/ colis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Profit</span>
                      <Badge className="bg-linear-to-r from-violet-500 to-violet-600 text-white border-none px-3 py-1 rounded-lg text-xs font-black shadow-lg shadow-violet-500/30">
                        +{formatCurrency(wholesaleMargin)}
                      </Badge>
                    </div>
                  </div>

                  {/* Visual profit bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                      <span>Coût</span>
                      <span>Marge</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(parseFloat(wholesaleMarginPercent), 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-linear-to-r from-violet-500 to-purple-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stock Information - Enhanced */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#1a1c23]">
              <Package className="h-5 w-5 text-blue-600" />
              <h5 className="font-bold text-lg">Informations de Stock</h5>
            </div>
            
            <div className="bg-white rounded-4xl p-6 shadow-lg border border-slate-100 space-y-5">
              {/* Stock Level with Visual Indicator */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-600">Stock Actuel</span>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={cn(
                      "px-4 py-2 rounded-full font-black text-sm shadow-lg",
                      isLowStock 
                        ? "bg-linear-to-r from-rose-500 to-rose-600 text-white shadow-rose-500/30" 
                        : "bg-linear-to-r from-cyan-500 to-cyan-600 text-white shadow-cyan-500/30"
                    )}>
                      {product.current_stock} UNITÉS
                    </Badge>
                    {product.stock_analysis?.analysis && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        {product.stock_analysis.analysis}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Stock level bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                    <span>Niveau de stock</span>
                    <span>{stockPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stockPercentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full",
                          isLowStock 
                            ? "bg-linear-to-r from-rose-500 to-rose-600" 
                            : "bg-linear-to-r from-cyan-500 to-cyan-600"
                        )}
                      />
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Composition</span>
                  <p className="text-lg font-black text-[#1a1c23]">{product.units_per_box} <span className="text-sm font-bold text-slate-400">unités/colis</span></p>
                </div>
                <div className="space-y-1 bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
                  <span className="text-xs font-bold text-rose-500 uppercase tracking-wide">Seuil d'alerte</span>
                  <p className="text-2xl font-black text-rose-600">{product.reorder_level} <span className="text-sm font-bold text-rose-400">unités</span></p>
                </div>
              </div>
            </div>
          </section>

          {/* Purchase Information - Enhanced */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#1a1c23]">
              <Truck className="h-5 w-5 text-blue-600" />
              <h5 className="font-bold text-lg">Provenance & Achat</h5>
            </div>
            
            <div className="bg-white rounded-4xl p-6 shadow-lg border border-slate-100 space-y-4">
              <div className="flex items-center justify-between p-4 bg-linear-to-r from-slate-50 to-slate-100/50 rounded-2xl">
                <span className="text-sm font-bold text-slate-600">Fournisseur</span>
                <span className="text-base font-black text-[#1a1c23]">{product.supplier_name || 'Non spécifié'}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 space-y-1">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Prix Achat Détail</span>
                  <p className="text-xl font-black text-[#1a1c23]">{formatCurrency(purchasePrice)}</p>
                </div>
                <div className="p-4 bg-violet-50/50 rounded-2xl border border-violet-100/50 space-y-1">
                  <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Prix Achat Gros</span>
                  <p className="text-xl font-black text-[#1a1c23]">{formatCurrency(product.wholesale_purchase_price || 0)}</p>
                </div>
              </div>
            </div>
          </section>

          <Separator className="bg-slate-200" />

          {/* Actions - Enhanced */}
          <div className="pt-2 flex flex-col gap-3">
            <Button 
              onClick={() => onStartSale?.(product)}
              className="h-16 rounded-[1.4rem] bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-base shadow-2xl shadow-blue-500/40 transition-all hover:-translate-y-1 hover:shadow-blue-500/50"
            >
              <ShoppingCart className="mr-3 h-5 w-5" />
              DÉMARRER UNE VENTE
            </Button>
            <Button 
              onClick={() => onEdit?.(product)}
              variant="outline" 
              className="h-14 rounded-[1.4rem] border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all hover:-translate-y-0.5"
            >
              <Info className="mr-2 h-4 w-4" />
              Modifier l'Inventaire
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
