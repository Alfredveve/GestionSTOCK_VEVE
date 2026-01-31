import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import inventoryService from '@/services/inventoryService';
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PackageSearch, 
  RefreshCw,
  Download,
  Calendar,
  Layers,
  TrendingUp,
  TrendingDown,
  Box,
  X,
  History,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import type { StockMovement, Product, PointOfSale } from '@/types';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { 
  ClipboardCheck, 
  ArrowLeftRight, 
  AlertTriangle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function StockMovementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const activeTab = searchParams.get('tab') || 'status';

  // Add print styles
  const printStyles = `
    @media print {
      @page {
        margin: 1cm;
        size: A4 landscape;
      }

      body {
        visibility: hidden;
        background: white !important;
        color: black !important;
      }

      /* Hide everything by default */
      * {
        visibility: hidden;
      }

      /* Show print content and its children */
      [data-print-content],
      [data-print-content] * {
        visibility: visible !important;
      }

      /* Position the print content */
      [data-print-content] {
        position: fixed;
        left: 0;
        top: 0;
        width: 100%;
        min-height: 100%; /* Ensure it takes full height */
        margin: 0;
        padding: 0;
        background: white !important;
        color: black !important;
        z-index: 9999;
      }

      /* Ensure text is black and readable */
      [data-print-content] table,
      [data-print-content] th,
      [data-print-content] td,
      [data-print-content] div,
      [data-print-content] span,
      [data-print-content] p,
      [data-print-content] h1 {
        color: black !important;
        text-shadow: none !important;
      }

      /* Table styling */
      table {
        width: 100% !important;
        border-collapse: collapse !important;
      }

      th, td {
        border: 1px solid #ccc !important;
        padding: 8px !important;
        text-align: left !important;
      }

      th {
        background-color: #f0f0f0 !important;
        font-weight: bold !important;
      }

      /* Hide UI elements that shouldn't print */
      [data-print-hide] {
        display: none !important;
      }

      /* Reset effects */
      * {
        box-shadow: none !important;
        transition: none !important;
      }
    }
  `;
  
  const [filterType, setFilterType] = useState<'all' | 'entry' | 'exit' | 'adjustment' | 'transfer' | 'return' | 'defective'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'single' | 'range'>('all');
  const [singleDate, setSingleDate] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [movementFormType, setMovementFormType] = useState<'entry' | 'exit' | 'transfer'>('entry');
  const [quantity, setQuantity] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [fromPosId, setFromPosId] = useState<string>('');
  const [toPosId, setToPosId] = useState<string>('');
  const [operationDate, setOperationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [stockPage, setStockPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [productSearch, setProductSearch] = useState('');

  const { data: movements, isLoading: isLoadingMovements, refetch: refetchMovements } = useQuery({
    queryKey: ['stock-movements', historyPage, filterType, searchQuery, dateFilterMode, singleDate, startDate, endDate],
    queryFn: () => {
      const params: any = { 
        page: historyPage, 
        movement_type: filterType === 'all' ? undefined : filterType,
        search: searchQuery || undefined
      };
      
      if (dateFilterMode === 'single' && singleDate) {
        params.date = singleDate;
      } else if (dateFilterMode === 'range') {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }
      
      return inventoryService.getStockMovements(params);
    },
    placeholderData: (previousData) => previousData,
  });

  // Fetch all products for the dropdown (without pagination)
  const { 
    data: allProducts, 
    isLoading: isLoadingAllProducts,
    isError: isErrorProducts,
    refetch: refetchAllProducts 
  } = useQuery({
    queryKey: ['products-all-for-dropdown'],
    queryFn: () => inventoryService.getProducts({ 
      page_size: 1000 // Fetch all products for dropdown
    }),
  });

  // Fetch paginated products for the stock status table
  const { data: products, isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['products-stock', stockPage, searchQuery],
    queryFn: () => inventoryService.getProducts({ 
      page_size: 10, 
      page: stockPage,
      search: searchQuery || undefined
    }),
    placeholderData: (previousData) => previousData,
  });

  const { data: pointsOfSale } = useQuery({
    queryKey: ['points-of-sale'],
    queryFn: () => inventoryService.getPointsOfSale(),
  });

  const createMovementMutation = useMutation({
    mutationFn: (data: { 
      product: number; 
      quantity: number; 
      movement_type: string; 
      from_point_of_sale: number;
      to_point_of_sale?: number;
      reference?: string;
      created_at?: string;
    }) => inventoryService.createStockMovement(data),
    onSuccess: () => {
      toast.success('Mouvement enregistré avec succès');
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products-stock'] });
      queryClient.invalidateQueries({ queryKey: ['products-all-for-dropdown'] });
      // Reset form
      setQuantity('');
      setReference('');
      setSelectedProductId('');
      setFromPosId('');
      setToPosId('');
      // Redirect to history
      setSearchParams({ tab: 'history' });
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'enregistrement du mouvement');
      console.error(error);
    }
  });

  const handleRecordMovement = () => {
    if (!selectedProductId || !quantity || !fromPosId) {
      toast.error('Veuillez remplir tous les champs obligatoires (Produit, Quantité, Magasin Source)');
      return;
    }
    
    if (movementFormType === 'transfer' && !toPosId) {
      toast.error('Veuillez sélectionner un magasin de destination pour le transfert');
      return;
    }

    createMovementMutation.mutate({
      product: parseInt(selectedProductId),
      quantity: parseFloat(quantity),
      movement_type: movementFormType,
      from_point_of_sale: parseInt(fromPosId),
      to_point_of_sale: movementFormType === 'transfer' ? parseInt(toPosId) : undefined,
      reference: reference || undefined,
      created_at: operationDate ? `${operationDate}T12:00:00Z` : undefined
    });
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // Export functions
  const handleExportPDF = () => {
    if (activeTab !== 'history') {
      setSearchParams({ tab: 'history' });
      toast.info("Préparation de l'impression...");
      // Wait for the tab to switch and content to render
      setTimeout(() => {
        window.print();
      }, 500);
      return;
    }
    window.print();
  };

  const handleExportExcel = () => {
    if (!movements?.results || movements.results.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    // Prepare CSV data
    // Prepare CSV data
    const headers = ['Date', 'Heure', 'Produit', 'Type', 'Magasin Source', 'Magasin Destination', 'Quantité', 'Référence'];
    const rows = movements.results.map((m: StockMovement) => [
      new Date(m.created_at).toLocaleDateString('fr-FR'),
      new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      m.product_name,
      m.type_display,
      m.from_pos_name,
      m.to_pos_name || '-',
      m.quantity,
      m.reference || '-'
    ]);

    // Create CSV content with BOM for Excel compatibility and semicolon separator
    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rows.map(row => row.map(cell => {
        // Handle cells that might contain the separator or quotes
        const cellStr = String(cell);
        if (cellStr.includes(';') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(';'))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `mouvements_stock_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export Excel réussi!');
  };

  const handleClearDateFilters = () => {
    setDateFilterMode('all');
    setSingleDate('');
    setStartDate('');
    setEndDate('');
    setHistoryPage(1);
  };



  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'entry': return <ArrowDownLeft className="h-3 w-3" />;
      case 'exit': return <ArrowUpRight className="h-3 w-3" />;
      case 'transfer': return <RefreshCw className="h-3 w-3" />;
      case 'return': return <History className="h-3 w-3" />;
      case 'adjustment': return <Layers className="h-3 w-3" />;
      case 'defective': return <X className="h-3 w-3" />;
      default: return <PackageSearch className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'entry': return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case 'exit': return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case 'transfer': return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
      case 'return': return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case 'adjustment': return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case 'defective': return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  // Derived state for stats
  const totalMovements = movements?.count || 0;
  const entriesCount = movements?.results?.filter((m: StockMovement) => m.movement_type === 'entry').length || 0;
  const stockOutCount = movements?.results?.filter((m: StockMovement) => m.movement_type === 'exit').length || 0;

  const filteredMovements = movements?.results || [];

  // Filter products for the dropdown based on search
  const filteredProducts = allProducts?.results?.filter((p: Product) => {
    // Always include the currently selected product if it exists
    if (selectedProductId && p.id.toString() === selectedProductId) return true;
    
    if (!productSearch) return true;
    
    const search = productSearch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const name = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const sku = (p.sku || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    return name.includes(search) || sku.includes(search);
  }) || [];



  return (
    <>
      {/* Inject print styles */}
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      
      <div className="min-h-screen bg-[#0a0a0c] text-white p-4 md:p-8 space-y-8 pb-20 rounded-2xl border border-white/5 shadow-2xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" data-print-hide>
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="bg-linear-to-br from-indigo-600 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
               <PackageSearch className="h-6 w-6 text-white" />
             </div>
             <h1 className="text-3xl font-bold tracking-tight text-white">Gestion de Stock</h1>
          </div>
          <p className="text-white/70 ml-1">
            Visualisez, suivez et enregistrez les mouvements de votre inventaire.
          </p>
        </div>
        
        <div className="flex gap-2">
           <Button 
             variant="outline" 
             size="sm" 
             className="h-9 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white" 
             onClick={async () => { 
               await Promise.all([refetchMovements(), refetchProducts(), refetchAllProducts()]);
               toast.success("Données actualisées");
             }}
             disabled={isLoadingMovements || isLoadingProducts || isLoadingAllProducts}
           >
             <RefreshCw className={cn("h-4 w-4 mr-2", (isLoadingMovements || isLoadingProducts || isLoadingAllProducts) && "animate-spin")} />
             Actualiser
           </Button>
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="outline" size="sm" className="h-9 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
                 <Download className="h-4 w-4 mr-2" />
                 Exporter
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="bg-gray-900 border-white/10 text-white">
               <DropdownMenuItem onClick={handleExportPDF} className="hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white">
                 <FileText className="h-4 w-4 mr-2" />
                 Exporter en PDF
               </DropdownMenuItem>
               <DropdownMenuItem onClick={handleExportExcel} className="hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white">
                 <FileSpreadsheet className="h-4 w-4 mr-2" />
                 Exporter en Excel
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
        <TabsList className="bg-white/5 border border-white/10 p-1 h-14 rounded-2xl backdrop-blur-md">
          <TabsTrigger value="status" className="rounded-xl px-6 h-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg font-bold transition-all gap-2">
            <ClipboardCheck className="h-4 w-4" /> État du stock
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl px-6 h-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg font-bold transition-all gap-2">
            <History className="h-4 w-4" /> Historique
          </TabsTrigger>
          <TabsTrigger value="movements" className="rounded-xl px-6 h-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg font-bold transition-all gap-2">
            <ArrowLeftRight className="h-4 w-4" /> Entrée/Sortie
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-8 focus-visible:outline-none focus-visible:ring-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {/* Stats here if needed */}
             <Card className="bg-linear-to-br from-gray-900 to-gray-800 border-white/5 shadow-xl">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">Stock Global</p>
                    <div className="text-3xl font-bold text-white mt-1">
                      {products?.results?.reduce((acc: number, p: Product) => acc + (p.current_stock || 0), 0) || 0}
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <Box className="h-6 w-6 text-indigo-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-linear-to-br from-gray-900 to-gray-800 border-white/5 shadow-xl">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">Alertes Stock Faible</p>
                    <div className="text-3xl font-bold text-amber-500 mt-1">
                      {products?.results?.filter((p: Product) => p.current_stock <= p.reorder_level && p.current_stock > 0).length || 0}
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-linear-to-br from-gray-900 to-gray-800 border-white/5 shadow-xl">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">Ruptures de Stock</p>
                    <div className="text-3xl font-bold text-rose-500 mt-1">
                      {products?.results?.filter((p: Product) => p.current_stock === 0).length || 0}
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                    <X className="h-6 w-6 text-rose-500" />
                  </div>
                </CardContent>
              </Card>
          </div>

          <Card className="border-white/10 bg-linear-to-b from-gray-900/90 to-black/90 backdrop-blur-2xl shadow-2xl overflow-hidden">
            <CardContent className="p-0">
               <Table>
                <TableHeader className="bg-white/5 border-b border-white/5">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="py-4 pl-6 text-[11px] font-bold uppercase tracking-widest text-white">Produit</TableHead>
                    <TableHead className="py-4 text-[11px] font-bold uppercase tracking-widest text-white">SKU</TableHead>
                    <TableHead className="py-4 text-[11px] font-bold uppercase tracking-widest text-white">Stock Actuel</TableHead>
                    <TableHead className="py-4 text-[11px] font-bold uppercase tracking-widest text-white">Analyse</TableHead>
                    <TableHead className="py-4 pr-6 text-right text-[11px] font-bold uppercase tracking-widest text-white">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingProducts ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-white/5">
                        <TableCell className="pl-6"><div className="h-4 w-48 bg-white/5 animate-pulse rounded" /></TableCell>
                        <TableCell><div className="h-4 w-24 bg-white/5 animate-pulse rounded" /></TableCell>
                        <TableCell><div className="h-4 w-16 bg-white/5 animate-pulse rounded" /></TableCell>
                        <TableCell><div className="h-4 w-32 bg-white/5 animate-pulse rounded" /></TableCell>
                        <TableCell className="pr-6 text-right"><div className="h-8 w-24 bg-white/5 animate-pulse rounded-full ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : products?.results?.map((product: Product) => (
                    <TableRow key={product.id} className="group border-b border-white/5 hover:bg-white/2 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="font-semibold text-white">{product.name}</div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-xs font-mono text-white/50">{product.sku}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="font-bold text-white">{product.current_stock}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-xs text-white/70">{product.stock_analysis?.analysis}</span>
                      </TableCell>
                      <TableCell className="pr-6 py-4 text-right">
                        {product.current_stock > product.reorder_level ? (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold gap-1">
                            <CheckCircle2 className="h-3 w-3" /> En stock
                          </Badge>
                        ) : product.current_stock > 0 ? (
                          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold gap-1">
                            <AlertTriangle className="h-3 w-3" /> Stock faible
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 font-bold gap-1">
                            <X className="h-3 w-3" /> Rupture
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
               </Table>
               
               {/* Pagination Stock */}
               {products?.count && products.count > 10 && (
                 <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/2">
                   <div className="text-sm text-white/50 font-medium">
                     Affichage de {Math.min(products.count, (stockPage - 1) * 10 + 1)} à {Math.min(products.count, stockPage * 10)} sur {products.count} produits
                   </div>
                   <div className="flex items-center gap-2">
                     <Button
                       variant="outline"
                       size="icon"
                       disabled={stockPage === 1}
                       onClick={() => setStockPage(prev => prev - 1)}
                       className="h-9 w-9 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30 transition-all rounded-lg"
                     >
                       <ChevronLeft className="h-4 w-4" />
                     </Button>
                     <div className="flex items-center justify-center h-9 min-w-[36px] px-2 rounded-lg bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/20">
                       {stockPage}
                     </div>
                     <Button
                       variant="outline"
                       size="icon"
                       disabled={!products?.next}
                       onClick={() => setStockPage(prev => prev + 1)}
                       className="h-9 w-9 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30 transition-all rounded-lg"
                     >
                       <ChevronRight className="h-4 w-4" />
                     </Button>
                   </div>
                 </div>
               )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-8 focus-visible:outline-none focus-visible:ring-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-print-hide>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-linear-to-br from-gray-900 to-gray-800 border-white/5 shadow-xl">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">Total Mouvements</p>
                    <div className="text-3xl font-bold text-white mt-1">{totalMovements}</div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Layers className="h-6 w-6 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-linear-to-br from-gray-900 to-gray-800 border-white/5 shadow-xl">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">Entrées (Restock)</p>
                    <div className="text-3xl font-bold text-emerald-400 mt-1">+{entriesCount}</div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <TrendingDown className="h-6 w-6 text-emerald-400" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="bg-linear-to-br from-gray-900 to-gray-800 border-white/5 shadow-xl">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">Sorties (Ventes)</p>
                    <div className="text-3xl font-bold text-rose-400 mt-1">-{stockOutCount}</div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                    <TrendingUp className="h-6 w-6 text-rose-400" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Filters & Search */}
          <div className="space-y-4" data-print-hide>
            {/* Type Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-white/10 w-full sm:w-auto overflow-x-auto no-scrollbar">
                  <button 
                    onClick={() => { setFilterType('all'); setHistoryPage(1); }}
                    className={cn(
                      "px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                      filterType === 'all' ? "bg-white/10 text-white shadow-lg" : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    Tout voir
                  </button>
                  <button 
                    onClick={() => { setFilterType('entry'); setHistoryPage(1); }}
                    className={cn(
                      "px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2",
                      filterType === 'entry' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25" : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <ArrowDownLeft className="h-3 w-3" /> Entrées
                  </button>
                  <button 
                    onClick={() => { setFilterType('exit'); setHistoryPage(1); }}
                    className={cn(
                      "px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2",
                      filterType === 'exit' ? "bg-rose-600 text-white shadow-lg shadow-rose-500/25" : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <ArrowUpRight className="h-3 w-3" /> Sorties
                  </button>
              </div>

              <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                  <Input 
                    placeholder="Rechercher un mouvement..." 
                    className="pl-10 bg-black/20 border-white/10 text-white placeholder:text-white/40 focus:ring-indigo-500/50"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setStockPage(1);
                      setHistoryPage(1);
                    }}
                  />
              </div>
            </div>

            {/* Date Filters and Export Buttons */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
              {/* Date Filter Mode Selector */}
              <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-white/10">
                <button 
                  onClick={() => { setDateFilterMode('all'); setHistoryPage(1); }}
                  className={cn(
                    "px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                    dateFilterMode === 'all' ? "bg-white/10 text-white shadow-lg" : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  Toutes dates
                </button>
                <button 
                  onClick={() => { setDateFilterMode('single'); setHistoryPage(1); }}
                  className={cn(
                    "px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                    dateFilterMode === 'single' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25" : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Calendar className="h-3 w-3" /> Date unique
                </button>
                <button 
                  onClick={() => { setDateFilterMode('range'); setHistoryPage(1); }}
                  className={cn(
                    "px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                    dateFilterMode === 'range' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25" : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Calendar className="h-3 w-3" /> Intervalle
                </button>
              </div>

              {/* Date Inputs */}
              <div className="flex items-center gap-2 flex-1">
                {dateFilterMode === 'single' && (
                  <div className="relative flex-1 max-w-xs">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
                    <Input 
                      type="date"
                      value={singleDate}
                      onChange={(e) => { setSingleDate(e.target.value); setHistoryPage(1); }}
                      className="pl-10 bg-black/20 border-white/10 text-white focus:ring-indigo-500/50 h-10"
                    />
                  </div>
                )}
                {dateFilterMode === 'range' && (
                  <>
                    <div className="relative flex-1 max-w-xs">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
                      <Input 
                        type="date"
                        placeholder="Date début"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setHistoryPage(1); }}
                        className="pl-10 bg-black/20 border-white/10 text-white placeholder:text-white/40 focus:ring-indigo-500/50 h-10"
                      />
                    </div>
                    <span className="text-white/50 text-sm">à</span>
                    <div className="relative flex-1 max-w-xs">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
                      <Input 
                        type="date"
                        placeholder="Date fin"
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setHistoryPage(1); }}
                        className="pl-10 bg-black/20 border-white/10 text-white placeholder:text-white/40 focus:ring-indigo-500/50 h-10"
                      />
                    </div>
                  </>
                )}
                {dateFilterMode !== 'all' && (singleDate || startDate || endDate) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearDateFilters}
                    className="h-10 text-white/60 hover:text-white hover:bg-white/5"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportPDF}
                  className="h-10 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white gap-2"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportExcel}
                  className="h-10 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
              </div>
            </div>
          </div>

          {/* Movements Table */}
          <div data-print-content>
            <div data-print-header>
              <h1>Historique des Mouvements de Stock</h1>
              <p>Date d'impression: {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
            
            <Card className="border-white/10 bg-linear-to-b from-gray-900/90 to-black/90 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
              <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-white/5 border-b border-white/5">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="py-4 pl-6 text-[11px] font-bold uppercase tracking-widest text-white">Date</TableHead>
                    <TableHead className="py-4 text-[11px] font-bold uppercase tracking-widest text-white">Produit</TableHead>
                    <TableHead className="py-4 text-[11px] font-bold uppercase tracking-widest text-white">Type</TableHead>
                    <TableHead className="py-4 text-[11px] font-bold uppercase tracking-widest text-white">Magasin (S → D)</TableHead>
                    <TableHead className="py-4 text-right text-[11px] font-bold uppercase tracking-widest text-white">Quantité</TableHead>
                    <TableHead className="py-4 pr-6 text-right text-[11px] font-bold uppercase tracking-widest text-white">Référence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingMovements ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-white/5">
                        <TableCell className="pl-6"><div className="h-4 w-32 bg-white/5 animate-pulse rounded" /></TableCell>
                        <TableCell><div className="h-4 w-48 bg-white/5 animate-pulse rounded" /></TableCell>
                        <TableCell><div className="h-6 w-24 bg-white/5 animate-pulse rounded-full" /></TableCell>
                        <TableCell className="text-right"><div className="h-4 w-12 bg-white/5 animate-pulse rounded ml-auto" /></TableCell>
                        <TableCell className="pr-6"><div className="h-4 w-24 bg-white/5 animate-pulse rounded ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredMovements?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center border-none">
                        <div className="flex flex-col items-center justify-center text-white/50">
                          <PackageSearch className="h-16 w-16 mb-4 stroke-1" />
                          <p className="text-lg font-medium text-white">Aucun mouvement trouvé</p>
                          <p className="text-sm">Essayez de modifier vos filtres ou votre recherche.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <AnimatePresence mode='popLayout'>
                      {filteredMovements?.map((movement: StockMovement, index: number) => (
                        <motion.tr
                          key={movement.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="group border-b border-white/5 hover:bg-white/2 transition-colors"
                        >
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-2">
                               <Calendar className="h-3.5 w-3.5 text-white/60" />
                               <span className="text-sm font-medium text-white">
                                 {new Date(movement.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                               </span>
                               <span className="text-xs text-white ml-1 bg-white/10 px-1.5 py-0.5 rounded font-bold">
                                 {new Date(movement.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                               </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded bg-linear-to-br from-gray-700 to-gray-800 flex items-center justify-center mr-3 border border-white/10">
                                <span className="text-xs font-bold text-white/80">{movement.product_name.substring(0, 2).toUpperCase()}</span>
                              </div>
                              <div>
                                <div className="font-semibold text-white">{movement.product_name}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "gap-1.5 pl-1.5 pr-2.5 py-0.5 md:py-1 text-[11px] uppercase tracking-wider font-bold border",
                                getTypeColor(movement.movement_type)
                              )}
                            >
                              {getTypeIcon(movement.movement_type)}
                              {movement.type_display}
                            </Badge>
                          </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-white/80">{movement.from_pos_name}</span>
                            {movement.movement_type === 'transfer' && movement.to_pos_name && (
                              <>
                                <ArrowRight className="h-3 w-3 text-white/30" />
                                <span className="text-xs font-bold text-indigo-400">{movement.to_pos_name}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <span className={cn(
                            "font-mono font-bold text-sm",
                            movement.movement_type === 'exit' ? "text-rose-400" : 
                            movement.movement_type === 'entry' ? "text-emerald-400" : "text-indigo-400"
                          )}>
                            {movement.movement_type === 'exit' ? '-' : '+'}{movement.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6 py-4">
                           {movement.reference ? (
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-white border border-white/5 font-bold uppercase">
                               {movement.reference}
                             </span>
                           ) : (
                             <span className="text-white/30">-</span>
                           )}
                        </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </TableBody>
              </Table>

              {/* Pagination Historique */}
              {movements?.count && movements.count > 10 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/2" data-print-hide>
                  <div className="text-sm text-white/50 font-medium">
                    Affichage de {Math.min(movements.count, (historyPage - 1) * 10 + 1)} à {Math.min(movements.count, historyPage * 10)} sur {movements.count} mouvements
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage(prev => prev - 1)}
                      className="h-9 w-9 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30 transition-all rounded-lg"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center justify-center h-9 min-w-[36px] px-2 rounded-lg bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/20">
                      {historyPage}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={!movements?.next}
                      onClick={() => setHistoryPage(prev => prev + 1)}
                      className="h-9 w-9 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30 transition-all rounded-lg"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="movements" className="focus-visible:outline-none focus-visible:ring-0">
          <div className="max-w-2xl mx-auto">
             <Card className="border-white/10 bg-linear-to-b from-gray-900 to-black backdrop-blur-2xl shadow-2xl p-8">
               <div className="flex items-center gap-4 mb-8">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                     <ArrowLeftRight className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Nouveau Mouvement</h2>
                    <p className="text-white/60">Enregistrez une entrée ou une sortie de stock</p>
                  </div>
               </div>

               <div className="space-y-6">
                 <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 rounded-xl border border-white/10 h-14">
                    <button 
                    onClick={() => setMovementFormType('entry')}
                    className={cn(
                        "rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                        movementFormType === 'entry' ? "bg-emerald-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                    )}
                    >
                        Entrée
                    </button>
                    <button 
                    onClick={() => setMovementFormType('exit')}
                    className={cn(
                        "rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                        movementFormType === 'exit' ? "bg-rose-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                    )}
                    >
                        Sortie
                    </button>
                    <button 
                    onClick={() => setMovementFormType('transfer')}
                    className={cn(
                        "rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                        movementFormType === 'transfer' ? "bg-indigo-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                    )}
                    >
                        Transfert
                    </button>
                 </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white/70 font-bold uppercase text-[10px] tracking-widest pl-1">Rechercher / Sélectionner un produit</Label>
                      <div className="relative group/search">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within/search:text-indigo-400 transition-colors" />
                         <Input 
                           placeholder="Taper le nom ou SKU..." 
                           value={productSearch}
                           onChange={(e) => setProductSearch(e.target.value)}
                           className="h-12 pl-11 bg-white/5 border-white/10 text-white rounded-xl focus:ring-indigo-500/50 mb-2 border-dashed"
                         />
                      </div>
                      <Select 
                        value={selectedProductId} 
                        onValueChange={setSelectedProductId}
                        disabled={isLoadingAllProducts}
                      >
                        <SelectTrigger className="h-14 bg-white/5 border-white/10 text-white rounded-xl focus:ring-indigo-500/50">
                          <SelectValue placeholder={
                            isLoadingAllProducts ? "Chargement des produits..." : 
                            isErrorProducts ? "Erreur de chargement" : 
                            "Choisir un produit..."
                          } />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-white/10 text-white max-h-[300px]">
                          {isLoadingAllProducts ? (
                            <div className="p-4 text-center text-white/40 text-sm flex items-center justify-center gap-2">
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Chargement...
                            </div>
                          ) : isErrorProducts ? (
                            <div className="p-4 text-center text-rose-400 text-sm">
                              Erreur lors du chargement des produits
                            </div>
                          ) : filteredProducts.length === 0 ? (
                            <div className="p-4 text-center text-white/40 text-sm">
                              {productSearch ? "Aucun produit correspondant" : "Aucun produit trouvé"}
                            </div>
                          ) : (
                            filteredProducts.map((p: Product) => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                <div className="flex flex-col">
                                  <span className="font-semibold">{p.name}</span>
                                  <span className="text-[10px] text-white/40 font-mono">{p.sku} | Stock: {p.current_stock}</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-white/70 font-bold uppercase text-[10px] tracking-widest pl-1">
                        {movementFormType === 'transfer' ? 'Magasin Source' : 'Magasin'}
                       </Label>
                       <Select value={fromPosId} onValueChange={setFromPosId}>
                          <SelectTrigger className="h-14 bg-white/5 border-white/10 text-white rounded-xl focus:ring-indigo-500/50">
                            <SelectValue placeholder="Choisir..." />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-white/10 text-white">
                            {pointsOfSale?.results?.map((pos: PointOfSale) => (
                              <SelectItem key={pos.id} value={pos.id.toString()}>{pos.name}</SelectItem>
                            ))}
                          </SelectContent>
                       </Select>
                    </div>

                    {movementFormType === 'transfer' ? (
                       <div className="space-y-2">
                        <Label className="text-white/70 font-bold uppercase text-[10px] tracking-widest pl-1">Magasin Destination</Label>
                        <Select value={toPosId} onValueChange={setToPosId}>
                           <SelectTrigger className="h-14 bg-white/5 border-white/10 text-white rounded-xl focus:ring-indigo-500/50">
                             <SelectValue placeholder="Dest..." />
                           </SelectTrigger>
                           <SelectContent className="bg-gray-900 border-white/10 text-white">
                             {pointsOfSale?.results?.filter((pos: PointOfSale) => pos.id.toString() !== fromPosId).map((pos: PointOfSale) => (
                               <SelectItem key={pos.id} value={pos.id.toString()}>{pos.name}</SelectItem>
                             ))}
                           </SelectContent>
                        </Select>
                       </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-white/70 font-bold uppercase text-[10px] tracking-widest pl-1">Quantité</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="h-14 bg-white/5 border-white/10 text-white rounded-xl focus:ring-indigo-500/50 text-xl font-bold text-center" 
                        />
                      </div>
                    )}
                 </div>

                 {movementFormType === 'transfer' && (
                    <div className="space-y-2">
                       <Label className="text-white/70 font-bold uppercase text-[10px] tracking-widest pl-1">Quantité à transférer</Label>
                       <Input 
                        type="number" 
                        placeholder="0" 
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="h-14 bg-white/5 border-white/10 text-white rounded-xl focus:ring-indigo-500/50 text-xl font-bold text-center" 
                       />
                    </div>
                 )}

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-white/70 font-bold uppercase text-[10px] tracking-widest pl-1">Date de l'opération</Label>
                        <Input 
                          type="date" 
                          value={operationDate}
                          onChange={(e) => setOperationDate(e.target.value)}
                          className="h-14 bg-white/5 border-white/10 text-white rounded-xl focus:ring-indigo-500/50" 
                        />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-white/70 font-bold uppercase text-[10px] tracking-widest pl-1">Référence / Commande</Label>
                       <Input 
                         placeholder="Ex: INV-2024-001" 
                         value={reference}
                         onChange={(e) => setReference(e.target.value)}
                         className="h-14 bg-white/5 border-white/10 text-white rounded-xl focus:ring-indigo-500/50" 
                       />
                    </div>
                 </div>

                 <div className="pt-4">
                    <Button 
                      onClick={handleRecordMovement}
                      disabled={createMovementMutation.isPending}
                      className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98]"
                    >
                      {createMovementMutation.isPending ? "Enregistrement..." : (
                        movementFormType === 'transfer' ? "Confirmer le transfert" : "Enregistrer le mouvement"
                      )}
                    </Button>
                    <p className="text-center text-white/40 text-[10px] mt-4 uppercase tracking-[0.2em] font-medium">L'inventaire sera mis à jour en temps réel</p>
                 </div>
               </div>
             </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}
