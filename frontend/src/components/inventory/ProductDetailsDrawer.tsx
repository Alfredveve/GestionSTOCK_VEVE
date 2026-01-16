import { X, ShoppingCart, Box, Info, Target, TrendingUp, Truck } from 'lucide-react';
import type { Product } from '@/services/inventoryService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface ProductDetailsDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailsDrawer({ product, isOpen, onClose }: ProductDetailsDrawerProps) {
  if (!product) return null;

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'GNF', 
      maximumFractionDigits: 0 
    }).format(typeof value === 'string' ? parseFloat(value) : value);
  };

  const margin = parseFloat(product.selling_price) - parseFloat(product.buying_price);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-[#0b0c10]/60 backdrop-blur-md z-50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={cn(
        "fixed right-0 top-0 h-full w-full max-w-lg bg-slate-50 shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] flex flex-col rounded-l-[40px] overflow-hidden",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header - Dark Theme */}
        <div className="bg-[#1a1c23] p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10 flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
               <div className="bg-blue-600 p-2 rounded-xl">
                 <Box className="h-6 w-6 text-white" />
               </div>
               <h3 className="text-2xl font-black tracking-tight">Détails du Produit</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="relative z-10 flex items-center gap-6">
            <div className="h-28 w-28 rounded-4xl bg-white/5 border border-white/10 p-1 flex items-center justify-center overflow-hidden shadow-2xl backdrop-blur-sm">
              {product.image ? (
                <img src={product.image} alt={product.name} className="h-full w-full object-cover rounded-[1.8rem]" />
              ) : (
                <Box className="h-12 w-12 text-blue-500 opacity-50" />
              )}
            </div>
            <div>
              <h4 className="text-2xl font-black text-white uppercase group-hover:text-blue-400 transition-colors leading-tight">
                {product.name}
              </h4>
              <p className="text-blue-400 font-mono text-sm tracking-widest mt-1 opacity-80 decoration-none"># {product.sku}</p>
              <div className="mt-3">
                <Badge className="bg-blue-600/20 text-blue-400 border-none px-4 py-1.5 rounded-full font-bold uppercase text-[10px] tracking-widest">
                  {product.category_name}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          {/* Main Price Card */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-4xl bg-white shadow-sm border border-slate-100 flex flex-col justify-between h-32 group hover:border-blue-500/30 transition-all">
              <div className="flex items-center justify-between text-slate-400">
                <TrendingUp className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Vente</span>
              </div>
              <p className="text-2xl font-black text-[#1a1c23]">
                {formatCurrency(product.selling_price)}
              </p>
            </div>
            <div className="p-6 rounded-4xl bg-white shadow-sm border border-slate-100 flex flex-col justify-between h-32 group hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between text-slate-400">
                <Target className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Marge</span>
              </div>
              <p className="text-2xl font-black text-emerald-500">
                {formatCurrency(margin)}
              </p>
            </div>
          </div>

          {/* Details Sections */}
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-[#1a1c23]">
                <Info className="h-5 w-5 text-blue-600" />
                <h5 className="font-bold">Informations de Stock</h5>
              </div>
              <div className="bg-white rounded-4xl p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                  <span className="text-sm font-bold text-slate-500">Stock Actuel</span>
                  <Badge className={cn(
                    "px-4 py-1.5 rounded-full font-black text-xs",
                    product.current_stock > product.reorder_level ? "bg-cyan-50 text-cyan-500" : "bg-rose-50 text-rose-500"
                  )}>
                    {product.current_stock} UNITÉS
                  </Badge>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                  <span className="text-sm font-bold text-slate-500">Composition</span>
                  <span className="text-sm font-black text-[#1a1c23]">{product.units_per_box} UNITÉS / COLIS</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">Seuil d'alerte</span>
                  <span className="text-sm font-black text-rose-400">{product.reorder_level} UNITÉS</span>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-[#1a1c23]">
                <Truck className="h-5 w-5 text-blue-600" />
                <h5 className="font-bold">Provenance & Achat</h5>
              </div>
              <div className="bg-white rounded-4xl p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                  <span className="text-sm font-bold text-slate-500">Fournisseur</span>
                  <span className="text-sm font-black text-[#1a1c23]">{product.supplier_name || 'Non spécifié'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">Prix d'achat</span>
                  <span className="text-sm font-black text-slate-600">{formatCurrency(product.buying_price)}</span>
                </div>
              </div>
            </section>
          </div>

          <Separator className="bg-slate-200/50" />

          {/* Actions */}
          <div className="pt-2 flex flex-col gap-4">
              <Button className="h-16 rounded-[1.2rem] bg-blue-600 hover:bg-blue-700 text-white font-black text-base shadow-2xl shadow-blue-500/30 transition-all hover:-translate-y-1">
                <ShoppingCart className="mr-3 h-5 w-5" />
                DÉMARRER UNE VENTE
              </Button>
              <Button variant="ghost" className="h-14 rounded-[1.2rem] border-slate-200 text-slate-500 font-bold hover:bg-slate-100 transition-all">
                Modifier l'Inventaire
              </Button>
          </div>
        </div>
      </div>
    </>
  );
}
