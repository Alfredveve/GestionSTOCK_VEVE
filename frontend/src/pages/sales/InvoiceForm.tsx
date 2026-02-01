import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import inventoryService from '@/services/inventoryService';
import salesService from '@/services/salesService';
import type { Order } from '@/services/salesService';
import type { Product } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { 
  Trash2, 
  Save, 
  ArrowLeft,
  Search,
  Loader2,
  Plus,
  Minus,
  ShoppingBag,
  Calendar,
  User,
  Store,
  FileText,
  Percent,
  ChevronRight,
  Package,
  X,
  CreditCard,
  LayoutGrid,
  List
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from "@/lib/utils";

interface InvoiceFormItem {
  id?: number;
  product: Product;
  quantity: number;
  unit_price: number;
  is_wholesale: boolean;
}

export function InvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const { user } = useAuthStore();
  
  // -- State --
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedPosId, setSelectedPosId] = useState<string>(() => {
    return user?.point_of_sale?.id?.toString() || '1';
  });
  
  const [dateIssued, setDateIssued] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dateDue, setDateDue] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  const [items, setItems] = useState<InvoiceFormItem[]>([]);
  const [notes, setNotes] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [invoiceType, setOrderType] = useState<'retail' | 'wholesale'>('retail');

  const [productSearch, setProductSearch] = useState('');
  const [posIdInitialized, setPosIdInitialized] = useState(false);
  const [itemsInitialized, setItemsInitialized] = useState(false);

  // -- Queries --
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => inventoryService.getClients(),
  });

  const { data: posData } = useQuery({
    queryKey: ['pos'],
    queryFn: () => inventoryService.getPointsOfSale(),
  });

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', productSearch, selectedPosId],
    queryFn: () => inventoryService.getProducts({ 
      search: productSearch, 
      page_size: 20,
      point_of_sale: selectedPosId
    }),
    enabled: !!selectedPosId
  });

  const { data: existingInvoice, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => inventoryService.getInvoice(id!),
    enabled: isEdit
  });

  // -- Effects --
  useEffect(() => {
    if (existingInvoice && !itemsInitialized) {
      setTimeout(() => {
        setSelectedClientId(existingInvoice.client.toString());
        setSelectedPosId(existingInvoice.point_of_sale?.toString() || '1');
        setDateIssued(existingInvoice.date_issued);
        setDateDue(existingInvoice.date_due);
        setOrderType(existingInvoice.invoice_type === 'wholesale' ? 'wholesale' : 'retail');
        setNotes(existingInvoice.notes || '');
        setGlobalDiscount(Number(existingInvoice.discount_amount || 0));
        
        const formItems: InvoiceFormItem[] = (existingInvoice.items || []).map(item => ({
          product: {
            id: item.product,
            name: item.product_name,
            sku: item.product_sku,
            selling_price: item.unit_price.toString(),
            wholesale_selling_price: item.unit_price.toString(),
            // Mock missing fields
            current_stock: 0,
            image: null,
            category: 0,
            category_name: '',
          } as unknown as Product,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          is_wholesale: item.is_wholesale
        }));
        setItems(formItems);
        setItemsInitialized(true);
      }, 0);
    }
  }, [existingInvoice, itemsInitialized]);

  useEffect(() => {
    if (user?.point_of_sale?.id && !isEdit && !posIdInitialized) {
      setTimeout(() => {
        setSelectedPosId(user.point_of_sale.id.toString());
        setPosIdInitialized(true);
      }, 0);
    }
  }, [user, isEdit, posIdInitialized]);

  // -- Mutations --
  const createInvoiceMutation = useMutation({
    mutationFn: async (status: 'draft' | 'sent') => {
      if (!selectedClientId) throw new Error("Veuillez sélectionner un client.");
      if (!selectedPosId) throw new Error("Veuillez sélectionner un point de vente.");
      if (items.length === 0) throw new Error("Veuillez ajouter des articles.");

      const payload: Order = {
        client: parseInt(selectedClientId),
        invoice_type: invoiceType,
        status: status,
        date_issued: dateIssued,
        date_due: dateDue,
        items: items.map(item => ({
          product: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price.toString(),
          is_wholesale: item.is_wholesale,
          discount: 0
        })),
        notes: notes,
        discount: globalDiscount,
        point_of_sale: parseInt(selectedPosId),
      };

      if (isEdit) {
        return salesService.updateOrder(parseInt(id!), payload);
      }
      return salesService.createOrder(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Facture mise à jour avec succès" : "Facture créée avec succès");
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      navigate('/invoices');
    },
    onError: (error: Error) => {
      console.error(error);
      toast.error(error.message || `Erreur lors de la ${isEdit ? 'mise à jour' : 'création'} de la facture`);
    }
  });

  // -- Handlers --
  const handleAddItem = (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id && i.is_wholesale === (invoiceType === 'wholesale'));
      if (existing) {
        toast.info("Quantité augmentée pour " + product.name);
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        product,
        quantity: 1,
        unit_price: Number(invoiceType === 'wholesale' ? product.wholesale_selling_price : product.selling_price),
        is_wholesale: invoiceType === 'wholesale'
      }];
    });
    // Optional: Clear search after add? No, keep logic for speed.
    // setProductSearch('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceFormItem, value: string | number | boolean) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return { ...item, [field]: value };
    }));
  };

  // -- Totals --
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const total = Math.max(0, subtotal - globalDiscount);
    return { subtotal, total };
  }, [items, globalDiscount]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('fr-GN', {
    maximumFractionDigits: 0
  }).format(val) + ' GNF';

  if (isEdit && isLoadingInvoice) {
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Chargement...</p>
      </div>
    );
  }

  // --- SPLIT VIEW LAYOUT ---
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-slate-50 font-sans">
      
      {/* LEFT PANEL: PRODUCT CATALOG (Flex-1) */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 h-full">
         
         {/* Catalog Header */}
         <div className="p-4 sm:p-6 bg-white border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between z-10 shadow-sm relative">
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button 
                   variant="ghost" 
                   size="icon" 
                   onClick={() => navigate('/invoices')}
                   className="shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
                   aria-label="Retour"
                >
                   <ArrowLeft className="h-5 w-5" />
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
                  aria-label="Switch to Retail"
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
                  aria-label="Switch to Wholesale"
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
            ) : productsData?.results?.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center border-2 border-dashed border-slate-200 mb-4 shadow-sm">
                     <Package className="h-8 w-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">Aucun produit trouvé</h3>
                  <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">Essayez un autre terme de recherche ou vérifiez l'orthographe.</p>
               </div>
            ) : (
               <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {productsData?.results?.map((product) => (
                     <div 
                        key={product.id}
                        onClick={() => handleAddItem(product)}
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

      {/* RIGHT PANEL: CART & INVOICE (Fixed Width or Full on Mobile) */}
      <div className="w-full lg:w-[450px] xl:w-[480px] bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl z-20">
         
         {/* Cart Header: Configuration */}
         <div className="p-5 border-b border-slate-100 bg-slate-50/30 space-y-4 shrink-0">
            <div className="flex items-center justify-between">
                <div>
                   <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                     <ShoppingBag className="h-5 w-5 text-indigo-600" />
                     {isEdit ? `#${existingInvoice?.invoice_number}` : 'Nouvelle Vente'}
                   </h2>
                   <p className="text-xs text-slate-400 font-medium">{new Date().toLocaleDateString('fr-GN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                {/* POS Selector (Compact) */}
                <div className="w-40">
                    <Select value={selectedPosId} onValueChange={setSelectedPosId}>
                       <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                          <Store className="h-3 w-3 mr-2 text-slate-400" />
                          <SelectValue placeholder="Point de Vente" />
                       </SelectTrigger>
                       <SelectContent>
                          {posData?.results?.map(pos => (
                             <SelectItem key={pos.id} value={pos.id.toString()} className="text-xs">
                                {pos.name}
                             </SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Client Select */}
            <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none z-10" />
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                   <SelectTrigger className="h-12 pl-10 bg-white border-slate-200 rounded-xl focus:ring-indigo-100 text-sm font-medium shadow-sm" aria-label="Choisir un client">
                      <SelectValue placeholder="Sélectionner un client (Requis)" />
                   </SelectTrigger>
                   <SelectContent className="max-h-[300px]">
                      {clientsData?.results?.map((client) => (
                         <SelectItem key={client.id} value={client.id.toString()} className="py-3">
                            <span className="font-bold">{client.name}</span>
                            <span className="block text-[10px] text-slate-400">{client.phone || client.email}</span>
                         </SelectItem>
                      ))}
                   </SelectContent>
                </Select>
            </div>

             {/* Dates (Collapsible details style) */}
             <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                   <Input 
                      type="date"
                      value={dateIssued}
                      onChange={(e) => setDateIssued(e.target.value)}
                      className="h-10 pl-9 text-xs bg-slate-50 border-slate-200 rounded-lg"
                      aria-label="Date d'émission"
                   />
                </div>
                <div className="relative">
                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-rose-300 pointer-events-none" />
                   <Input 
                      type="date"
                      value={dateDue}
                      onChange={(e) => setDateDue(e.target.value)}
                      className="h-10 pl-9 text-xs bg-rose-50/50 border-rose-100 text-rose-600 rounded-lg"
                      aria-label="Date d'échéance"
                   />
                </div>
             </div>
         </div>

         {/* Cart Items List */}
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
                                     onClick={() => handleRemoveItem(index)}
                                     className="text-slate-300 hover:text-rose-500 bg-transparent p-1 rounded-md hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                     aria-label="Supprimer article"
                                  >
                                     <Trash2 className="h-4 w-4" />
                                  </button>
                               </div>
                               
                               <div className="flex items-center justify-between mt-2">
                                  {/* Qty Control */}
                                  <div className="flex items-center bg-slate-100/70 rounded-lg border border-slate-200/50 h-8">
                                     <button 
                                        onClick={() => updateItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                                        className="h-8 w-8 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-white rounded-l-lg transition-all active:scale-90"
                                        aria-label="Diminuer quantité"
                                     >
                                        <Minus className="h-3 w-3 font-bold" />
                                     </button>
                                     <input 
                                        type="number" 
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                        className="w-10 text-center bg-transparent border-none text-xs font-black p-0 focus:ring-0"
                                        aria-label="Quantité"
                                     />
                                     <button 
                                        onClick={() => updateItem(index, 'quantity', item.quantity + 1)}
                                        className="h-8 w-8 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-white rounded-r-lg transition-all active:scale-90"
                                        aria-label="Augmenter quantité"
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
                                           onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                           aria-label="Prix unitaire"
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

         {/* Footer - Totals & Actions */}
         <div className="bg-slate-50 border-t border-slate-200 p-5 space-y-4 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
             
             {/* Subtotal & Discount */}
             <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                   <span>Sous-total</span>
                   <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2 text-xs font-bold text-rose-500">
                      <Percent className="h-3.5 w-3.5" /> Remise
                   </div>
                   <div className="flex items-center w-28 relative">
                      <Input 
                         type="number" 
                         value={globalDiscount} 
                         onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                         className="h-8 text-right pr-9 bg-white border-rose-100 focus:ring-rose-200 text-xs font-bold text-rose-600"
                         aria-label="Remise globale"
                      />
                      <span className="absolute right-3 text-[9px] text-rose-300 font-bold">GNF</span>
                   </div>
                </div>
                
                {/* Visual Separator */}
                <div className="border-b border-slate-200 border-dashed my-3" />

                 <div className="flex justify-between items-end">
                   <span className="text-sm font-black uppercase tracking-wider text-slate-600">Total à Payer</span>
                   <div className="text-right">
                      <span className="block text-2xl font-black text-slate-900 font-mono tracking-tighter leading-none">
                         {formatCurrency(totals.total)}
                      </span>
                   </div>
                </div>
             </div>

             {/* Notes Expandable or Simple */}
             <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Textarea 
                   placeholder="Notes ou instructions pour la facture..." 
                   value={notes} 
                   onChange={(e) => setNotes(e.target.value)}
                   className="pl-10 min-h-[60px] max-h-[100px] text-xs bg-white border-slate-200 resize-none focus:ring-1 focus:ring-indigo-100"
                   aria-label="Notes"
                />
             </div>

             {/* Action Buttons */}
             <div className="grid grid-cols-2 gap-3 pt-2">
                <Button 
                   variant="outline" 
                   onClick={() => createInvoiceMutation.mutate('draft')}
                   disabled={createInvoiceMutation.isPending || items.length === 0}
                   className="h-12 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold rounded-xl"
                >
                   Brouillon
                </Button>
                <Button 
                   onClick={() => createInvoiceMutation.mutate('sent')}
                   disabled={createInvoiceMutation.isPending || items.length === 0}
                   className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 rounded-xl"
                >
                   {createInvoiceMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                   {isEdit ? 'Mettre à jour' : 'Valider la Vente'}
                </Button>
             </div>
         </div>
         
      </div>

    </div>
  );
}
