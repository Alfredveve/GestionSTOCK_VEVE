import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  MapPin,
  Loader2,
  LayoutGrid,
  List,
  Box,
  FileSpreadsheet,
  FileText,
  Calendar,
  X
} from 'lucide-react';
import inventoryService from '@/services/inventoryService';
import type { PointOfSale } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
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

export function InventoryByPOS() {
  const [selectedPOS, setSelectedPOS] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);
  
  // Filtering states
  const [dateFilter, setDateFilter] = useState<'all' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Fetch POS list
  const { data: posData } = useQuery({
    queryKey: ['points-of-sale'],
    queryFn: () => inventoryService.getPointsOfSale(),
  });

  // Fetch Inventory by POS
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory-by-pos', selectedPOS, searchTerm, page, startDate, endDate],
    queryFn: () => inventoryService.getInventoryByPOS({
      point_of_sale: selectedPOS === 'all' ? undefined : selectedPOS,
      search: searchTerm,
      page,
      page_size: 12,
      // Date filtering for 'last_updated'
      last_updated__gte: startDate || undefined,
      last_updated__lte: endDate || undefined,
    }),
  });

  const handlePOSChange = (value: string) => {
    setSelectedPOS(value);
    setPage(1);
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting('excel');
      await inventoryService.exportInventoryByPOSExcel();
      toast.success("Inventaire POS exporté avec succès vers Excel");
    } catch {
      toast.error("Erreur lors de l'exportation Excel");
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting('pdf');
      await inventoryService.exportInventoryByPOSPdf();
      toast.success("Inventaire POS exporté avec succès vers PDF");
    } catch {
      toast.error("Erreur lors de l'exportation PDF");
    } finally {
      setIsExporting(null);
    }
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setDateFilter('all');
    setSearchTerm('');
    setSelectedPOS('all');
  };

  return (
    <div className="min-h-screen bg-[#111319] p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
             <div className="bg-emerald-600 p-1.5 rounded-lg shadow-lg shadow-emerald-500/20 shrink-0">
               <MapPin className="h-5 w-5 sm:h-6 text-white" />
             </div>
             <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase text-balance leading-tight">Stock par Point de Vente</h2>
          </div>
          <p className="text-slate-400 mt-2 font-medium text-xs sm:text-sm">Visualisez l'état précis de vos stocks pour chaque emplacement</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                    variant="outline" 
                    onClick={handleExportExcel}
                    disabled={isExporting !== null}
                    className="flex-1 sm:flex-none bg-[#23262f] border-none text-slate-300 hover:bg-[#2d3039] hover:text-white transition-all disabled:opacity-50 h-11 sm:h-12 rounded-xl text-xs sm:text-sm"
                >
                    {isExporting === 'excel' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                    Excel
                </Button>
                <Button 
                    variant="outline" 
                    onClick={handleExportPdf}
                    disabled={isExporting !== null}
                    className="flex-1 sm:flex-none bg-[#23262f] border-none text-slate-300 hover:bg-[#2d3039] hover:text-white transition-all disabled:opacity-50 h-11 sm:h-12 rounded-xl text-xs sm:text-sm"
                >
                    {isExporting === 'pdf' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    PDF
                </Button>
            </div>
            
            <Select value={selectedPOS} onValueChange={handlePOSChange}>
              <SelectTrigger className="w-full sm:w-[240px] h-11 sm:h-12 bg-[#23262f] border-none text-white rounded-xl focus:ring-2 focus:ring-emerald-500/50 text-xs sm:text-sm">
                <SelectValue placeholder="Sélectionner un point de vente" />
              </SelectTrigger>
              <SelectContent className="bg-[#23262f] border-slate-700 text-white">
                <SelectItem value="all">Tous les points de vente</SelectItem>
                {posData?.results?.map((pos: PointOfSale) => (
                  <SelectItem key={pos.id} value={pos.id.toString()}>
                    {pos.name} ({pos.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
      </div>

      <Card className="border-none shadow-2xl bg-[#1a1c23] rounded-4xl overflow-hidden">
        {/* Filters Bar */}
        <div className="p-6 bg-[#23262f]/30 border-b border-white/5 space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
             <div className="relative w-full md:flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Rechercher un produit dans ce stock..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 bg-[#111319] border-none text-white h-12 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                />
             </div>
             
             <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <Select value={dateFilter} onValueChange={(v: 'all' | 'custom') => setDateFilter(v)}>
                    <SelectTrigger className="w-full sm:w-[180px] h-12 bg-[#111319] border-none text-white rounded-xl">
                        <Calendar className="mr-2 h-4 w-4 text-emerald-500" />
                        <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#23262f] border-slate-700 text-white">
                        <SelectItem value="all">Toutes les dates</SelectItem>
                        <SelectItem value="custom">Intervalle personnalisé</SelectItem>
                    </SelectContent>
                </Select>

                <div className="flex items-center justify-center gap-2 bg-[#111319] p-1.5 rounded-xl border border-white/5 w-full sm:w-auto">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setViewMode('list')}
                    className={cn(
                    "flex-1 sm:flex-none h-9 px-4 rounded-lg font-bold text-[10px] sm:text-xs transition-all",
                    viewMode === 'list' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-white"
                    )}
                >
                    <List className="h-4 w-4 mr-2" />
                    LISTE
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setViewMode('grid')}
                    className={cn(
                    "flex-1 sm:flex-none h-9 px-4 rounded-lg font-bold text-[10px] sm:text-xs transition-all",
                    viewMode === 'grid' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-white"
                    )}
                >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    GRILLE
                </Button>
                </div>
             </div>
          </div>

          {/* Custom Date Inputs */}
          {dateFilter === 'custom' && (
            <div className="flex flex-wrap items-end gap-4 p-4 bg-[#111319]/50 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Du (Mise à jour)</Label>
                    <Input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-[#111319] border-none text-white h-10 rounded-lg w-44"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Au (Mise à jour)</Label>
                    <Input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-[#111319] border-none text-white h-10 rounded-lg w-44"
                    />
                </div>
                {(startDate || endDate || searchTerm || selectedPOS !== 'all') && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={resetFilters}
                        className="h-10 text-slate-400 hover:text-white mb-0.5"
                    >
                        <X className="h-4 w-4 mr-2" />
                        Réinitialiser tout
                    </Button>
                )}
            </div>
          )}
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-4">
               <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
               <p className="text-slate-500 font-bold animate-pulse">Chargement des données d'inventaire...</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#111319]/50">
                   <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="pl-4 sm:pl-8 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-14">Produit</TableHead>
                    <TableHead className="hidden sm:table-cell text-slate-400 font-bold text-[10px] uppercase tracking-widest">Emplacement</TableHead>
                    <TableHead className="text-slate-400 font-bold text-[10px] uppercase tracking-widest text-center">Qté</TableHead>
                    <TableHead className="hidden md:table-cell text-slate-400 font-bold text-[10px] uppercase tracking-widest text-center">Montant Total</TableHead>
                    <TableHead className="hidden lg:table-cell text-slate-400 font-bold text-[10px] uppercase tracking-widest text-center">Analyse</TableHead>
                    <TableHead className="text-slate-400 font-bold text-[10px] uppercase tracking-widest text-center">Statut</TableHead>
                    <TableHead className="hidden xl:table-cell pr-8 text-slate-400 font-bold text-[10px] uppercase tracking-widest text-right">Dernière MAJ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryData?.results?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center gap-4">
                           <div className="h-16 w-16 bg-[#23262f] rounded-3xl flex items-center justify-center text-slate-600">
                             <Box className="h-8 w-8" />
                           </div>
                           <p className="text-slate-500 font-medium">Aucun stock trouvé pour ces critères.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventoryData?.results?.map((item) => (
                      <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                        <TableCell className="pl-4 sm:pl-8 py-4">
                          <div className="flex flex-col">
                             <span className="text-white font-bold uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{item.product_name}</span>
                             <span className="text-[10px] font-mono text-slate-500 mt-0.5">#{item.product_sku}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-none font-bold px-2 py-0.5 rounded-lg text-[10px]">
                            {item.pos_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xl font-black text-white">{item.quantity}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                          <div className="flex flex-col items-center">
                             <span className="text-emerald-400 font-black text-lg">
                               {new Intl.NumberFormat('fr-FR').format(Number(item.total_value || 0))} 
                               <span className="text-[10px] ml-1 opacity-50 font-bold">GNF</span>
                             </span>
                             <span className="text-[10px] text-slate-500 font-bold uppercase">
                               P.U: {new Intl.NumberFormat('fr-FR').format(Number(item.selling_price || 0))}
                             </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-center">
                          <span className="text-[10px] font-bold text-slate-300 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
                            {item.stock_analysis.analysis}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                           <Badge className={cn(
                             "px-3 py-1.5 rounded-xl font-bold border-none",
                             item.quantity > item.reorder_level ? "bg-emerald-500/20 text-emerald-400" :
                             item.quantity > 0 ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"
                           )}>
                             {item.status_label}
                           </Badge>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell pr-8 text-right text-xs text-slate-500 font-medium">
                          <div className="flex flex-col items-end">
                            <span className="text-slate-300">{new Date(item.last_updated).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="text-[10px] mt-0.5 opacity-60">{new Date(item.last_updated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
               {inventoryData?.results?.map((item) => (
                 <div key={item.id} className="bg-[#23262f] p-6 rounded-4xl border border-white/5 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500">
                        <Box className="h-20 w-20 text-emerald-500" />
                    </div>
 
                    <div className="flex justify-between items-start mb-4 relative z-10">
                       <Badge className="bg-blue-500/10 text-blue-400 border-none text-[9px] px-2 py-1 rounded-lg">
                         {item.pos_name}
                       </Badge>
                       <span className="text-[10px] font-mono text-slate-600 font-black">#{item.product_sku}</span>
                    </div>
 
                    <h3 className="text-white font-black text-lg uppercase leading-tight mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2 min-h-14 relative z-10">
                      {item.product_name}
                    </h3>
 
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                       <div className="flex-1 bg-[#111319] p-3 rounded-2xl border border-white/5 group-hover:border-emerald-500/20 transition-all">
                          <p className="text-[9px] text-slate-500 font-black uppercase mb-1">TOTAL</p>
                          <p className="text-2xl font-black text-white">{item.quantity}</p>
                       </div>
                    </div>

                    <div className="mb-6 relative z-10 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 group-hover:bg-emerald-500/10 transition-all">
                       <p className="text-[9px] text-emerald-500/50 font-black uppercase mb-1 tracking-widest">Valeur du Stock</p>
                       <div className="flex items-baseline gap-1">
                          <p className="text-2xl font-black text-emerald-400">
                             {new Intl.NumberFormat('fr-FR').format(Number(item.total_value || 0))}
                          </p>
                          <p className="text-[10px] font-black text-emerald-500/70">GNF</p>
                       </div>
                       <p className="text-[10px] text-slate-500 font-bold mt-1">
                          Unit: {new Intl.NumberFormat('fr-FR').format(Number(item.selling_price || 0))} GNF
                       </p>
                    </div>
 
                    <div className="flex flex-col gap-2 relative z-10">
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Analyse</span>
                          <span className="text-[10px] font-black text-emerald-400">{item.stock_analysis.analysis}</span>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Statut</span>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            item.quantity > item.reorder_level ? "text-emerald-500" :
                            item.quantity > 0 ? "text-amber-500" : "text-rose-500"
                          )}>{item.status_label}</span>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        <div className="p-6 bg-[#23262f]/30 border-t border-white/5 flex items-center justify-between">
           <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
             <span className="text-white mr-2">{inventoryData?.results?.length || 0}</span> sur <span className="text-white ml-1">{inventoryData?.count || 0}</span> PRODUITS
           </p>
           <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                className="bg-[#111319] border-none text-white font-bold h-10 px-6 rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-all"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Précédent
              </Button>
              <div className="h-10 w-10 flex items-center justify-center bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20">
                {page}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-[#111319] border-none text-white font-bold h-10 px-6 rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-all"
                onClick={() => setPage(p => p + 1)}
                disabled={!inventoryData?.next}
              >
                Suivant
              </Button>
           </div>
        </div>
      </Card>
    </div>
  );
}
