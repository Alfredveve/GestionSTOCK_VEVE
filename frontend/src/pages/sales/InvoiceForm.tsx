import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import inventoryService from '@/services/inventoryService';
import salesService from '@/services/salesService';
import financeService from '@/services/financeService';
import type { Order } from '@/services/salesService';
import type { Product } from '@/types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

// New Sub-components
import { ProductSelector } from '@/components/sales/ProductSelector';
import { InvoiceFormMeta } from '@/components/sales/InvoiceFormMeta';
import { InvoiceFormItems } from '@/components/sales/InvoiceFormItems';
import { InvoiceFormSummary } from '@/components/sales/InvoiceFormSummary';

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
  const [invoiceType, setOrderTypeState] = useState<'retail' | 'wholesale'>('retail');
  
  const setOrderType = (type: 'retail' | 'wholesale') => {
    setOrderTypeState(type);
    setItems(prevItems => prevItems.map(item => {
       const isWholesale = (type === 'wholesale');
       const newPrice = Number(isWholesale ? item.product.wholesale_selling_price : item.product.selling_price);
       return { ...item, is_wholesale: isWholesale, unit_price: newPrice };
    }));
    if (items.length > 0) {
        toast.info(`Prix mis à jour pour la vente en ${type === 'wholesale' ? 'Gros' : 'Détail'}`);
    }
  };

  const [productSearch, setProductSearch] = useState('');
  const [posIdInitialized, setPosIdInitialized] = useState(false);
  const [itemsInitialized, setItemsInitialized] = useState(false);

  // -- Queries --
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => salesService.getClients(),
  });

  const { data: posData } = useQuery({
    queryKey: ['pos'],
    queryFn: () => salesService.getPointsOfSale(),
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
    queryFn: () => financeService.getInvoice(id!),
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

      const payload: any = {
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

  // -- Totals --
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const total = Math.max(0, subtotal - globalDiscount);
    return { subtotal, total };
  }, [items, globalDiscount]);


  if (isEdit && isLoadingInvoice) {
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-slate-50 font-sans">
      
      {/* LEFT PANEL: PRODUCT CATALOG */}
      <ProductSelector 
        productSearch={productSearch}
        setProductSearch={setProductSearch}
        invoiceType={invoiceType}
        setOrderType={setOrderType}
        isLoadingProducts={isLoadingProducts}
        products={productsData?.results || []}
        onAddItem={handleAddItem}
        onBack={() => navigate('/invoices')}
      />

      {/* RIGHT PANEL: CART & INVOICE */}
      <div className="w-full lg:w-[450px] xl:w-[480px] bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl z-20">
         
         <InvoiceFormMeta 
            isEdit={isEdit}
            invoiceNumber={existingInvoice?.invoice_number}
            selectedPosId={selectedPosId}
            setSelectedPosId={setSelectedPosId}
            posData={posData}
            selectedClientId={selectedClientId}
            setSelectedClientId={setSelectedClientId}
            clientsData={clientsData}
            dateIssued={dateIssued}
            setDateIssued={setDateIssued}
            dateDue={dateDue}
            setDateDue={setDateDue}
         />

         <InvoiceFormItems 
            items={items}
            onRemoveItem={handleRemoveItem}
            onUpdateItem={updateItem}
         />

         <InvoiceFormSummary 
            subtotal={totals.subtotal}
            globalDiscount={globalDiscount}
            setGlobalDiscount={setGlobalDiscount}
            total={totals.total}
            notes={notes}
            setNotes={setNotes}
            onSave={(status) => createInvoiceMutation.mutate(status)}
            isPending={createInvoiceMutation.isPending}
            isEdit={isEdit}
            canSave={items.length > 0}
         />
         
      </div>

    </div>
  );
}
