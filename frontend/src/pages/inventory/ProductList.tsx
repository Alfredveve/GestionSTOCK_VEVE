import { useState } from 'react';
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
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import inventoryService from '@/services/inventoryService';
import type { Product, Category } from '@/services/inventoryService';
import { cn } from '@/lib/utils';
import { ProductDetailsDrawer } from '@/components/inventory/ProductDetailsDrawer';
import { ProductForm } from '@/components/inventory/ProductForm';
import { Dialog, DialogContent } from "@/components/ui/dialog";

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

  const queryClient = useQueryClient();

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
      page
    }),
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

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'GNF', 
      maximumFractionDigits: 0 
    }).format(typeof value === 'string' ? parseFloat(value) : value);
  };

  return (
    <div className="min-h-screen bg-[#111319] p-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-500/20">
               <Box className="h-6 w-6 text-white" />
             </div>
             <h2 className="text-4xl font-black tracking-tight text-white">Produits</h2>
          </div>
          <p className="text-slate-400 mt-2 font-medium">Gérez votre catalogue de produits</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="bg-[#23262f] border-none text-slate-300 hover:bg-[#2d3039] hover:text-white transition-all">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" className="bg-[#23262f] border-none text-slate-300 hover:bg-[#2d3039] hover:text-white transition-all">
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" className="bg-[#23262f] border-none text-slate-300 hover:bg-[#2d3039] hover:text-white transition-all">
            <Download className="mr-2 h-4 w-4 rotate-180" />
            Importer
          </Button>
          <Button onClick={() => setIsFormOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 font-bold px-6">
            <Plus className="mr-2 h-5 w-5" />
            Nouveau Produit
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
        <div className="p-8 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <h3 className="text-2xl font-black text-[#1a1c23]">Détails des produits</h3>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl ml-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setViewMode('list')}
                  className={cn("h-8 w-8 rounded-lg", viewMode === 'list' ? "bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:text-white" : "text-slate-400")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setViewMode('grid')}
                  className={cn("h-8 w-8 rounded-lg", viewMode === 'grid' ? "bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:text-white" : "text-slate-400")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Rechercher..." 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-11 bg-slate-50 border-slate-200 h-12 rounded-xl focus-visible:ring-blue-500/50"
                />
              </div>

              <select 
                title="Catégorie"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="h-12 w-full sm:w-48 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none text-slate-600"
              >
                <option value="">Toutes les catégories</option>
                {categories?.results?.map((category: Category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>

              <select 
                title="Statut"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-12 w-full sm:w-48 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none text-slate-600"
              >
                <option value="">Tous les statuts</option>
                <option value="in_stock">En Stock</option>
                <option value="low_stock">Stock Faible</option>
                <option value="out_of_stock">Rupture</option>
              </select>

              <Button 
                onClick={() => setPage(1)}
                className="h-12 px-8 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20"
              >
                Filtrer
              </Button>
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
                    <TableHead className="w-[60px] pl-8 py-5 text-[#94a3b8] font-bold text-xs uppercase tracking-wider">#</TableHead>
                    <TableHead className="min-w-[200px] text-[#94a3b8] font-bold text-xs uppercase tracking-wider">
                      <div className="flex items-center gap-1 cursor-pointer">
                        PRODUIT <div className="flex flex-col -space-y-1"><ChevronUp className="h-3 w-3" /><ChevronDown className="h-3 w-3" /></div>
                      </div>
                    </TableHead>
                    <TableHead className="text-[#94a3b8] font-bold text-xs uppercase tracking-wider">CATÉGORIE</TableHead>
                    <TableHead className="text-[#94a3b8] font-bold text-xs uppercase tracking-wider">STOCK</TableHead>
                    <TableHead className="text-[#94a3b8] font-bold text-xs uppercase tracking-wider">PRIX ACHAT</TableHead>
                    <TableHead className="text-[#94a3b8] font-bold text-xs uppercase tracking-wider">MARGE</TableHead>
                    <TableHead className="text-[#94a3b8] font-bold text-xs uppercase tracking-wider">PRIX VENTE</TableHead>
                    <TableHead className="text-[#94a3b8] font-bold text-xs uppercase tracking-wider font-center">STATUT</TableHead>
                    <TableHead className="text-[#94a3b8] pr-8 font-bold text-xs uppercase tracking-wider text-center">ACTES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-64 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                          <span className="text-slate-400 font-medium italic">Chargement des produits...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : products?.results?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-64 text-center text-slate-400 font-medium italic">
                        Aucun produit trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    products?.results?.map((product: Product, index: number) => {
                      const unitsPerBox = product.units_per_box || 1;
                      const colis = unitsPerBox > 1 ? Math.floor(product.current_stock / unitsPerBox) : 0;
                      const unites = unitsPerBox > 1 ? product.current_stock % unitsPerBox : product.current_stock;
                      
                      const buyingPrice = parseFloat(product.buying_price);
                      const sellingPrice = parseFloat(product.selling_price);
                      const margin = sellingPrice - buyingPrice;

                      return (
                        <TableRow key={product.id} className="group hover:bg-slate-50/80 transition-all border-slate-100">
                          <TableCell className="pl-8 font-bold text-slate-500">{(page - 1) * 10 + index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-4 py-2">
                              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm overflow-hidden shrink-0">
                                {product.image ? (
                                  <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                                ) : (
                                  <Box className="h-7 w-7 opacity-30" />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-[#1a1c23] text-base group-hover:text-blue-600 transition-colors uppercase">{product.name}</div>
                                {product.sku && <div className="text-[11px] font-mono text-slate-400 tracking-wider mt-0.5">#{product.sku}</div>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold uppercase text-[10px] px-2.5 py-1">
                              {product.category_name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="w-fit bg-blue-50 text-blue-500 border-none font-bold text-[11px] px-2.5 py-0.5 rounded-lg">
                                {product.current_stock} Total
                              </Badge>
                              {unitsPerBox > 1 && (
                                <div className="text-[11px] text-slate-400 font-medium">
                                  {colis} Colis, {unites} Unité(s)
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-slate-500">
                            {formatCurrency(product.buying_price)}
                          </TableCell>
                          <TableCell className="font-bold text-emerald-500">
                            {formatCurrency(margin)}
                          </TableCell>
                          <TableCell className="font-black text-[#1a1c23]">
                            {formatCurrency(product.selling_price)}
                          </TableCell>
                          <TableCell>
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
                          <TableCell className="pr-8">
                            <div className="flex items-center justify-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Détails" 
                                onClick={() => handleOpenDetails(product)}
                                className="h-10 w-10 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                              >
                                <Eye className="h-5 w-5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Modifier" 
                                onClick={() => handleEdit(product)}
                                className="h-10 w-10 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Supprimer" 
                                onClick={() => handleDelete(product)}
                                className="h-10 w-10 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                              >
                                <Trash2 className="h-5 w-5" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-[400px] rounded-3xl bg-slate-50 animate-pulse" />
                  ))
                ) : products?.results?.length === 0 ? (
                  <div className="col-span-full h-64 flex items-center justify-center text-slate-400 italic">
                    Aucun produit trouvé.
                  </div>
                ) : (
                  products?.results?.map((product: Product) => {
                    const buyingPrice = parseFloat(product.buying_price);
                    const sellingPrice = parseFloat(product.selling_price);
                    const margin = sellingPrice - buyingPrice;
                    
                    return (
                      <div key={product.id} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
                        <div className="aspect-square bg-slate-50 relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Box className="h-16 w-16 text-slate-200" />
                            </div>
                          )}
                          <div className="absolute top-4 right-4 group-hover:opacity-100 opacity-0 transition-opacity">
                            <Badge className="bg-white/90 backdrop-blur-md text-[#1a1c23] border-none font-bold">
                              {product.category_name}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                          <h4 className="text-lg font-black text-[#1a1c23] uppercase truncate">{product.name}</h4>
                          <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-widest">#{product.sku}</p>
                          
                          <div className="mt-6 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix de vente</p>
                              <p className="text-xl font-black text-blue-600 mt-1">{formatCurrency(product.selling_price)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marge</p>
                              <p className="text-base font-bold text-emerald-500 mt-1">+{formatCurrency(margin)}</p>
                            </div>
                          </div>
                          
                          <div className="mt-auto pt-6 flex items-center justify-between gap-2 border-t border-slate-50">
                            <div className="flex items-center gap-1.5">
                              <Badge className={cn(
                                "px-2 py-0.5 rounded-lg font-black text-[9px] uppercase",
                                product.current_stock > product.reorder_level ? "bg-cyan-50 text-cyan-500" : "bg-rose-50 text-rose-500"
                              )}>
                                {product.current_stock} EN STOCK
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDetails(product)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50">
                                <Edit className="h-3.5 w-3.5" />
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
        product={selectedProduct}
      />

      <ProductDetailsDrawer 
        product={selectedProduct} 
        isOpen={isDrawerOpen} 
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedProduct(null);
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
