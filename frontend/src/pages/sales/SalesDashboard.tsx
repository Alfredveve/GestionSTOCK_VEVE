import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  ShoppingCart, 
  DollarSign, 
  Calendar,
  Filter,
  Download,
  Receipt,
  Monitor,
  FileText,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import salesService from '@/services/salesService';
import type { Order } from '@/services/salesService';
import inventoryService from '@/services/inventoryService';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SalesStats {
  total_sales: number;
  total_amount: number;
  pos_sales: number;
  invoice_sales: number;
  retail_amount: number;
  wholesale_amount: number;
}

export function SalesDashboard() {
  // Filters State
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'single' | 'range'>('range');
  const [singleDate, setSingleDate] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [posFilter, setPosFilter] = useState<string>('all');

  // Pagination State
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Build query params
  const getBaseParams = () => {
    const params: Record<string, string> = {};
    
    if (statusFilter !== 'all') params.status = statusFilter;
    if (posFilter !== 'all') params.point_of_sale = posFilter;

    if (dateFilterMode === 'single' && singleDate) {
      params.date = singleDate;
    } else if (dateFilterMode === 'range') {
      if (startDate) params.date_from = startDate;
      if (endDate) params.date_to = endDate;
    }
    
    return params;
  };

  // Fetch stats (all matching records)
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['sales-stats', dateFilterMode, singleDate, startDate, endDate, statusFilter, posFilter],
    queryFn: async () => {
      const params = {
        ...getBaseParams(),
        page_size: 10000 // Large enough to cover reasonable range for stats
      };
      return salesService.getOrders(params);
    }
  });

  // Fetch paginated list
  const { data: listData, isLoading: isLoadingList, refetch: refetchList } = useQuery({
    queryKey: ['sales-list', page, dateFilterMode, singleDate, startDate, endDate, statusFilter, posFilter],
    queryFn: async () => {
      const params = {
        ...getBaseParams(),
        page: page,
        page_size: pageSize
      };
      return salesService.getOrders(params);
    }
  });

  // Fetch points of sale
  const { data: posData } = useQuery({
    queryKey: ['points-of-sale'],
    queryFn: () => inventoryService.getPointsOfSale()
  });

  // Calculate statistics from the "statsData" (full list)
  const stats: SalesStats = {
    total_sales: statsData?.results?.length || 0,
    total_amount: statsData?.results?.reduce((sum: number, inv: Order) => sum + parseFloat(inv.total_amount || '0'), 0) || 0,
    pos_sales: statsData?.results?.filter((inv: Order) => inv.status === 'validated').length || 0,
    invoice_sales: statsData?.results?.filter((inv: Order) => inv.status !== 'validated').length || 0,
    retail_amount: statsData?.results?.filter((inv: Order) => inv.order_type === 'retail').reduce((sum: number, inv: Order) => sum + parseFloat(inv.total_amount || '0'), 0) || 0,
    wholesale_amount: statsData?.results?.filter((inv: Order) => inv.order_type === 'wholesale').reduce((sum: number, inv: Order) => sum + parseFloat(inv.total_amount || '0'), 0) || 0,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      maximumFractionDigits: 0
    }).format(amount) + ' GNF';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      draft: { label: 'Brouillon', className: 'bg-slate-100 text-slate-600' },
      sent: { label: 'Envoyé', className: 'bg-blue-100 text-blue-600' },
      paid: { label: 'Payé', className: 'bg-green-100 text-green-600' },
      validated: { label: 'Validé (POS)', className: 'bg-emerald-100 text-emerald-600' },
      cancelled: { label: 'Annulé', className: 'bg-red-100 text-red-600' },
    };
    const variant = variants[status] || { label: status, className: 'bg-gray-100 text-gray-600 outline outline-1 outline-gray-200' };
    return <Badge className={`${variant.className} font-bold text-xs border-0`}>{variant.label}</Badge>;
  };

  const getSourceIcon = (status: string) => {
    return status === 'validated' ? (
      <div className="flex items-center gap-1.5 text-emerald-600">
        <Monitor className="h-4 w-4" />
        <span className="text-xs font-bold">POS</span>
      </div>
    ) : (
      <div className="flex items-center gap-1.5 text-blue-600">
        <FileText className="h-4 w-4" />
        <span className="text-xs font-bold">Facture</span>
      </div>
    );
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Génération du PDF...");
      await salesService.exportOrdersPdf(getBaseParams());
      toast.success("PDF téléchargé avec succès");
    } catch {
      toast.error("Erreur lors de l'export PDF");
    }
  };

  const handleExportExcel = async () => {
    try {
      toast.info("Génération de l'Excel...");
      await salesService.exportOrdersExcel(getBaseParams());
      toast.success("Excel téléchargé avec succès");
    } catch {
      toast.error("Erreur lors de l'export Excel");
    }
  };

  const handleClearDateFilters = () => {
    setDateFilterMode('all');
    setSingleDate('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">Tableau de Bord des Ventes</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Vue consolidée de toutes vos transactions</p>
        </div>
        <div className="flex items-center gap-2">
           <Button 
            variant="outline"
            className="bg-white"
            onClick={() => refetchList()}
           >
             <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingList && "animate-spin")} />
             Actualiser
           </Button>
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800 shadow-lg text-white">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  Exporter en PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exporter en Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-slate-700 text-lg">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Status & POS - 4 Cols */}
            <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="validated">Validé (POS)</SelectItem>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="sent">Envoyé</SelectItem>
                    <SelectItem value="paid">Payé</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Point de Vente</label>
                 <Select value={posFilter} onValueChange={(v) => { setPosFilter(v); setPage(1); }}>
                  <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {posData?.results?.map((pos: { id: number; name: string }) => (
                      <SelectItem key={pos.id} value={pos.id.toString()}>
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Filters - 8 Cols */}
            <div className="lg:col-span-8 space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Période</label>
               <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-1 bg-slate-50 rounded-lg border border-slate-100">
                  {/* Mode Selector */}
                  <div className="flex bg-white rounded-md border border-slate-200 shadow-xs p-1">
                    <button 
                      onClick={() => { setDateFilterMode('all'); setPage(1); }}
                      className={cn(
                        "px-3 py-1.5 rounded text-xs font-bold transition-all",
                        dateFilterMode === 'all' ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      )}
                    >
                      Tout
                    </button>
                    <button 
                      onClick={() => { setDateFilterMode('single'); setPage(1); }}
                      className={cn(
                        "px-3 py-1.5 rounded text-xs font-bold transition-all",
                        dateFilterMode === 'single' ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      )}
                    >
                      Date
                    </button>
                    <button 
                      onClick={() => { setDateFilterMode('range'); setPage(1); }}
                      className={cn(
                        "px-3 py-1.5 rounded text-xs font-bold transition-all",
                        dateFilterMode === 'range' ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      )}
                    >
                      Période
                    </button>
                  </div>

                  {/* Inputs */}
                  <div className="flex-1 flex items-center gap-2 w-full sm:w-auto">
                    {dateFilterMode === 'single' && (
                       <div className="relative flex-1 sm:max-w-[200px]">
                         <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                         <Input 
                           type="date"
                           value={singleDate}
                           onChange={(e) => { setSingleDate(e.target.value); setPage(1); }}
                           className="pl-9 h-9 bg-white border-slate-200"
                         />
                       </div>
                    )}
                     {dateFilterMode === 'range' && (
                      <div className="flex items-center gap-2 w-full">
                        <div className="relative flex-1">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                          <Input 
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            className="pl-9 h-9 bg-white border-slate-200 w-full"
                          />
                        </div>
                        <span className="text-slate-400 text-sm">au</span>
                        <div className="relative flex-1">
                           <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                           <Input 
                             type="date"
                             value={endDate}
                             onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                             className="pl-9 h-9 bg-white border-slate-200 w-full"
                           />
                        </div>
                      </div>
                    )}
                  </div>
                  
                   {dateFilterMode !== 'all' && (singleDate || startDate || endDate) && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={handleClearDateFilters}
                        className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
               </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <Card className="border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Ventes</p>
                  <p className="text-3xl font-black text-slate-900 mt-2">
                    {isLoadingStats ? "..." : stats.total_sales}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-6">
           <Card className="border-l-4 border-l-emerald-500 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chiffre d'Affaires</p>
                  <p className="text-2xl font-black text-emerald-600 mt-2">
                    {isLoadingStats ? "..." : formatCurrency(stats.total_amount)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
           <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ventes POS</p>
                  <p className="text-3xl font-black text-slate-900 mt-2">
                     {isLoadingStats ? "..." : stats.pos_sales}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Monitor className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
            <Card className="border-l-4 border-l-orange-500 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Factures Pro</p>
                  <p className="text-3xl font-black text-slate-900 mt-2">
                     {isLoadingStats ? "..." : stats.invoice_sales}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Sales Table */}
      <Card className="border border-slate-200 shadow-md rounded-xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50 px-6 py-4 border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-slate-800 font-bold text-lg">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            Historique des Ventes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingList ? (
            <div className="p-20 text-center flex flex-col items-center justify-center text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
              Chargement des données...
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 sm:px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">N° Facture</th>
                      <th className="hidden sm:table-cell px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Client</th>
                      <th className="hidden lg:table-cell px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                      <th className="hidden md:table-cell px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Source</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Montant</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest sticky right-0 bg-slate-50 shadow-l">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {listData?.results?.map((invoice: Order, index: number) => (
                      <motion.tr
                        key={invoice.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                         <td className="px-4 sm:px-6 py-4 font-mono text-sm font-bold text-indigo-600">{invoice.order_number}</td>
                        <td className="hidden sm:table-cell px-6 py-4 text-sm text-slate-600 font-medium">
                          <div className="flex items-center gap-2">
                             <Calendar className="h-3.5 w-3.5 text-slate-400" />
                             {new Date(invoice.date_created!).toLocaleDateString('fr-FR')}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm font-bold text-slate-700">{invoice.client_name || 'N/A'}</td>
                        <td className="hidden lg:table-cell px-6 py-4">
                          <Badge variant="outline" className={invoice.order_type === 'retail' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-purple-50 text-purple-600 border-purple-200'}>
                            {invoice.order_type === 'retail' ? 'Détail' : 'Gros'}
                          </Badge>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4">{getSourceIcon(invoice.status!)}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm font-black text-slate-900">{formatCurrency(parseFloat(invoice.total_amount!))}</td>
                        <td className="px-4 sm:px-6 py-4 sticky right-0 bg-white group-hover:bg-slate-50/80 transition-colors">{getStatusBadge(invoice.status!)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {(!listData?.results || listData.results.length === 0) && (
                <div className="p-16 text-center text-slate-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-slate-200" />
                  <p className="font-bold text-lg text-slate-400">Aucune vente trouvée</p>
                  <p className="text-sm">Essayez de modifier vos filtres</p>
                </div>
              )}

              {/* Pagination */}
              {listData?.count > pageSize && (
                 <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                   <div className="text-sm text-slate-500 font-medium">
                     Affichage de {Math.min(listData.count, (page - 1) * pageSize + 1)} à {Math.min(listData.count, page * pageSize)} sur {listData.count} résultats
                   </div>
                   <div className="flex items-center gap-2">
                     <Button
                       variant="outline"
                       size="icon"
                       disabled={page === 1}
                       onClick={() => setPage(prev => Math.max(1, prev - 1))}
                       className="h-8 w-8 border-slate-200 bg-white hover:bg-slate-50"
                     >
                       <ChevronLeft className="h-4 w-4" />
                     </Button>
                     <div className="flex items-center justify-center h-8 min-w-[32px] px-2 rounded-md bg-slate-900 text-white text-xs font-bold">
                       {page}
                     </div>
                     <Button
                       variant="outline"
                       size="icon"
                       disabled={!listData.next}
                       onClick={() => setPage(prev => prev + 1)}
                       className="h-8 w-8 border-slate-200 bg-white hover:bg-slate-50"
                     >
                       <ChevronRight className="h-4 w-4" />
                     </Button>
                   </div>
                 </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
