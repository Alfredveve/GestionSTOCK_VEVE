import { ShoppingBag, Store, Search, X, Loader2, Package } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCurrency } from '@/lib/formatters';
import type { Product } from '@/types';

interface ProductSelectorProps {
  productSearch: string;
  setProductSearch: (value: string) => void;
  invoiceType: 'retail' | 'wholesale';
  setOrderType: (type: 'retail' | 'wholesale') => void;
  isLoadingProducts: boolean;
  products: Product[];
  onAddItem: (product: Product) => void;
  onBack: () => void;
}

export function ProductSelector({
  productSearch,
  setProductSearch,
  invoiceType,
  setOrderType,
  isLoadingProducts,
  products,
  onAddItem,
  onBack
}: ProductSelectorProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 h-full">
         
         {/* Catalog Header */}
         <div className="p-4 sm:p-6 bg-white border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between z-10 shadow-sm relative">
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button 
                   variant="ghost" 
                   size="icon" 
                   onClick={onBack}
                   className="shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
                   aria-label="Retour"
                >
                   <ArrowLeftIcon className="h-5 w-5" />
                </Button>
                <div className="relative w-full max-w-md">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                   <Input 
                      className="pl-11 h-12 bg-slate-50 border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all font-medium placeholder:text-slate-400 w-full"
                      placeholder="Rechercher un produit..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      autoFocus
                      aria-label="Recherche produit"
                   />
                   {productSearch && (
                      <button 
                        onClick={() => setProductSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                        aria-label="Effacer recherche"
                      >
                         <X className="h-3 w-3" />
                      </button>
                   )}
                </div>
            </div>

            {/* Type Switcher */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 self-stretch sm:self-auto">
               <button
                  onClick={() => setOrderType('retail')}
                  className={cn(
                    "flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all flex items-center justify-center gap-2",
                    invoiceType === 'retail' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
               >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Détail
               </button>
               <button
                  onClick={() => setOrderType('wholesale')}
                  className={cn(
                    "flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all flex items-center justify-center gap-2",
                    invoiceType === 'wholesale' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
               >
                  <Store className="h-3.5 w-3.5" />
                  Gros
               </button>
            </div>
         </div>

         {/* Product Grid */}
         <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 custom-scrollbar">
            {isLoadingProducts ? (
               <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <Loader2 className="h-10 w-10 animate-spin text-slate-400 mb-4" />
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Chargement du catalogue...</p>
               </div>
            ) : products.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center border-2 border-dashed border-slate-200 mb-4 shadow-sm">
                     <Package className="h-8 w-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">Aucun produit trouvé</h3>
                  <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">Essayez un autre terme de recherche ou vérifiez l'orthographe.</p>
               </div>
            ) : (
               <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {products.map((product) => (
                     <div 
                        key={product.id}
                        onClick={() => onAddItem(product)}
                        className="group bg-white rounded-3xl border border-slate-100 overflow-hidden cursor-pointer transition-all hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 active:scale-[0.98] relative flex flex-col h-full"
                     >  
                        {/* Image / Icon */}
                        <div className="aspect-4/3 bg-slate-50 flex items-center justify-center relative border-b border-slate-50 group-hover:bg-indigo-50/30 transition-colors">
                            {product.image ? (
                                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                                <Package className="h-10 w-10 text-slate-300 group-hover:text-indigo-300 transition-colors" />
                            )}
                            
                            {/* Visual Stock Badge */}
                            <div className={cn(
                               "absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full shadow-sm backdrop-blur-sm border",
                               product.current_stock > 0 
                                 ? "bg-white/90 text-slate-600 border-slate-200" 
                                 : "bg-rose-50/90 text-rose-600 border-rose-100"
                            )}>
                               Stock: {product.current_stock}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 flex-1 flex flex-col">
                           <div className="mb-2">
                              <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider bg-indigo-50 px-1.5 py-0.5 rounded-md inline-block mb-1">
                                {product.sku}
                              </span>
                              <h3 className="font-bold text-slate-700 leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors" title={product.name}>
                                {product.name}
                              </h3>
                           </div>
                           
                           <div className="mt-auto flex items-baseline justify-between pt-3 border-t border-slate-50">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Prix Unitaire</div>
                              <div className="text-base font-black text-slate-800 font-mono tracking-tight group-hover:text-indigo-600 transition-colors">
                                 {formatCurrency(Number(invoiceType === 'wholesale' ? product.wholesale_selling_price : product.selling_price))}
                              </div>
                           </div>
                           
                           {/* Hover Add Button */}
                           <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <div className="bg-white text-indigo-600 font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                 Ajouter +1
                              </div>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>
    </div>
  );
}

// Separate icon component to avoid name collision with lucide's ArrowLeft
function ArrowLeftIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
        </svg>
    );
}
