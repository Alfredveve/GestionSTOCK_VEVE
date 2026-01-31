import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import inventoryService from '@/services/inventoryService';
import salesService from '@/services/salesService';
import type { Order } from '@/services/salesService';
import type { Product } from '@/types';
// Card imports removed as custom section tags are used for a more elegant design
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  ShoppingBag,
  Calendar,
  User,
  Store,
  FileText,
  Percent,
  ChevronRight,
  Package,
  X
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

  const { data: productsData } = useQuery({
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
          discount: 0 // Remise par produit supprimée
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
    setProductSearch('');
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Chargement de la facture...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header Elegant */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 mb-8 shadow-sm">
        <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/invoices')}
                className="bg-slate-50 hover:bg-slate-100 transition-all rounded-xl h-11 w-11"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </Button>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-primary" />
                  </div>
                  {isEdit ? 'Modifier la Facture' : 'Nouvelle Facture'}
                </h1>
                <p className="text-sm text-slate-500 font-medium ml-13 flex items-center gap-2">
                   {isEdit ? `Édition de #${existingInvoice?.invoice_number}` : 'Créez une facture élégante et professionnelle'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="hidden sm:flex border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl px-6 h-11 font-semibold"
                onClick={() => createInvoiceMutation.mutate('draft')}
                disabled={createInvoiceMutation.isPending || items.length === 0}
              >
                Brouillon
              </Button>
              <Button 
                className="w-full sm:w-auto px-8 bg-primary hover:bg-primary/90 text-white font-bold transition-all duration-300 shadow-xl shadow-primary/20 rounded-xl h-11"
                onClick={() => createInvoiceMutation.mutate('sent')}
                disabled={createInvoiceMutation.isPending || items.length === 0}
              >
                {createInvoiceMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                {isEdit ? 'Mettre à jour' : 'Valider la Facture'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Main Area: 8 Columns */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* 1. Informations Générales Section */}
            <section className="bg-white rounded-4xl shadow-sm border border-slate-200/60 overflow-hidden transition-all hover:shadow-md">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-indigo-50 rounded-lg">
                      <FileText className="h-5 w-5 text-indigo-600" />
                   </div>
                   <h3 className="text-lg font-bold text-slate-800 tracking-tight">Informations Générales</h3>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full">Section 01</div>
              </div>
              
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Client Selection */}
                  <div className="space-y-4">
                    <Label className="text-slate-700 font-bold ml-1 flex items-center gap-2">
                       Client <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative group">
                       <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
                       <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                        <SelectTrigger className="h-14 pl-12 border-slate-200 bg-slate-50/50 focus:ring-primary/20 rounded-2xl border-2 transition-all group-hover:border-slate-300">
                          <SelectValue placeholder="Choisir un client..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-200 shadow-2xl">
                          {clientsData?.results?.map((client) => (
                            <SelectItem key={client.id} value={client.id.toString()} className="h-12 hover:bg-slate-50 rounded-xl mx-1 my-1">
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Walk-in Details - Conditional */}
                  </div>

                  {/* POS Selection */}
                  <div className="space-y-4">
                    <Label className="text-slate-700 font-bold ml-1">Point de Vente</Label>
                    <div className="relative group">
                       <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
                       <Select value={selectedPosId} onValueChange={setSelectedPosId}>
                         <SelectTrigger className="h-14 pl-12 border-slate-200 bg-slate-50/50 focus:ring-primary/20 rounded-2xl border-2 transition-all group-hover:border-slate-300">
                           <SelectValue placeholder="Choisir un point de vente..." />
                         </SelectTrigger>
                         <SelectContent className="rounded-2xl border-slate-200 shadow-2xl">
                           {posData?.results?.map((pos) => (
                             <SelectItem key={pos.id} value={pos.id.toString()} className="h-12 hover:bg-slate-50 rounded-xl mx-1 my-1">
                               {pos.name} <span className="text-xs text-slate-400 ml-2 font-mono">({pos.code})</span>
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                    </div>
                  </div>

                  {/* Date Selection */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Label className="text-slate-700 font-bold ml-1">Émise le</Label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                        <Input 
                          type="date" 
                          value={dateIssued} 
                          onChange={(e) => setDateIssued(e.target.value)}
                          className="h-14 pl-12 border-slate-200 bg-slate-50/50 rounded-2xl border-2 focus:ring-primary/10"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-rose-600 font-bold ml-1">Échéance</Label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-rose-300 pointer-events-none" />
                        <Input 
                          type="date" 
                          value={dateDue} 
                          onChange={(e) => setDateDue(e.target.value)}
                          className="h-14 pl-12 border-rose-100 bg-rose-50/30 text-rose-700 rounded-2xl border-2 focus:ring-rose-200 focus:border-rose-300 transition-all shadow-sm shadow-rose-100/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Type Selection Table Toggle */}
                  <div className="space-y-4">
                    <Label className="text-slate-700 font-bold ml-1">Type de Vente</Label>
                    <div className="flex p-1.5 bg-slate-100/80 rounded-[1.25rem] border border-slate-200/50 h-14">
                       <button 
                        type="button"
                        onClick={() => setOrderType('retail')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 rounded-2xl text-sm font-black transition-all duration-300",
                          invoiceType === 'retail' ? "bg-white text-primary shadow-lg shadow-black/5" : "text-slate-500 hover:text-slate-700"
                        )}
                       >
                         <ShoppingBag className={cn("h-4 w-4", invoiceType === 'retail' ? "text-primary" : "text-slate-400")} />
                         Détail
                       </button>
                       <button 
                        type="button"
                        onClick={() => setOrderType('wholesale')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 rounded-2xl text-sm font-black transition-all duration-300",
                          invoiceType === 'wholesale' ? "bg-white text-primary shadow-lg shadow-black/5" : "text-slate-500 hover:text-slate-700"
                        )}
                       >
                         <Store className={cn("h-4 w-4", invoiceType === 'wholesale' ? "text-primary" : "text-slate-400")} />
                         Vente en Gros
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Articles Section */}
            <section className="bg-white rounded-4xl shadow-sm border border-slate-200/60 overflow-hidden transition-all hover:shadow-md">
               <div className="p-8 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <ShoppingBag className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-none">Panier d'articles</h3>
                      <p className="text-xs text-slate-400 font-medium mt-1">Gérez les produits de votre facture</p>
                    </div>
                  </div>
                  
                  {/* Product Search Modern */}
                  <div className="relative w-full xl:w-[400px]">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input 
                      placeholder="Ajouter un produit (Nom, SKU...)" 
                      className="pl-13 h-14 border-slate-200 bg-slate-50/50 rounded-2xl border-2 focus:ring-primary/20 transition-all hover:border-slate-300 placeholder:text-slate-400 font-medium"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                    
                    {/* Dynamic Search Dropdown Elegant - Shows results or suggestions */}
                    {((productSearch.length > 0) || (items.length === 0 && !productSearch)) && productsData?.results && (
                      <div className="absolute z-40 w-full mt-4 bg-white border border-slate-200 rounded-4xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] max-h-[440px] overflow-hidden flex flex-col ring-1 ring-black/5 animate-in fade-in zoom-in duration-200">
                        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center px-6">
                           <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Résultats de recherche</span>
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600" onClick={() => setProductSearch('')}>
                             <X className="h-4 w-4" />
                           </Button>
                        </div>
                        <div className="overflow-auto flex-1">
                        {productsData.results.length === 0 ? (
                          <div className="p-12 text-center">
                            <div className="bg-slate-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                              <Package className="h-8 w-8 text-slate-200" />
                            </div>
                            <p className="text-sm font-bold text-slate-800">Aucun résultat</p>
                            <p className="text-xs text-slate-400 mt-1">Vérifiez l'orthographe ou le SKU</p>
                          </div>
                        ) : (
                          productsData.results.map((product) => (
                            <div 
                              key={product.id}
                              className="group p-5 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-all border-b border-slate-50 last:border-0"
                              onClick={() => handleAddItem(product)}
                            >
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center group-hover:bg-primary transition-all shadow-sm">
                                  <Package className="h-6 w-6 text-slate-300 group-hover:text-white transition-colors" />
                                </div>
                                <div>
                                  <div className="font-bold text-[15px] text-slate-800 group-hover:text-primary transition-colors">{product.name}</div>
                                  <div className="text-[10px] text-slate-400 font-black tracking-widest uppercase mt-0.5">{product.sku}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-black text-slate-900 group-hover:scale-105 transition-transform origin-right">
                                  {formatCurrency(Number(invoiceType === 'wholesale' ? product.wholesale_selling_price : product.selling_price))}
                                </div>
                                <div className={cn(
                                  "text-[10px] font-black px-2 py-0.5 rounded-full mt-1.5 inline-block border",
                                  product.current_stock > 0 
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                    : "bg-rose-50 text-rose-600 border-rose-100"
                                )}>
                                  STOCK: {product.current_stock}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        </div>
                        <div className="p-4 border-t border-slate-50 bg-slate-50/30 text-center">
                           <p className="text-[10px] text-slate-400 font-bold italic">Appuyez sur un produit pour l'ajouter directement</p>
                        </div>
                      </div>
                    )}
                  </div>
               </div>

               <div className="overflow-x-auto">
                 <Table>
                   <TableHeader className="bg-slate-50/30">
                     <TableRow className="border-b border-slate-100">
                       <TableHead className="w-[45%] text-slate-500 font-black px-8 py-5 text-[11px] uppercase tracking-widest">Produit & Référence</TableHead>
                       <TableHead className="w-[20%] text-slate-500 font-black text-center text-[11px] uppercase tracking-widest">Quantité</TableHead>
                       <TableHead className="w-[20%] text-slate-500 font-black text-right text-[11px] uppercase tracking-widest">Prix Unitaire</TableHead>
                       <TableHead className="w-[15%] text-slate-500 font-black text-right px-8 text-[11px] uppercase tracking-widest">Montant</TableHead>
                       <TableHead className="w-[60px]"></TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {items.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={5} className="py-24 text-center">
                           <div className="flex flex-col items-center gap-4 group">
                             <div className="h-20 w-20 rounded-4xl bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-200 text-slate-300 group-hover:scale-110 transition-transform duration-500">
                               <ShoppingBag className="h-10 w-10" />
                             </div>
                             <div>
                               <p className="text-xl font-black text-slate-900 tracking-tight">Votre panier est vide</p>
                               <p className="text-sm text-slate-400 font-medium">Commencez par rechercher un produit ci-dessus</p>
                             </div>
                           </div>
                         </TableCell>
                       </TableRow>
                     ) : (
                       items.map((item, index) => (
                         <TableRow key={`${item.product.id}-${index}`} className="group hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0">
                           <TableCell className="px-8 py-6">
                             <div className="flex items-center gap-4">
                               <div className="h-12 w-12 shrink-0 bg-slate-100/50 rounded-2xl flex items-center justify-center border border-slate-200/50 shadow-sm group-hover:bg-white transition-colors">
                                 <Plus className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
                               </div>
                               <div>
                                 <div className="font-bold text-[15px] text-slate-800 leading-snug">{item.product.name}</div>
                                 <div className="text-[10px] text-slate-400 font-black tracking-widest uppercase mt-1 flex items-center gap-2">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded-md">{item.product.sku}</span>
                                    {item.is_wholesale && <span className="bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-md">PRIX GROS</span>}
                                 </div>
                               </div>
                             </div>
                           </TableCell>
                           <TableCell className="text-center py-6">
                             <div className="inline-flex items-center justify-center gap-3 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
                               <button 
                                 className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:shadow-sm transition-all active:scale-95"
                                 onClick={() => updateItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                               >
                                 <span className="text-xl leading-none font-bold text-slate-600">-</span>
                               </button>
                               <input 
                                 type="number" 
                                 title="Quantité"
                                 aria-label="Quantité"
                                 className="w-12 text-center bg-transparent border-none focus:ring-0 font-black text-slate-800 px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                 value={item.quantity}
                                 onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                               />
                               <button 
                                 className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:shadow-sm transition-all active:scale-95"
                                 onClick={() => updateItem(index, 'quantity', item.quantity + 1)}
                               >
                                 <span className="text-xl leading-none font-bold text-slate-600">+</span>
                               </button>
                             </div>
                           </TableCell>
                           <TableCell className="text-right py-6">
                             <div className="flex flex-col items-end">
                               <div className="flex items-center gap-1 group/price">
                                 <input 
                                   type="number" 
                                   title="Prix unitaire"
                                   aria-label="Prix unitaire"
                                   className="w-32 text-right bg-transparent border-none focus:ring-0 font-black text-slate-800 p-0 text-[15px]"
                                   value={item.unit_price}
                                   onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                 />
                                 <span className="text-[10px] font-black text-slate-300 transition-colors group-hover/price:text-indigo-400">GNF</span>
                               </div>
                               <div className="h-0.5 w-12 bg-slate-100 rounded-full mt-1 group-hover:w-full group-hover:bg-primary/20 transition-all duration-500" />
                             </div>
                           </TableCell>
                           <TableCell className="text-right px-8 py-6">
                             <span className="font-black text-slate-900 text-[16px] font-mono tracking-tighter">{formatCurrency(item.unit_price * item.quantity)}</span>
                           </TableCell>
                           <TableCell className="py-6 pr-8">
                             <Button 
                               variant="ghost" 
                               size="icon" 
                               className="h-10 w-10 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100" 
                               onClick={() => handleRemoveItem(index)}
                             >
                               <Trash2 className="h-5 w-5" />
                             </Button>
                           </TableCell>
                         </TableRow>
                       ))
                     )}
                   </TableBody>
                 </Table>
               </div>
            </section>

            {/* 3. Notes Section Modern */}
            <section className="bg-white rounded-4xl shadow-sm border border-slate-200/60 p-8 transition-all hover:shadow-md">
               <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <FileText className="h-5 w-5 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 tracking-tight">Notes & Conditions</h3>
               </div>
               <Textarea 
                 placeholder="Ajoutez des détails, conditions de paiement ou remerciements..." 
                 className="min-h-[140px] bg-slate-50/30 border-slate-200 border-2 rounded-2xl focus:ring-primary/10 placeholder:text-slate-300 font-medium text-slate-700 p-5 transition-all focus:bg-white focus:shadow-inner"
                 value={notes}
                 onChange={(e) => setNotes(e.target.value)}
               />
               <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                 <div className="h-1 w-1 rounded-full bg-slate-400" />
                 Ces notes apparaîtront en bas de la facture PDF
               </div>
            </section>
          </div>

          {/* Sidebar / Summary: 4 Columns Elegant GLASSY */}
          <aside className="lg:col-span-4 lg:sticky lg:top-32 space-y-8 pb-10">
            
            {/* Totals Summary Card - PREMIUM DESIGN */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.3)] relative overflow-hidden group">
               {/* Aesthetic Background Elements */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -mr-32 -mt-32 transition-all group-hover:bg-primary/30" />
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -ml-32 -mb-32" />
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border border-white/5 rounded-[2.5rem] pointer-events-none" />
               
               <div className="relative z-10 space-y-10">
                 <div className="flex items-center justify-between">
                    <h3 className="text-white font-black tracking-[0.2em] uppercase text-[11px] flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),1)] animate-pulse" /> 
                      Résumé Financier
                    </h3>
                    <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                       <ShoppingBag className="h-5 w-5 text-white/40" />
                    </div>
                 </div>
                 
                 <div className="space-y-6">
                   <div className="flex justify-between items-center group/item hover:translate-x-1 transition-transform">
                     <span className="text-slate-400 font-bold text-[13px] uppercase tracking-wider">Sous-total</span>
                     <span className="text-xl font-black text-white font-mono tracking-tighter">{formatCurrency(totals.subtotal)}</span>
                   </div>
                   
                   <div className="space-y-4 pt-8 border-t border-white/5">
                      <div className="flex justify-between items-center">
                        <Label className="text-slate-400 font-bold text-[13px] uppercase tracking-wider flex items-center gap-2">
                          <Percent className="h-4 w-4 text-rose-500/70" /> Remise Globale
                        </Label>
                        <div className="text-rose-400 font-black font-mono">-{formatCurrency(globalDiscount)}</div>
                      </div>
                      
                      <div className="relative group/discount">
                        <Input 
                          type="number"
                          min={0}
                          value={globalDiscount}
                          placeholder="0"
                          onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                          className="h-16 bg-white/5 border-white/10 text-right font-black text-2xl text-white pr-16 focus:border-primary/50 focus:bg-white/10 transition-all rounded-2xl border-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-white/10"
                        />
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 bg-white/5 px-2 py-1 rounded-md border border-white/5 uppercase">GNF</span>
                        <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover/discount:opacity-100 pointer-events-none transition-opacity" />
                      </div>
                   </div>

                   <div className="pt-10 border-t border-white/10 flex flex-col gap-3">
                     <div className="flex justify-between items-baseline">
                       <span className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Total Net</span>
                       <div className="text-right">
                         <div className="text-4xl font-black text-white font-mono tracking-tighter drop-shadow-2xl">
                           {formatCurrency(totals.total)}
                         </div>
                       </div>
                     </div>
                     <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center justify-center gap-2 mt-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest italic">Paiement sécurisé et tracé</span>
                     </div>
                   </div>
                 </div>
               </div>
            </div>

            {/* Status Panel - INFO CARD */}
            <div className="bg-white rounded-4xl border-2 border-slate-100 p-8 space-y-6 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full blur-2xl -mr-12 -mt-12" />
               
               <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center justify-between">
                 Vérification Rapide
                 <Loader2 className={cn("h-4 w-4 text-primary animate-spin", !createInvoiceMutation.isPending && "hidden")} />
               </h4>
               
               <div className="grid grid-cols-1 gap-4">
                 <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 transition-all hover:border-primary/20 hover:bg-white hover:translate-x-1 group/row">
                   <div className={cn(
                     "h-10 w-10 rounded-xl flex items-center justify-center shadow-sm transition-all",
                     selectedClientId ? "bg-emerald-50 text-emerald-500 border border-emerald-100" : "bg-slate-100 text-slate-300 border border-slate-200"
                   )}>
                     <User className="h-5 w-5" />
                   </div>
                   <div className="flex-1 overflow-hidden">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Client sélectionné</p>
                     <p className="text-sm font-bold text-slate-800 truncate">
                       {clientsData?.results?.find(c => c.id.toString() === selectedClientId)?.name || '--'}
                     </p>
                   </div>
                 </div>

                 <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 transition-all hover:border-primary/20 hover:bg-white hover:translate-x-1 group/row">
                   <div className={cn(
                     "h-10 w-10 rounded-xl flex items-center justify-center shadow-sm transition-all",
                     items.length > 0 ? "bg-amber-50 text-amber-500 border border-amber-100" : "bg-slate-100 text-slate-300 border border-slate-200"
                   )}>
                     <ShoppingBag className="h-5 w-5" />
                   </div>
                   <div className="flex-1">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Nombre d'articles</p>
                     <p className="text-sm font-bold text-slate-800">{items.length} produit(s)</p>
                   </div>
                 </div>

                 <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 transition-all hover:border-primary/20 hover:bg-white hover:translate-x-1 group/row">
                   <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-500 border border-indigo-100 flex items-center justify-center shadow-sm">
                     <Calendar className="h-5 w-5" />
                   </div>
                   <div className="flex-1">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Échéance finale</p>
                     <p className="text-sm font-bold text-slate-800">{dateDue}</p>
                   </div>
                 </div>
               </div>
               
               <div className="pt-4">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase text-primary bg-primary/5 p-4 rounded-2xl cursor-pointer hover:bg-primary/10 transition-all group/pdf border border-primary/10">
                    <span className="flex items-center gap-3 italic">
                       <FileText className="h-4 w-4" />
                       Mode aperçu PDF
                    </span>
                    <ChevronRight className="h-4 w-4 group-hover/pdf:translate-x-1 transition-transform" />
                  </div>
               </div>
            </div>

          </aside>
        </div>
      </main>
    </div>
  );
}
