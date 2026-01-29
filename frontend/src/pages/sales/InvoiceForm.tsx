import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import inventoryService from '@/services/inventoryService';
import salesService from '@/services/salesService';
import type { Product } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Loader2
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface InvoiceFormItem {
  id?: number; // Product ID
  product: Product;
  quantity: number;
  unit_price: number;
  discount: number; // Percentage
  is_wholesale: boolean;
}

export function InvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.is_superuser;
  
  // -- State --
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedPosId, setSelectedPosId] = useState<string>(() => {
    return user?.point_of_sale?.id?.toString() || '1';
  });
  
  // Dates as strings YYYY-MM-DD for input type="date"
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

  // Product Search State
  const [productSearch, setProductSearch] = useState('');

  // -- Queries --
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => inventoryService.getClients(),
  });

  const { data: posData } = useQuery({
    queryKey: ['pos'],
    queryFn: () => inventoryService.getPointsOfSale(),
    enabled: isAdmin // Only load all POS for admins
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', productSearch, selectedPosId],
    queryFn: () => inventoryService.getProducts({ 
      search: productSearch, 
      page_size: 20,
      point_of_sale: selectedPosId // Strict filtering by POS
    }),
    enabled: productSearch.length > 0 && !!selectedPosId
  });

  const { data: existingInvoice, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => inventoryService.getInvoice(id!),
    enabled: isEdit
  });

  // -- Effect to fill form --
  useEffect(() => {
    if (existingInvoice) {
      setSelectedClientId(existingInvoice.client.toString());
      setSelectedPosId(existingInvoice.point_of_sale?.toString() || '1');
      setDateIssued(existingInvoice.date_issued);
      setDateDue(existingInvoice.due_date || existingInvoice.date_due);
      setOrderType(existingInvoice.order_type || (existingInvoice.invoice_type === 'wholesale' ? 'wholesale' : 'retail'));
      setNotes(existingInvoice.notes || '');
      setGlobalDiscount(Number(existingInvoice.discount || 0));
      
      const formItems: InvoiceFormItem[] = existingInvoice.items.map(item => ({
        product: {
          id: item.product,
          name: item.product_name,
          sku: item.product_sku,
          selling_price: item.unit_price,
          wholesale_selling_price: item.unit_price,
        } as any,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        discount: Number(item.discount),
        is_wholesale: item.is_wholesale
      }));
      setItems(formItems);
    }
  }, [existingInvoice]);

  // Update default POS when user profile loads
  useEffect(() => {
    if (user?.point_of_sale?.id && !isEdit) {
      setSelectedPosId(user.point_of_sale.id.toString());
    }
  }, [user, isEdit]);

  // -- Mutations --
  const createInvoiceMutation = useMutation({
    mutationFn: async (status: 'draft' | 'sent') => {
      if (!selectedClientId) throw new Error("Veuillez sélectionner un client.");
      if (!selectedPosId) throw new Error("Veuillez sélectionner un point de vente.");
      if (items.length === 0) throw new Error("Veuillez ajouter des articles.");

      const payload = {
        client: parseInt(selectedClientId),
        order_type: invoiceType,
        status: status,
        date_issued: dateIssued,
        date_due: dateDue,
        items: items.map(item => ({
          product: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          is_wholesale: item.is_wholesale,
          discount: Math.min(100, Math.max(0, item.discount))
        })),
        notes: notes,
        discount: globalDiscount,
        point_of_sale: parseInt(selectedPosId)
      };

      if (isEdit) {
        return salesService.updateOrder(parseInt(id!), payload as any);
      }
      return salesService.createOrder(payload as any);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Facture mise à jour avec succès" : "Facture créée avec succès");
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigate('/invoices');
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error.message || `Erreur lors de la ${isEdit ? 'mise à jour' : 'création'} de la facture`);
    }
  });

  // -- Generators --
  const handleAddItem = (product: Product) => {
    setItems(prev => {
      // Check if exists
      const existing = prev.find(i => i.product.id === product.id && i.is_wholesale === (invoiceType === 'wholesale'));
      if (existing) {
        toast.info("Produit déjà dans la liste (quantité augmentée)");
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        product,
        quantity: 1,
        unit_price: Number(invoiceType === 'wholesale' ? product.wholesale_selling_price : product.selling_price),
        discount: 0,
        is_wholesale: invoiceType === 'wholesale'
      }];
    });
    setProductSearch('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceFormItem, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return { ...item, [field]: value };
    }));
  };

  // -- Calculations --
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      const price = item.unit_price * item.quantity;
      const discountAmount = price * (Math.min(100, item.discount) / 100);
      return sum + (price - discountAmount);
    }, 0);
    
    const total = Math.max(0, subtotal - globalDiscount);

    return { subtotal, total };
  };

  const totals = calculateTotals();

  const formatCurrency = (val: number) => new Intl.NumberFormat('fr-GN', {
    maximumFractionDigits: 0
  }).format(val) + ' GNF';

  return (
    <div className="space-y-6 container mx-auto max-w-5xl py-6 pb-20">
      <div className="flex items-center gap-4 hidden-print">
        <Button variant="outline" size="icon" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            {isEdit ? 'Modifier la Facture' : 'Nouvelle Facture'}
          </h1>
          <p className="text-muted-foreground">
            {isEdit ? `Modification de la facture ${existingInvoice?.invoice_number || ''}` : 'Création d\'une facture standard'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Form Area */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Client & Dates Card */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Informations Générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Top Row: Client & POS Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                  <Label>Client</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientsData?.results?.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedClientId && <p className="text-xs text-muted-foreground">Veuillez sélectionner un client pour continuer.</p>}
                </div>

                <div className="flex flex-col space-y-2">
                  <Label>Point de Vente</Label>
                  {isAdmin ? (
                    <Select value={selectedPosId} onValueChange={setSelectedPosId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un point de vente" />
                      </SelectTrigger>
                      <SelectContent>
                        {posData?.results?.map((pos) => (
                          <SelectItem key={pos.id} value={pos.id.toString()}>
                            {pos.name} ({pos.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="h-10 px-3 py-2 border rounded-md bg-muted text-muted-foreground flex items-center justify-between text-sm">
                      <span>{user?.point_of_sale?.name || 'Magasin Principal'}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">Fixé</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? "Les administrateurs peuvent vendre depuis n'importe quel point de vente." : "Vous vendez uniquement depuis votre point de vente assigné."}
                  </p>
                </div>
              </div>

              {/* Second Row: Dates & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Type de Facture</Label>
                  <Select 
                    value={invoiceType} 
                    onValueChange={(v: 'retail' | 'wholesale') => {
                      setOrderType(v);
                      if (items.length > 0) toast.warning("Attention : Les prix des articles déjà ajoutés ne seront pas mis à jour automatiquement.");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Vente au Détail</SelectItem>
                      <SelectItem value="wholesale">Vente en Gros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 flex flex-col">
                  <Label>Date d'émission</Label>
                  <Input 
                    type="date" 
                    value={dateIssued} 
                    onChange={(e) => setDateIssued(e.target.value)} 
                  />
                </div>

                <div className="space-y-2 flex flex-col">
                  <Label className="text-rose-500 font-bold">Date d'échéance</Label>
                  <Input 
                    type="date" 
                    value={dateDue} 
                    onChange={(e) => setDateDue(e.target.value)}
                    className="border-rose-200 focus:border-rose-500"
                  />
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Items Card */}
          <Card className="border-none shadow-md min-h-[400px] flex flex-col">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Articles</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
               {/* Product Search Input */}
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input 
                   placeholder="Rechercher un produit pour l'ajouter..." 
                   className="pl-10"
                   value={productSearch}
                   onChange={(e) => setProductSearch(e.target.value)}
                 />
                 {/* Search Results Dropdown */}
                 {productSearch.length > 0 && productsData?.results && (
                   <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                     {productsData.results.length === 0 ? (
                       <div className="p-3 text-sm text-gray-500">Aucun produit trouvé.</div>
                     ) : (
                       productsData.results.map((product) => (
                         <div 
                           key={product.id}
                           className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                           onClick={() => handleAddItem(product)}
                         >
                           <div>
                             <div className="font-bold text-sm">{product.name}</div>
                             <div className="text-xs text-muted-foreground">{product.sku}</div>
                           </div>
                           <div className="text-right">
                             <div className="font-bold text-emerald-600 text-sm">
                               {formatCurrency(Number(invoiceType === 'wholesale' ? product.wholesale_selling_price : product.selling_price))}
                             </div>
                             <div className="text-xs text-gray-500">Stock: {product.current_stock}</div>
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                 )}
               </div>

               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-[40%]">Produit</TableHead>
                     <TableHead className="w-[15%] text-center">Quantité</TableHead>
                     <TableHead className="w-[20%] text-right">Prix Unitaire</TableHead>
                     <TableHead className="w-[15%] text-right">Remise (%)</TableHead>
                     <TableHead className="w-[5%]"></TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {items.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                         Aucun article ajouté. Utilisez la recherche ci-dessus.
                       </TableCell>
                     </TableRow>
                   ) : (
                     items.map((item, index) => (
                       <TableRow key={`${item.product.id}-${index}`}>
                         <TableCell>
                           <div className="font-bold">{item.product.name}</div>
                           <div className="text-xs text-muted-foreground">{item.product.sku}</div>
                         </TableCell>
                         <TableCell>
                           <Input 
                             type="number" 
                             min={1}
                             value={item.quantity}
                             onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                             className="text-center h-8"
                           />
                         </TableCell>
                         <TableCell>
                           <Input 
                             type="number" 
                             min={0}
                             value={item.unit_price}
                             onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                             className="text-right h-8"
                           />
                         </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              min={0}
                              max={100}
                              value={item.discount}
                              onChange={(e) => {
                                let val = parseFloat(e.target.value) || 0;
                                if (val > 100) {
                                  toast.warning("La remise par article ne peut pas dépasser 100%.");
                                  val = 100;
                                }
                                updateItem(index, 'discount', val);
                              }}
                              className="text-right h-8"
                            />
                         </TableCell>
                         <TableCell>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleRemoveItem(index)}>
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </TableCell>
                       </TableRow>
                     ))
                   )}
                 </TableBody>
               </Table>
            </CardContent>
          </Card>
          
          {/* Notes */}
           <Card className="border-none shadow-sm">
             <CardContent className="pt-6">
                <Label>Notes publiques</Label>
                <Textarea 
                  placeholder="Conditions de paiement, informations supplémentaires..." 
                  className="mt-2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
             </CardContent>
           </Card>

        </div>

        {/* Sidebar: Totals & Actions */}
        <div className="space-y-6">
           <Card className="border-none shadow-lg bg-primary/5 border-primary/10 sticky top-6">
             <CardHeader>
               <CardTitle>Résumé</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span className="font-bold">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex flex-col gap-1 pt-2">
                    <Label className="text-muted-foreground">Remise Globale (Montant)</Label>
                    <Input 
                      type="number"
                      min={0}
                      value={globalDiscount}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setGlobalDiscount(val);
                      }}
                      className="h-8 text-right font-bold text-rose-600 bg-white"
                    />
                  </div>
                  <div className="pt-4 border-t border-dashed border-primary/20 flex justify-between items-end">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-black text-primary">{formatCurrency(totals.total)}</span>
                  </div>
                </div>

               <div className="pt-6 space-y-3">
                 <Button 
                    className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20" 
                    onClick={() => createInvoiceMutation.mutate('sent')}
                    disabled={createInvoiceMutation.isPending || items.length === 0 || isLoadingInvoice}
                 >
                   {createInvoiceMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                   {isEdit ? 'Mettre à jour' : 'Valider la Facture'}
                 </Button>
                 
                 <Button 
                   variant="outline" 
                   className="w-full border-primary/20 text-primary hover:bg-primary/5"
                   onClick={() => createInvoiceMutation.mutate('draft')}
                   disabled={createInvoiceMutation.isPending || items.length === 0 || isLoadingInvoice}
                 >
                   {isEdit ? 'Enregistrer les modifications' : 'Enregistrer Brouillon'}
                 </Button>
               </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
