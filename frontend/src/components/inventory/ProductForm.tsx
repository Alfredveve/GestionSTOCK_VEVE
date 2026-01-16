import { useState, useEffect } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { Package, Layers, TrendingUp, DollarSign, Info, Box } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import inventoryService, { type Product, type Category, type Supplier } from '@/services/inventoryService';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product; // For editing existing products
}

export function ProductForm({ isOpen, onClose, product }: ProductFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!product;

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    supplier: '',
    description: '',
    // Retail pricing
    purchase_price: '',
    selling_price: '',
    // Wholesale pricing
    units_per_box: '1',
    wholesale_purchase_price: '',
    wholesale_selling_price: '',
  });

  // Load product data when editing
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        category: product.category?.toString() || '',
        supplier: product.supplier?.toString() || '',
        description: product.description || '',
        purchase_price: product.buying_price?.toString() || '',
        selling_price: product.selling_price?.toString() || '',
        units_per_box: product.units_per_box?.toString() || '1',
        wholesale_purchase_price: product.wholesale_purchase_price?.toString() || '',
        wholesale_selling_price: product.wholesale_selling_price?.toString() || '',
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        category: '',
        supplier: '',
        description: '',
        purchase_price: '',
        selling_price: '',
        units_per_box: '1',
        wholesale_purchase_price: '',
        wholesale_selling_price: '',
      });
    }
  }, [product, isOpen]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => inventoryService.getCategories(),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => inventoryService.getSuppliers(),
  });

  // Auto-calculate wholesale purchase price based on units_per_box
  // We use a restricted check to avoid cascading renders
  useEffect(() => {
    const purchasePrice = parseFloat(formData.purchase_price) || 0;
    const unitsPerBox = parseInt(formData.units_per_box) || 1;
    const currentWholesalePrice = parseFloat(formData.wholesale_purchase_price) || 0;
    
    if (purchasePrice > 0 && unitsPerBox > 1 && currentWholesalePrice === 0) {
      const calculatedWholesalePrice = purchasePrice * unitsPerBox;
      setFormData(prev => ({
        ...prev,
        wholesale_purchase_price: calculatedWholesalePrice.toFixed(2)
      }));
    }
  }, [formData.purchase_price, formData.units_per_box, formData.wholesale_purchase_price]);

  const mutation = useMutation({
    mutationFn: (productData: any) => {
      if (isEditing && product) {
        return inventoryService.updateProduct(product.id, productData);
      }
      return inventoryService.createProduct(productData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare data for API
    const apiData = {
      name: formData.name,
      sku: formData.sku,
      category: parseInt(formData.category),
      supplier: formData.supplier ? parseInt(formData.supplier) : null,
      description: formData.description,
      buying_price: parseFloat(formData.purchase_price) || 0,
      selling_price: parseFloat(formData.selling_price) || 0,
      units_per_box: parseInt(formData.units_per_box) || 1,
      wholesale_purchase_price: parseFloat(formData.wholesale_purchase_price) || 0,
      wholesale_selling_price: parseFloat(formData.wholesale_selling_price) || 0,
    };
    
    mutation.mutate(apiData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'GNF',
      maximumFractionDigits: 0
    }).format(num || 0);
  };

  // Derivative values
  const purchasePrice = parseFloat(formData.purchase_price) || 0;
  const sellingPrice = parseFloat(formData.selling_price) || 0;
  const margin = sellingPrice - purchasePrice;

  const wholesalePurchasePrice = parseFloat(formData.wholesale_purchase_price) || 0;
  const wholesaleSellingPrice = parseFloat(formData.wholesale_selling_price) || 0;
  const wholesaleMargin = wholesaleSellingPrice - wholesalePurchasePrice;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50 border-none p-0 overflow-hidden rounded-3xl">
        <div className="bg-[#1a1c23] p-8 text-white relative">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Box className="h-6 w-6" />
            </div>
            <DialogHeader className="p-0">
              <DialogTitle className="text-3xl font-black tracking-tight">
                {isEditing ? 'Modifier le Produit' : 'Nouveau Produit'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-medium">
                Configurez les détails et les prix de votre produit
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Basic Information */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-[#1a1c23]">Informations Générales</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-slate-500">Nom du produit *</Label>
                <Input 
                  id="name"
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                  placeholder="ex: Laptop HP ProBook 450"
                  className="h-12 rounded-xl border-slate-200 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku" className="text-xs font-black uppercase tracking-widest text-slate-500">Code SKU *</Label>
                <Input 
                  id="sku"
                  name="sku" 
                  value={formData.sku} 
                  onChange={handleChange} 
                  required 
                  placeholder="ex: LHP-001"
                  className="h-12 rounded-xl border-slate-200 font-mono focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs font-black uppercase tracking-widest text-slate-500">Catégorie *</Label>
                <select 
                  id="category"
                  name="category" 
                  title="Sélectionner une catégorie"
                  value={formData.category} 
                  onChange={handleChange}
                  required
                  className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-1 text-sm shadow-sm transition-colors outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories?.results?.map((cat: Category) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier" className="text-xs font-black uppercase tracking-widest text-slate-500">Fournisseur</Label>
                <select 
                  id="supplier"
                  name="supplier" 
                  title="Sélectionner un fournisseur"
                  value={formData.supplier} 
                  onChange={handleChange}
                  className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-1 text-sm shadow-sm transition-colors outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Sélectionner un fournisseur</option>
                  {suppliers?.results?.map((sup: Supplier) => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-slate-500">Description</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Description détaillée du produit..."
                className="flex w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition-colors outline-none resize-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </section>

          <Separator className="bg-slate-200" />

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Retail Pricing */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-[#1a1c23]">Vente au Détail</h3>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="purchase_price" className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center">
                    Prix d'achat unitaire *
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      id="purchase_price"
                      name="purchase_price" 
                      type="number" 
                      step="0.01"
                      value={formData.purchase_price} 
                      onChange={handleChange} 
                      required 
                      placeholder="0.00"
                      className="pl-10 h-12 rounded-xl border-slate-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price" className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center">
                    Prix de vente unitaire *
                  </Label>
                  <div className="relative">
                    <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      id="selling_price"
                      name="selling_price" 
                      type="number" 
                      step="0.01"
                      value={formData.selling_price} 
                      onChange={handleChange} 
                      required 
                      placeholder="0.00"
                      className="pl-10 h-12 rounded-xl border-slate-200"
                    />
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl flex justify-between items-center group">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-600">Marge calculée</span>
                  <span className="text-xl font-black text-emerald-700">{formatCurrency(margin)}</span>
                </div>
              </div>
            </div>

            {/* Wholesale Pricing */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-[#1a1c23]">Vente en Gros</h3>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="units_per_box" className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center">
                    Unités par colis
                  </Label>
                  <Input 
                    id="units_per_box"
                    name="units_per_box" 
                    type="number" 
                    min="1"
                    value={formData.units_per_box} 
                    onChange={handleChange}
                    placeholder="1"
                    className="h-12 rounded-xl border-slate-200"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wholesale_purchase_price" className="text-xs font-black uppercase tracking-widest text-slate-500">Achat (Gros)</Label>
                    <Input 
                      id="wholesale_purchase_price"
                      name="wholesale_purchase_price" 
                      type="number" 
                      step="0.01"
                      value={formData.wholesale_purchase_price} 
                      onChange={handleChange}
                      placeholder="0.00"
                      className="h-12 rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wholesale_selling_price" className="text-xs font-black uppercase tracking-widest text-slate-500">Vente (Gros)</Label>
                    <Input 
                      id="wholesale_selling_price"
                      name="wholesale_selling_price" 
                      type="number" 
                      step="0.01"
                      value={formData.wholesale_selling_price} 
                      onChange={handleChange}
                      placeholder="0.00"
                      className="h-12 rounded-xl border-slate-200"
                    />
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-widest text-blue-600">Marge Gros</span>
                  <span className="text-xl font-black text-blue-700">{formatCurrency(wholesaleMargin)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-white -m-8 mt-8 p-8 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="h-12 px-8 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="h-12 px-10 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-xl shadow-blue-500/20">
              {mutation.isPending ? "Enregistrement..." : (isEditing ? "Mettre à jour le produit" : "Créer le produit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
