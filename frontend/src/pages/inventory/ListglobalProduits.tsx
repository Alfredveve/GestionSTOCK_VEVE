import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  LayoutGrid, 
  List,
  Box,
  Package,
  Loader2,
  MapPin,
  Monitor
} from 'lucide-react';
import inventoryService from '@/services/inventoryService';
import type { Product, Category } from '@/types';
import { cn } from '@/lib/utils';
import { ProductDetailsDrawer } from '@/components/inventory/ProductDetailsDrawer';
import { ProductForm } from '@/components/inventory/ProductForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRef } from 'react';

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export function ListglobalProduits() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [productForDetails, setProductForDetails] = useState<Product | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleOpenDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsDrawerOpen(true);
  };

  const handleOpenStockBreakdown = (product: Product) => {
    setProductForDetails(product);
    setIsDetailsOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', searchTerm, categoryFilter, statusFilter, page],
    queryFn: () => inventoryService.getProducts({ 
      search: searchTerm, 
      category: categoryFilter || undefined,
      page,
      page_size: 12
    }),
  });

  const { data: stockBreakdown, isLoading: isLoadingBreakdown } = useQuery({
    queryKey: ['inventory-by-product', productForDetails?.id],
    queryFn: () => inventoryService.getInventoryByPOS({ product: productForDetails?.id }),
    enabled: !!productForDetails,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsDeleting(false);
      setProductToDelete(null);
    }
  });

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setIsDeleting(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => inventoryService.getCategories(),
  });



  const handleExportExcel = async () => {
    try {
      setIsExporting('excel');
      await inventoryService.exportProductsExcel();
      toast.success("Inventaire exporté avec succès vers Excel");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'exportation Excel");
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting('pdf');
      await inventoryService.exportProductsPdf();
      toast.success("Inventaire exporté avec succès vers PDF");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'exportation PDF");
    } finally {
      setIsExporting(null);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const result = await inventoryService.importProducts(file);
      toast.success(result.importedCount + " produits importés avec succès");
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'importation des produits");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#111319] p-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
             <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/20">
               <Box className="h-6 w-6 text-white" />
             </div>
             <h2 className="text-4xl font-black tracking-tight text-white uppercase">Liste Globale Produits</h2>
          </div>
          <p className="text-slate-400 mt-2 font-medium">Consultez la disponibilité mondiale de vos produits</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".xlsx, .xls"
            title="Importer des produits"
            aria-label="Importer des produits"
          />
          <Button 
            variant="outline" 
            onClick={handleExportExcel}
            disabled={isExporting !== null}
            className="bg-[#23262f] border-none text-slate-300 hover:bg-[#2d3039] hover:text-white transition-all disabled:opacity-50"
          >
            {isExporting === 'excel' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            Excel
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPdf}
            disabled={isExporting !== null}
            className="bg-[#23262f] border-none text-slate-300 hover:bg-[#2d3039] hover:text-white transition-all disabled:opacity-50"
          >
            {isExporting === 'pdf' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            PDF
          </Button>
          <Button 
            variant="outline" 
            onClick={handleImportClick}
            disabled={isImporting}
            className="bg-[#23262f] border-none text-slate-300 hover:bg-[#2d3039] hover:text-white transition-all disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4 rotate-180" />}
            Importer
          </Button>
          <Button onClick={() => setIsFormOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 font-bold px-6">
            <Plus className="mr-2 h-5 w-5" />
            Nouveau Produit
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-2xl bg-[#1a1c23] rounded-4xl overflow-hidden">
        <div className="bg-linear-to-br from-[#1a1c23] via-[#23262f] to-[#1a1c23] p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h2 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3 uppercase">
                <div className="bg-white/5 p-2.5 rounded-xl backdrop-blur-sm border border-white/10">
                   <Package className="h-6 w-6 text-indigo-400" />
                </div>
                Stock Global
              </h2>
              <div className="flex items-center gap-4">
                <p className="text-slate-400 font-medium pl-14 uppercase tracking-wider text-xs">Visibilité complète sur le réseau de magasins</p>
                <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest backdrop-blur-sm uppercase">
                  {products?.count || 0} ITEMS GLOBAUX
                </Badge>
              </div>
            </div>
            
            <div className="bg-white/5 p-1.5 rounded-xl border border-white/10 flex items-center gap-1 backdrop-blur-sm">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode('list')}
                className={cn(
                  "h-9 px-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all", 
                  viewMode === 'list' 
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  <span>Liste</span>
                </div>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode('grid')}
                className={cn(
                  "h-9 px-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all", 
                  viewMode === 'grid' 
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  <span>Grille</span>
                </div>
              </Button>
            </div>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Rechercher par nom, SKU..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-11 bg-slate-900/50 border-none text-white placeholder:text-slate-500 h-12 rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-all hover:bg-slate-900/70"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <select 
                title="Catégorie"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="h-12 w-full sm:w-48 rounded-xl border-none bg-slate-900/50 px-4 text-sm font-bold outline-none text-slate-300 focus:ring-2 focus:ring-indigo-500/50 transition-all hover:bg-slate-900/70"
              >
                <option value="" className="bg-slate-900">Toutes catégories</option>
                {categories?.results?.map((category: Category) => (
                  <option key={category.id} value={category.id} className="bg-slate-900">{category.name}</option>
                ))}
              </select>

              <select 
                title="Statut"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-12 w-full sm:w-40 rounded-xl border-none bg-slate-900/50 px-4 text-sm font-bold outline-none text-slate-300 focus:ring-2 focus:ring-indigo-500/50 transition-all hover:bg-slate-900/70"
              >
                <option value="" className="bg-slate-900">Tous statuts</option>
                <option value="in_stock" className="bg-slate-900">En Stock</option>
                <option value="low_stock" className="bg-slate-900">Stock Faible</option>
                <option value="out_of_stock" className="bg-slate-900">Rupture</option>
              </select>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#111319]/50">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="w-[60px] pl-8 py-5 text-slate-500 font-bold text-[10px] uppercase tracking-wider">#</TableHead>
                    <TableHead className="min-w-[250px] text-slate-500 font-bold text-[10px] uppercase tracking-wider">PRODUIT</TableHead>
                    <TableHead className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">TOTAL STOCK</TableHead>
                    <TableHead className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">CATÉGORIE</TableHead>
                    <TableHead className="text-slate-500 font-bold text-[10px] uppercase tracking-wider text-center">DÉTAILS</TableHead>
                    <TableHead className="text-slate-500 font-bold text-[10px] uppercase tracking-wider text-center">STATUT</TableHead>
                    <TableHead className="text-slate-500 pr-8 font-bold text-[10px] uppercase tracking-wider text-center">ACTES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-white/5">
                        <TableCell className="pl-8 py-5"><div className="h-4 w-4 bg-slate-800 animate-pulse rounded" /></TableCell>
                        <TableCell><div className="h-4 w-32 bg-slate-800 animate-pulse rounded" /></TableCell>
                        <TableCell><div className="h-6 w-20 bg-slate-800 animate-pulse rounded-lg" /></TableCell>
                        <TableCell><div className="h-6 w-20 bg-slate-800 animate-pulse rounded-lg" /></TableCell>
                        <TableCell><div className="h-8 w-24 bg-slate-800 animate-pulse rounded-xl" /></TableCell>
                        <TableCell><div className="h-6 w-16 bg-slate-800 animate-pulse rounded-lg" /></TableCell>
                        <TableCell className="pr-8"><div className="flex justify-center gap-2"><div className="h-8 w-8 bg-slate-800 animate-pulse rounded-lg" /></div></TableCell>
                      </TableRow>
                    ))
                  ) : products?.results?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Box className="h-12 w-12 text-slate-800" />
                          <span className="text-slate-500 font-medium italic">Aucun produit trouvé.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    products?.results?.map((product: Product, index: number) => (
                      <TableRow key={product.id} className="group hover:bg-white/5 transition-all border-white/5">
                        <TableCell className="pl-8 font-bold text-slate-600">{(page - 1) * 12 + index + 1}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="font-bold text-white text-base uppercase group-hover:text-indigo-400 transition-colors">{product.name}</div>
                            {product.sku && <div className="text-[10px] font-mono text-slate-500 tracking-wider">#{product.sku}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-none font-black text-[11px] px-3 py-1 rounded-lg">
                            {product.current_stock} UNITÉS
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-slate-800 text-slate-400 font-bold uppercase text-[9px] px-2.5 py-1">
                            {product.category_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                           <Button 
                             variant="ghost" 
                             size="sm"
                             onClick={() => handleOpenStockBreakdown(product)}
                             className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 font-black text-[10px] px-3 py-1 rounded-xl transition-all"
                           >
                              <MapPin className="h-3 w-3 mr-1.5" />
                              DÉTAILS MAGASINS
                           </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          {product.current_stock > product.reorder_level ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-none font-bold px-3 py-1 rounded-xl text-[10px] uppercase">
                              En Stock
                            </Badge>
                          ) : product.current_stock > 0 ? (
                            <Badge className="bg-amber-500/20 text-amber-400 border-none font-bold px-3 py-1 rounded-xl text-[10px] uppercase">
                              Stock Faible
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-500/20 text-rose-400 border-none font-bold px-3 py-1 rounded-xl text-[10px] uppercase">
                              Rupture
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="pr-8">
                          <div className="flex items-center justify-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleOpenDetails(product)}
                              className="h-9 w-9 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-xl"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEdit(product)}
                              className="h-9 w-9 text-slate-400 hover:text-amber-400 hover:bg-white/5 rounded-xl"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(product)}
                              className="h-9 w-9 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-xl"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-[220px] rounded-3xl bg-white/5 animate-pulse border border-white/5" />
                  ))
                ) : products?.results?.length === 0 ? (
                  <div className="col-span-full h-64 flex items-center justify-center text-slate-500 italic">
                    Aucun produit trouvé.
                  </div>
                ) : (
                  products?.results?.map((product: Product) => (
                    <div key={product.id} className="group relative bg-[#23262f]/30 rounded-4xl border border-white/5 p-6 hover:border-indigo-500/30 transition-all duration-300 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <Badge className="bg-indigo-500/10 text-indigo-400 border-none text-[9px] px-2 py-1 rounded-lg">
                          {product.category_name}
                        </Badge>
                        <span className="text-[10px] font-mono text-slate-600 font-black">#{product.sku}</span>
                      </div>

                      <h3 className="text-white font-black text-lg uppercase leading-tight mb-2 group-hover:text-indigo-400 transition-colors line-clamp-2 min-h-12">
                        {product.name}
                      </h3>

                      <div className="bg-[#111319] p-4 rounded-2xl border border-white/5 mb-6 group-hover:border-indigo-500/20 transition-all">
                        <p className="text-[10px] text-slate-500 font-black uppercase mb-1 tracking-widest">Stock Global</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-black text-white">{product.current_stock}</p>
                          <p className="text-xs font-bold text-slate-500">unités</p>
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-2">
                         <Button 
                           onClick={() => handleOpenStockBreakdown(product)}
                           className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase rounded-xl transition-all shadow-lg shadow-indigo-500/10"
                         >
                            <MapPin className="h-3.5 w-3.5 mr-2" />
                            Répartition
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon"
                           onClick={() => handleOpenDetails(product)}
                           className="h-11 w-11 bg-white/5 text-slate-400 hover:text-white rounded-xl"
                         >
                            <Eye className="h-4 w-4" />
                         </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>

        <div className="p-8 bg-[#23262f]/30 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">
            Affichage <span className="text-white">{products?.results?.length || 0}</span> sur <span className="text-white">{products?.count || 0}</span> PRODUITS
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!products?.previous || isLoading}
              className="bg-[#111319] border-none text-white font-bold h-11 px-6 rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-all"
            >
              Précédent
            </Button>
            <div className="h-11 w-11 flex items-center justify-center font-black bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
               {page}
            </div>
            <Button 
              variant="outline" 
              onClick={() => setPage(p => p + 1)}
              disabled={!products?.next || isLoading}
              className="bg-[#111319] border-none text-white font-bold h-11 px-6 rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-all"
            >
              Suivant
            </Button>
          </div>
        </div>
      </Card>

      {/* Stock Breakdown Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl bg-[#111319] border border-white/5 rounded-4xl p-0 overflow-hidden outline-none">
          <DialogHeader className="p-8 bg-linear-to-br from-[#1a1c23] to-[#23262f] text-white">
            <div className="flex items-center gap-4">
               <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Monitor className="h-6 w-6" />
               </div>
               <div>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight">{productForDetails?.name}</DialogTitle>
                  <p className="text-slate-400 font-medium text-xs uppercase tracking-wider mt-1">Répartition du stock par point de vente</p>
               </div>
            </div>
          </DialogHeader>

          <div className="p-8">
             {isLoadingBreakdown ? (
               <div className="h-64 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Chargement des données...</p>
               </div>
             ) : stockBreakdown?.results?.length === 0 ? (
               <div className="h-64 flex flex-col items-center justify-center gap-4">
                  <p className="text-slate-400 font-medium">Aucun stock répertorié pour ce produit.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stockBreakdown?.results?.map((item: { id: number; pos_name: string; quantity: number }) => (
                    <div key={item.id} className="bg-white/5 border border-white/5 p-5 rounded-3xl group hover:border-indigo-500/30 transition-all">
                       <div className="flex items-center gap-3 mb-3">
                          <MapPin className="h-4 w-4 text-indigo-400" />
                          <span className="font-black text-white uppercase text-sm">{item.pos_name}</span>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Disponible</span>
                          <Badge className="bg-white/5 text-white border-none font-black text-lg px-4 py-1.5 rounded-2xl">
                             {item.quantity}
                          </Badge>
                       </div>
                       <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full w-(--progress-width)" 
                            style={{ '--progress-width': `${Math.min((item.quantity / (productForDetails?.current_stock || 1)) * 100, 100)}%` } as React.CSSProperties}
                          />
                       </div>
                    </div>
                  ))}
               </div>
             )}
          </div>
          
          <div className="p-6 bg-white/5 flex justify-end">
             <Button 
               onClick={() => setIsDetailsOpen(false)}
               className="h-12 px-8 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase"
             >
                Fermer
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ProductForm 
        isOpen={isFormOpen} 
        onClose={() => {
          setIsFormOpen(false);
          setSelectedProduct(null);
        }} 
        product={selectedProduct || undefined}
      />

      <ProductDetailsDrawer 
        product={selectedProduct} 
        isOpen={isDrawerOpen} 
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedProduct(null);
        }}
        onStartSale={(product) => {
          navigate('/pos', { state: { selectedProduct: product } });
          setIsDrawerOpen(false);
        }}
        onEdit={(product) => {
          setIsDrawerOpen(false);
          setSelectedProduct(product);
          setIsFormOpen(true);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent className="max-w-md bg-[#1a1c23] border border-white/5 rounded-4xl p-8 overflow-hidden outline-none">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="h-20 w-20 rounded-3xl bg-rose-500/10 flex items-center justify-center">
              <Trash2 className="h-10 w-10 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Supprimer le produit ?</h3>
              <p className="text-slate-400 font-medium">
                Êtes-vous sûr de vouloir supprimer <span className="font-bold text-white uppercase">"{productToDelete?.name}"</span> ? Cette action est irréversible.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full">
              <Button 
                variant="ghost" 
                onClick={() => setIsDeleting(false)}
                className="flex-1 h-14 rounded-2xl font-bold text-slate-500 hover:text-white hover:bg-white/5 transition-all"
              >
                Annuler
              </Button>
              <Button 
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 h-14 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black shadow-lg shadow-rose-500/20 transition-all"
              >
                {deleteMutation.isPending ? "Suppression..." : "DÉTRUIRE"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
