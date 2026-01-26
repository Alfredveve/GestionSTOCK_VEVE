import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import inventoryService from '@/services/inventoryService';
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
  Loader2,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Switch } from "@/components/ui/switch";

interface QuoteFormItem {
  id?: number;
  product: Product;
  quantity: number;
  unit_price: number;
  is_wholesale: boolean;
  discount: number;
}

export function QuoteForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  
  // -- State --
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  // Dates
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15); // Default validity 15 days
    return d.toISOString().split('T')[0];
  });

  const [items, setItems] = useState<QuoteFormItem[]>([]);
  const [notes, setNotes] = useState('');

  // Product Search State
  const [productSearch, setProductSearch] = useState('');
  const [quoteType, setQuoteType] = useState<'retail' | 'wholesale'>('retail');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // -- Queries --
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => inventoryService.getClients(),
  });

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', productSearch],
    queryFn: () => inventoryService.getProducts({ search: productSearch, page_size: 20 }),
    enabled: isSearchFocused || productSearch.length > 0
  });

  const { data: existingQuote, isLoading: isLoadingQuote } = useQuery({
    queryKey: ['quotes', id],
    queryFn: () => inventoryService.getQuote(id!),
    enabled: isEdit
  });

  // -- Effect to fill form --
  useEffect(() => {
    if (existingQuote) {
      setSelectedClientId(existingQuote.client.toString());
      setValidUntil(existingQuote.valid_until.split('T')[0]);
      setQuoteType(existingQuote.quote_type || 'retail');
      setNotes(existingQuote.notes || '');
      
      // If the API returns items, we would map them here. 
      // Assuming existingQuote has items property for now based on typical pattern
      // If not, we might need to fetch items separately or check API response structure.
      if ((existingQuote as any).items) {
          const formItems: QuoteFormItem[] = (existingQuote as any).items.map((item: any) => ({
            product: {
              id: item.product,
              name: item.product_name,
              sku: item.product_sku || 'N/A',
              selling_price: item.unit_price,
              wholesale_selling_price: item.unit_price, // Fallback since we don't have full product here
            } as any, 
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
            is_wholesale: !!item.is_wholesale,
            discount: Number(item.discount || 0),
          }));
          setItems(formItems);
      }
    }
  }, [existingQuote]);

  // -- Mutations --
  const createQuoteMutation = useMutation({
    mutationFn: async (status: 'draft' | 'sent') => {
      if (!selectedClientId) throw new Error("Veuillez sélectionner un client.");
      if (items.length === 0) throw new Error("Veuillez ajouter des articles.");

      const payload = {
        client: parseInt(selectedClientId),
        quote_type: quoteType,
        status: status,
        valid_until: validUntil,
        items: items.map(item => ({
          product: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          is_wholesale: item.is_wholesale,
          discount: item.discount,
        })),
        // notes: notes
      };

      if (isEdit) {
        return inventoryService.updateQuote(parseInt(id!), payload);
      }
      return inventoryService.createQuote(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Devis mis à jour avec succès" : "Devis créé avec succès");
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      navigate('/quotes');
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error.message || `Erreur lors de la ${isEdit ? 'mise à jour' : 'création'} du devis`);
    }
  });

  // -- Generators --
  const handleAddItem = (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        toast.info("Produit déjà dans la liste (quantité augmentée)");
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        product,
        quantity: 1,
        unit_price: Number(quoteType === 'wholesale' ? product.wholesale_selling_price : product.selling_price),
        is_wholesale: quoteType === 'wholesale',
        discount: 0,
      }];
    });
    setProductSearch('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof QuoteFormItem, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return { ...item, [field]: value };
    }));
  };

  // -- Calculations --
  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const subtotal = item.unit_price * item.quantity;
      const discount = subtotal * (item.discount / 100);
      return sum + (subtotal - discount);
    }, 0);
  };

  const totalAmount = calculateTotal();
  const formatCurrency = (val: number) => new Intl.NumberFormat('fr-GN', {
    maximumFractionDigits: 0
  }).format(val) + ' GNF';

  return (
    <div className="space-y-6 container mx-auto max-w-5xl py-6 pb-20">
      <div className="flex items-center gap-4 hidden-print">
        <Button variant="outline" size="icon" onClick={() => navigate('/quotes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            {isEdit ? 'Modifier le Devis' : 'Nouveau Devis'}
          </h1>
          <p className="text-muted-foreground">
            {isEdit ? `Modification du devis ${existingQuote?.quote_number || ''}` : 'Création d\'un devis client'}
          </p>
        </div>
        {isEdit && (
          <div className="ml-auto flex gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              existingQuote?.status === 'converted' ? 'bg-emerald-100 text-emerald-700' : 
              existingQuote?.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {existingQuote?.status}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Form Area */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Client & Date Card */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Informations Générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
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
                </div>

                <div className="space-y-2">
                  <Label>Validité jusqu'au</Label>
                  <div className="relative">
                     <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     <Input 
                      type="date" 
                      value={validUntil} 
                      onChange={(e) => setValidUntil(e.target.value)} 
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Type de Devis</Label>
                  <Select 
                    value={quoteType} 
                    onValueChange={(v: 'retail' | 'wholesale') => {
                      setQuoteType(v);
                      // Global type only affects new items, no more forced update
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Vente au Détail</SelectItem>
                      <SelectItem value="wholesale">Vente en Gros</SelectItem>
                    </SelectContent>
                  </Select>
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
                    onFocus={() => setIsSearchFocused(true)}
                  />
                  {isSearchFocused && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div className="sticky top-0 bg-white p-2 border-b flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase">
                          {isLoadingProducts ? 'Chargement...' : `${productsData?.results?.length || 0} Produits trouvés`}
                        </span>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setIsSearchFocused(false)}>Fermer</Button>
                      </div>
                      
                      {isLoadingProducts ? (
                        <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                      ) : productsData?.results?.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">Aucun produit trouvé.</div>
                      ) : (
                        productsData?.results?.map((product) => (
                          <div 
                            key={product.id}
                            className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                            onClick={() => {
                              handleAddItem(product);
                              setIsSearchFocused(false);
                            }}
                          >
                            <div>
                              <div className="font-bold text-sm">{product.name}</div>
                              <div className="text-xs text-muted-foreground">{product.sku}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-emerald-600 text-sm">
                                {formatCurrency(Number(quoteType === 'wholesale' ? product.wholesale_selling_price : product.selling_price))}
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
                      <TableHead className="w-[35%]">Produit</TableHead>
                      <TableHead className="w-[10%] text-center">Mode</TableHead>
                      <TableHead className="w-[10%] text-center">Quantité</TableHead>
                      <TableHead className="w-[20%] text-right">Prix Unitaire</TableHead>
                      <TableHead className="w-[15%] text-right">Remise (%)</TableHead>
                      <TableHead className="w-[10%]"></TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                   {items.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
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
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Switch 
                                checked={item.is_wholesale}
                                onCheckedChange={(checked) => {
                                  const newPrice = checked 
                                    ? Number(item.product.wholesale_selling_price) 
                                    : Number(item.product.selling_price);
                                  
                                  updateItem(index, 'is_wholesale', checked);
                                  updateItem(index, 'unit_price', newPrice);
                                }}
                              />
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                {item.is_wholesale ? 'Gros' : 'Détail'}
                              </span>
                            </div>
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
                              onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
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
                <Label>Notes</Label>
                <Textarea 
                  placeholder="Notes optionnelles..." 
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
                 <div className="pt-4 flex justify-between items-end">
                   <span className="text-lg font-bold">Total Estimé</span>
                   <span className="text-2xl font-black text-primary">{formatCurrency(totalAmount)}</span>
                 </div>
               </div>

               <div className="pt-6 space-y-3">
                 <Button 
                    className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20" 
                    onClick={() => createQuoteMutation.mutate('sent')}
                    disabled={createQuoteMutation.isPending || items.length === 0 || isLoadingQuote}
                 >
                   {createQuoteMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                   {isEdit ? 'Mettre à jour' : 'Enregistrer'}
                 </Button>
                 
                 <Button 
                   variant="outline" 
                   className="w-full border-primary/20 text-primary hover:bg-primary/5"
                   onClick={() => createQuoteMutation.mutate('draft')}
                   disabled={createQuoteMutation.isPending || items.length === 0 || isLoadingQuote}
                 >
                   Enregistrer Brouillon
                 </Button>
               </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
