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
  ChevronUp,
  ChevronDown,
  Loader2
} from 'lucide-react';
import inventoryService from '@/services/inventoryService';
import type { Product, Category } from '@/types';
import { cn } from '@/lib/utils';
import { ProductDetailsDrawer } from '@/components/inventory/ProductDetailsDrawer';
import { ProductForm } from '@/components/inventory/ProductForm';
import { ImportModal } from '@/components/common/ImportModal';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";


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

export function ProductList() {
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  // const fileInputRef = useRef<HTMLInputElement>(null); // No longer needed with Modal

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleOpenDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsDrawerOpen(true);
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
      // status: statusFilter || undefined, // Backend might need support for this
      page,
      page_size: 12
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('fr-GN', {
      maximumFractionDigits: 0
    }).format(typeof value === 'string' ? parseFloat(value) : value) + ' GNF';
  };

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

  // const handleImportClick = () => {
  //   fileInputRef.current?.click();
  // };

  const handleUpload = async (file: File) => {
    const result = await inventoryService.importProducts(file);
    queryClient.invalidateQueries({ queryKey: ['products'] });
    return result;
  };

  return (
    <div className="min-h-screen bg-[#111319] p-4 sm:p-8">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-500/20 shrink-0">
               <Box className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
             </div>
             <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase leading-tight">Produits</h2>
          </div>
          <p className="text-slate-400 mt-2 text-xs sm:text-sm font-medium">Gérez votre catalogue de produits</p>
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
          
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => setIsImportModalOpen(true)}
                className="flex-1 sm:flex-none bg-[#23262f] border-none text-slate-300 hover:bg-[#2d3039] hover:text-white transition-all h-11 sm:h-12 rounded-xl text-xs sm:text-sm"
              >
                <Download className="mr-2 h-4 w-4 rotate-180" />
                Importer
              </Button>
              <Button onClick={() => setIsFormOpen(true)} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 font-bold px-4 sm:px-6 h-11 sm:h-12 rounded-xl text-xs sm:text-sm">
                <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Nouveau
              </Button>
            </div>
        </div>
      </div>

      <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-4xl overflow-hidden">
        <div className="bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h2 className="text-xl sm:text-3xl font-black tracking-tight mb-2 flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm border border-white/10 shrink-0">
                   <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                </div>
                Détails des produits
              </h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <p className="text-slate-400 text-xs sm:text-sm font-medium sm:pl-14">Gérez votre catalogue, vos prix et vos stocks</p>
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest backdrop-blur-sm w-fit uppercase">
                  {products?.count || 0} PRODUITS AU TOTAL
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
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
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
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
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
                className="pl-11 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500 h-12 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/50 border-none transition-all hover:bg-slate-900/70"
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
                className="h-12 w-full sm:w-48 rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 text-sm font-bold outline-none text-slate-300 focus:ring-2 focus:ring-blue-500/50 transition-all hover:bg-slate-900/70"
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
                className="h-12 w-full sm:w-40 rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 text-sm font-bold outline-none text-slate-300 focus:ring-2 focus:ring-blue-500/50 transition-all hover:bg-slate-900/70"
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
                {/* ... existing table header ... */}
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="w-[60px] pl-4 sm:pl-8 py-5 text-[#94a3b8] font-bold text-xs uppercase tracking-wider">#</TableHead>
                    <TableHead className="min-w-[150px] sm:min-w-[250px] text-[#94a3b8] font-bold text-xs uppercase tracking-wider">
                      <div className="flex items-center gap-1 cursor-pointer">
                        PRODUIT <div className="flex flex-col -space-y-1"><ChevronUp className="h-3 w-3" /><ChevronDown className="h-3 w-3" /></div>
                      </div>
                    </TableHead>
                    <TableHead className="text-[#94a3b8] font-bold text-xs uppercase tracking-wider">STOCK</TableHead>
                    <TableHead className="hidden lg:table-cell text-[#94a3b8] font-bold text-xs uppercase tracking-wider">CATÉGORIE</TableHead>
                    <TableHead className="hidden md:table-cell text-[#94a3b8] font-bold text-xs uppercase tracking-wider">VALEUR</TableHead>
                    <TableHead className="hidden sm:table-cell text-[#94a3b8] font-bold text-xs uppercase tracking-wider text-center">STATUT</TableHead>
                    <TableHead className="text-[#94a3b8] pr-4 sm:pr-8 font-bold text-xs uppercase tracking-wider text-center">ACTES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-8 py-5"><div className="h-4 w-4 bg-slate-100 animate-pulse rounded" /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-4 py-2">
                            <div className="space-y-2">
                              <div className="h-4 w-32 bg-slate-100 animate-pulse rounded" />
                              <div className="h-3 w-16 bg-slate-50 animate-pulse rounded" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><div className="h-10 w-24 bg-slate-100 animate-pulse rounded-xl" /></TableCell>
                        <TableCell><div className="h-6 w-20 bg-slate-100 animate-pulse rounded-lg" /></TableCell>
                        <TableCell><div className="h-4 w-20 bg-slate-100 animate-pulse rounded" /></TableCell>
                        <TableCell><div className="h-4 w-16 bg-slate-100 animate-pulse rounded" /></TableCell>
                        <TableCell><div className="h-4 w-20 bg-slate-100 animate-pulse rounded" /></TableCell>
                        <TableCell><div className="h-8 w-24 bg-slate-100 animate-pulse rounded-xl" /></TableCell>
                        <TableCell className="pr-8"><div className="flex justify-center gap-2"><div className="h-10 w-10 bg-slate-100 animate-pulse rounded-xl" /><div className="h-10 w-10 bg-slate-100 animate-pulse rounded-xl" /></div></TableCell>
                      </TableRow>
                    ))
                  ) : products?.results?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Box className="h-12 w-12 text-slate-200" />
                          <span className="text-slate-400 font-medium font-italic">Aucun produit trouvé.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    products?.results?.map((product: Product, index: number) => {
                      const unitsPerBox = product.units_per_box || 1;

                      return (
                        <TableRow key={product.id} className="group hover:bg-slate-50/80 transition-all border-slate-100">
                          <TableCell className="pl-4 sm:pl-8 font-bold text-slate-500">{(page - 1) * 12 + index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-4 py-2">
                              <div>
                                <div className="font-bold text-[#1a1c23] text-sm sm:text-base group-hover:text-blue-600 transition-colors uppercase">{product.name}</div>
                                {product.sku && <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 tracking-wider mt-0.5">#{product.sku}</div>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="w-fit bg-blue-50 text-blue-500 border-none font-bold text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-lg">
                                {product.current_stock} Total
                              </Badge>
                              {unitsPerBox > 1 && (
                                <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                                {product.stock_analysis.analysis}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold uppercase text-[10px] px-2.5 py-1">
                              {product.category_name}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-bold text-slate-600">
                             {formatCurrency(product.current_stock * parseFloat(product.purchase_price))}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-center">
                            {product.current_stock > product.reorder_level ? (
                              <Badge className="bg-cyan-50 text-cyan-500 hover:bg-cyan-100 border-none font-bold px-3 py-1.5 rounded-xl transition-all">
                                En Stock
                              </Badge>
                            ) : product.current_stock > 0 ? (
                              <Badge className="bg-amber-50 text-amber-500 hover:bg-amber-100 border-none font-bold px-3 py-1.5 rounded-xl transition-all">
                                Stock Faible
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-50 text-rose-500 hover:bg-rose-100 border-none font-bold px-3 py-1.5 rounded-xl transition-all">
                                Rupture
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="pr-4 sm:pr-8">
                            <div className="flex items-center justify-center gap-1 sm:gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Détails" 
                                onClick={() => handleOpenDetails(product)}
                                className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg sm:rounded-xl"
                              >
                                <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Modifier" 
                                onClick={() => handleEdit(product)}
                                className="h-8 w-8 sm:h-10 sm:w-10 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg sm:rounded-xl"
                              >
                                <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Supprimer" 
                                onClick={() => handleDelete(product)}
                                className="h-8 w-8 sm:h-10 sm:w-10 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg sm:rounded-xl"
                              >
                                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-[200px] rounded-3xl bg-slate-50 animate-pulse" />
                  ))
                ) : products?.results?.length === 0 ? (
                  <div className="col-span-full h-64 flex items-center justify-center text-slate-400 italic">
                    Aucun produit trouvé.
                  </div>
                ) : (
                  products?.results?.map((product: Product) => {
                    const unitsPerBox = product.units_per_box || 1;
                    return (
                      <div key={product.id} className="group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden">
                        {/* Decorative gradient header */}
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-linear-to-r from-blue-500 via-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="p-4 flex-1 flex flex-col">
                          {/* Header: Category and SKU */}
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <Badge variant="secondary" className="bg-slate-100 text-[#1a1c23] group-hover:bg-blue-50 group-hover:text-blue-600 border-none font-bold px-2 py-1 text-[10px] rounded-lg transition-colors">
                              {product.category_name}
                            </Badge>
                            <span className="text-[9px] font-mono text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded-lg">#{product.sku}</span>
                          </div>

                          {/* Title */}
                          <h4 className="text-base font-black text-[#1a1c23] uppercase leading-tight mb-3 transition-colors line-clamp-2" title={product.name}>
                            {product.name}
                          </h4>
                          
                          {/* Pricing Grid */}
                          <div className="bg-slate-50/50 p-2 rounded-xl mb-3 border border-slate-100 group-hover:border-blue-100 group-hover:bg-blue-50/10 transition-colors">
                            <div className="flex items-center justify-between gap-1">
                              <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Détail</p>
                                <p className="text-[10px] font-black text-[#1a1c23] tracking-tight">{formatCurrency(product.selling_price)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Gros</p>
                                <p className="text-[10px] font-black text-[#1a1c23] tracking-tight">{formatCurrency(product.wholesale_selling_price)}</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Footer: Stock & Actions */}
                          <div className="mt-auto flex items-center justify-between gap-3 pt-2 border-t border-slate-50">
                            <div className="flex flex-col gap-1.5">
                              <Badge className={cn(
                                "px-2 py-1.5 rounded-lg font-bold text-[9px] uppercase shadow-sm border-none w-fit",
                                product.current_stock > product.reorder_level 
                                  ? "bg-cyan-50 text-cyan-600" 
                                  : product.current_stock > 0 
                                    ? "bg-amber-50 text-amber-600" 
                                    : "bg-rose-50 text-rose-600"
                              )}>
                                {product.current_stock} EN STOCK
                              </Badge>
                              {unitsPerBox > 1 && product.stock_analysis && (
                                <span className="text-[10px] font-bold text-slate-500 pl-0.5">
                                  {product.stock_analysis.analysis}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleOpenDetails(product)} 
                                className="h-9 w-9 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEdit(product)} 
                                className="h-9 w-9 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </CardContent>

        <div className="p-8 bg-slate-50/30 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">
            Affichage <span className="text-[#1a1c23]">{products?.results?.length || 0}</span> sur <span className="text-[#1a1c23]">{products?.count || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!products?.previous || isLoading}
              className="px-6 h-11 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-white transition-all shadow-sm"
            >
              Précédent
            </Button>
            <div className="h-11 w-11 flex items-center justify-center font-black bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30">
               {page}
            </div>
            <Button 
              variant="outline" 
              onClick={() => setPage(p => p + 1)}
              disabled={!products?.next || isLoading}
              className="px-6 h-11 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-white transition-all shadow-sm"
            >
              Suivant
            </Button>
          </div>
        </div>
      </Card>

      <ProductForm 
        isOpen={isFormOpen} 
        onClose={() => {
          setIsFormOpen(false);
          setSelectedProduct(null);
        }} 
        product={selectedProduct || undefined}
      />

      <ImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onUpload={handleUpload}
      />

      <ProductDetailsDrawer 
        product={selectedProduct} 
        isOpen={isDrawerOpen} 
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedProduct(null);
        }}
        onStartSale={(product) => {
          // Navigate to POS page with the product pre-selected
          navigate('/sales', { state: { selectedProduct: product } });
          setIsDrawerOpen(false);
        }}
        onEdit={(product) => {
          // Close drawer and open edit form
          setIsDrawerOpen(false);
          setSelectedProduct(product);
          setIsFormOpen(true);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent className="max-w-md rounded-3xl p-8 border-none bg-white">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="h-20 w-20 rounded-3xl bg-rose-50 flex items-center justify-center">
              <Trash2 className="h-10 w-10 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[#1a1c23]">Supprimer le produit ?</h3>
              <p className="text-slate-500 font-medium">
                Êtes-vous sûr de vouloir supprimer <span className="font-bold text-[#1a1c23]">"{productToDelete?.name}"</span> ? Cette action est irréversible.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full">
              <Button 
                variant="ghost" 
                onClick={() => setIsDeleting(false)}
                className="flex-1 h-14 rounded-2xl font-bold text-slate-500 hover:bg-slate-50"
              >
                Annuler
              </Button>
              <Button 
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 h-14 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black shadow-lg shadow-rose-500/20"
              >
                {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
