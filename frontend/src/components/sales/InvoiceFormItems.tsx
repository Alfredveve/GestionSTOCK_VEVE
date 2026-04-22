import { ShoppingBag, Package, Trash2, Minus, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { Product } from '@/types';

interface InvoiceFormItem {
  id?: number;
  product: Product;
  quantity: number;
  unit_price: number;
  is_wholesale: boolean;
}

interface InvoiceFormItemsProps {
  items: InvoiceFormItem[];
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, field: keyof InvoiceFormItem, value: any) => void;
}

export function InvoiceFormItems({
  items,
  onRemoveItem,
  onUpdateItem
}: InvoiceFormItemsProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-white p-0">
        {items.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
              <ShoppingBag className="h-16 w-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900">Le panier est vide</h3>
              <p className="text-sm text-slate-500">Sélectionnez des produits à gauche pour commencer la vente.</p>
           </div>
        ) : (
           <div className="divide-y divide-slate-100">
              {items.map((item, index) => (
                 <div key={`${item.product.id}-${index}`} className="p-4 hover:bg-slate-50 transition-colors group">
                    <div className="flex gap-3">
                       {/* Thumb */}
                       <div className="h-12 w-12 bg-slate-100 rounded-lg border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                          {item.product.image ? (
                             <img src={item.product.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                             <Package className="h-5 w-5 text-slate-300" />
                          )}
                       </div>
                       
                       {/* Content */}
                       <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                             <h4 className="text-sm font-bold text-slate-800 truncate pr-2" title={item.product.name}>{item.product.name}</h4>
                             <button 
                                onClick={() => onRemoveItem(index)}
                                className="text-slate-300 hover:text-rose-500 bg-transparent p-1 rounded-md hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                             >
                                <Trash2 className="h-4 w-4" />
                             </button>
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                             {/* Qty Control */}
                             <div className="flex items-center bg-slate-100/70 rounded-lg border border-slate-200/50 h-8">
                                <button 
                                   onClick={() => onUpdateItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                                   className="h-8 w-8 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-white rounded-l-lg transition-all active:scale-90"
                                >
                                   <Minus className="h-3 w-3 font-bold" />
                                </button>
                                <input 
                                   type="number" 
                                   value={item.quantity}
                                   onChange={(e) => onUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                   className="w-10 text-center bg-transparent border-none text-xs font-black p-0 focus:ring-0"
                                />
                                <button 
                                   onClick={() => onUpdateItem(index, 'quantity', item.quantity + 1)}
                                   className="h-8 w-8 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-white rounded-r-lg transition-all active:scale-90"
                                >
                                   <Plus className="h-3 w-3 font-bold" />
                                </button>
                             </div>

                             {/* Price Input & Total */}
                             <div className="text-right">
                                <div className="flex items-center justify-end gap-1 mb-0.5">
                                   <input 
                                      className="w-20 text-right bg-transparent border-b border-transparent focus:border-indigo-300 hover:border-slate-200 text-xs text-slate-500 font-medium p-0 transition-colors"
                                      value={item.unit_price}
                                      onChange={(e) => onUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                   />
                                   <span className="text-[9px] text-slate-400">GNF</span>
                                </div>
                                <div className="text-sm font-black text-slate-900 font-mono tracking-tighter">
                                   {formatCurrency(item.unit_price * item.quantity).replace(' GNF', '')} <span className="text-[9px] text-slate-400 font-bold ml-0.5">GNF</span>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        )}
    </div>
  );
}
