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
  Search
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
  
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });

  const [items, setItems] = useState<QuoteFormItem[]>([]);
  const [notes, setNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [quoteType, setQuoteType] = useState<'retail' | 'wholesale'>('retail');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const { data: clientsData } = useQuery({ queryKey: ['clients'], queryFn: () => inventoryService.getClients() });
  const { data: productsData } = useQuery({
    queryKey: ['products', productSearch],
    queryFn: () => inventoryService.getProducts({ search: productSearch, page_size: 20 }),
    enabled: isSearchFocused || productSearch.length > 0
  });

  const { data: existingQuote } = useQuery({
    queryKey: ['quotes', id],
    queryFn: () => inventoryService.getQuote(id!),
    enabled: isEdit
  });

  useEffect(() => {
    if (existingQuote) {
      setSelectedClientId(existingQuote.client.toString());
      setValidUntil(existingQuote.valid_until.split('T')[0]);
      setQuoteType(existingQuote.quote_type || 'retail');
      setNotes(existingQuote.notes || '');
      if ((existingQuote as any).items) {
          const formItems: QuoteFormItem[] = (existingQuote as any).items.map((item: any) => ({
            product: { id: item.product, name: item.product_name, sku: item.product_sku || 'N/A', selling_price: item.unit_price, wholesale_selling_price: item.unit_price } as any, 
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
            is_wholesale: !!item.is_wholesale,
            discount: Number(item.discount || 0),
          }));
          setItems(formItems);
      }
    }
  }, [existingQuote]);

  const createQuoteMutation = useMutation({
    mutationFn: async (status: 'draft' | 'sent') => {
      if (!selectedClientId) throw new Error("Client requis.");
      if (items.length === 0) throw new Error("Articles requis.");
      const payload = {
        client: parseInt(selectedClientId),
        quote_type: quoteType,
        status: status,
        valid_until: validUntil,
        items: items.map(item => ({ product: item.product.id, quantity: item.quantity, unit_price: item.unit_price, is_wholesale: item.is_wholesale, discount: item.discount })),
        notes: notes
      };
      return isEdit ? inventoryService.updateQuote(parseInt(id!), payload) : inventoryService.createQuote(payload);
    },
    onSuccess: () => { toast.success("Succès"); queryClient.invalidateQueries({ queryKey: ['quotes'] }); navigate('/quotes'); },
    onError: (e: any) => toast.error(e.message || "Erreur")
  });

  const handleAddItem = (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1, unit_price: Number(quoteType === 'wholesale' ? product.wholesale_selling_price : product.selling_price), is_wholesale: quoteType === 'wholesale', discount: 0 }];
    });
    setProductSearch('');
  };

  const updateItem = (index: number, field: keyof QuoteFormItem, value: any) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.unit_price * item.quantity * (1 - item.discount / 100)), 0);
  const formatGNF = (val: number) => new Intl.NumberFormat('fr-GN').format(val) + ' GNF';

  return (
    <div className="space-y-6 container mx-auto max-w-5xl py-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/quotes')}><ArrowLeft className="h-4 w-4" /></Button>
        <div><h1 className="text-3xl font-black">{isEdit ? 'Modifier le Devis' : 'Nouveau Devis'}</h1><p className="text-muted-foreground">{isEdit ? existingQuote?.quote_number : 'Création'}</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card><CardHeader><CardTitle>Infos</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Client</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger><SelectValue placeholder="Client" /></SelectTrigger>
                  <SelectContent>{clientsData?.results?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Validité</Label><Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} /></div>
              <div className="space-y-2"><Label>Type</Label>
                <Select value={quoteType} onValueChange={(v: any) => setQuoteType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="retail">Détail</SelectItem><SelectItem value="wholesale">Gros</SelectItem></SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle>Articles</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." className="pl-10" value={productSearch} onChange={e => setProductSearch(e.target.value)} onFocus={() => setIsSearchFocused(true)} />
                {isSearchFocused && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {productsData?.results?.map(p => (
                      <div key={p.id} className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between" onClick={() => { handleAddItem(p); setIsSearchFocused(false); }}>
                        <div><div className="font-bold text-sm">{p.name}</div><div className="text-xs text-muted-foreground">{p.sku}</div></div>
                        <div className="text-sm font-bold text-emerald-600">{formatGNF(Number(quoteType === 'wholesale' ? p.wholesale_selling_price : p.selling_price))}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Table><TableHeader><TableRow><TableHead>Produit</TableHead><TableHead>Type</TableHead><TableHead>Qté</TableHead><TableHead>Prix</TableHead><TableHead>Remise</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="font-bold">{item.product.name}</div></TableCell>
                      <TableCell><Switch checked={item.is_wholesale} onCheckedChange={v => { updateItem(i, 'is_wholesale', v); updateItem(i, 'unit_price', Number(v ? item.product.wholesale_selling_price : item.product.selling_price)); }} /></TableCell>
                      <TableCell><Input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} className="w-16 h-8 text-center" /></TableCell>
                      <TableCell><Input type="number" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24 h-8 text-right" /></TableCell>
                      <TableCell><Input type="number" value={item.discount} onChange={e => updateItem(i, 'discount', parseFloat(e.target.value) || 0)} className="w-16 h-8 text-right" /></TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4 text-rose-500" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card><CardContent className="pt-6"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-2" /></CardContent></Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 sticky top-6"><CardHeader><CardTitle>Résumé</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-end"><span className="font-bold">Total</span><span className="text-2xl font-black text-primary">{formatGNF(totalAmount)}</span></div>
              <div className="pt-6 space-y-3">
                <Button className="w-full font-bold" onClick={() => createQuoteMutation.mutate('sent')} disabled={createQuoteMutation.isPending || items.length === 0}><Save className="mr-2 h-4 w-4" /> Enregistrer</Button>
                <Button variant="outline" className="w-full" onClick={() => createQuoteMutation.mutate('draft')} disabled={createQuoteMutation.isPending || items.length === 0}>Brouillon</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
