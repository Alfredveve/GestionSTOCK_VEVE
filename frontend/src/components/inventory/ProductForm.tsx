import {useState, useEffect} from 'react';
import {useQueryClient, useMutation, useQuery} from '@tanstack/react-query';
import {toast} from 'sonner';
import {
    Package,
    Layers,
    TrendingUp,
    DollarSign,
    Info,
    Box
} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import {Separator} from "@/components/ui/separator";
import inventoryService from '@/services/inventoryService';
import type {Product, Category, Supplier}
from '@/types';

interface ProductFormProps {
    isOpen: boolean;
    onClose: () => void;
    product?: Product; // For editing existing products
}

export function ProductForm({isOpen, onClose, product} : ProductFormProps) {
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
        reorder_level: '5'
    });

    // Load product data when editing
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                sku: product.sku || '',
                category: product.category ?. toString() || '',
                supplier: product.supplier ?. toString() || '',
                description: product.description || '',
                purchase_price: product.purchase_price ?. toString() || '',
                selling_price: product.selling_price ?. toString() || '',
                units_per_box: product.units_per_box ?. toString() || '1',
                wholesale_purchase_price: product.wholesale_purchase_price ?. toString() || '',
                wholesale_selling_price: product.wholesale_selling_price ?. toString() || '',
                reorder_level: product.reorder_level ?. toString() || '5'
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
                reorder_level: '5'
            });
        }
    }, [product, isOpen]);

    const {data: categories} = useQuery({
        queryKey: ['categories'],
        queryFn: () => inventoryService.getCategories()
    });

    const {data: suppliers} = useQuery({
        queryKey: ['suppliers'],
        queryFn: () => inventoryService.getSuppliers()
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
        mutationFn: (productData : Partial<Product> | any) => {
            if (isEditing && product) {
                return inventoryService.updateProduct(product.id, productData);
            }
            return inventoryService.createProduct(productData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['products']});
            toast.success(isEditing ? "Produit mis à jour avec succès" : "Produit créé avec succès");
            onClose();
        },
        onError: (error : any) => {
            console.error('Mutation error:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.detail || "Une erreur est survenue lors de l'enregistrement";
            toast.error(errorMessage);
        }
    });

    const handleSubmit = (e : React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!formData.name.trim()) {
            toast.error("Le nom du produit est obligatoire");
            return;
        }

        if (!formData.category) {
            toast.error("Veuillez sélectionner une catégorie");
            return;
        }

        // Prepare data for API
        const apiData = {
            name: formData.name.trim(),
            sku: formData.sku.trim(),
            category: parseInt(formData.category),
            supplier: formData.supplier ? parseInt(formData.supplier) : null,
            description: formData.description,
            purchase_price: parseFloat(formData.purchase_price) || 0,
            selling_price: parseFloat(formData.selling_price) || 0,
            units_per_box: parseInt(formData.units_per_box) || 1,
            wholesale_purchase_price: parseFloat(formData.wholesale_purchase_price) || 0,
            wholesale_selling_price: parseFloat(formData.wholesale_selling_price) || 0,
            reorder_level: parseInt(formData.reorder_level) || 5
        };

        // Final check for NaN values in numeric fields
        const numericFields : (keyof typeof apiData)[] = [
            'category',
            'purchase_price',
            'selling_price',
            'units_per_box',
            'wholesale_purchase_price',
            'wholesale_selling_price',
            'reorder_level'
        ];

        for (const field of numericFields) {
            if (apiData[field] !== null && isNaN(apiData[field] as number)) {
                toast.error(`Valeur invalide pour le champ: ${field}`);
                return;
            }
        }

        mutation.mutate(apiData);
    };

    const handleChange = (e : React.ChangeEvent < HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement >) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const formatCurrency = (value : string | number) => {
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
        <Dialog open={isOpen}
            onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-slate-50 border-none p-0 overflow-hidden rounded-3xl">
                <div className="bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white relative shrink-0 overflow-hidden">
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"/>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"/>

                    <div className="relative z-10 flex items-center gap-4 mb-2">
                        <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm border border-white/10">
                            <Box className="h-6 w-6 text-blue-400"/>
                        </div>
                        <DialogHeader className="p-0">
                            <DialogTitle className="text-3xl font-black tracking-tight">
                                {
                                isEditing ? 'Modifier le Produit' : 'Nouveau Produit'
                            } </DialogTitle>
                            <DialogDescription className="text-slate-400 font-medium sticky top-0">
                                Configurez les détails et les prix de votre produit
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                </div>

                <form onSubmit={handleSubmit}
                    className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {/* Basic Information */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Info className="h-5 w-5 text-blue-600"/>
                            <h3 className="text-lg font-bold text-[#1a1c23]">Informations Générales</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-slate-500">Nom du produit *</Label>
                                <Input id="name" name="name"
                                    value={
                                        formData.name
                                    }
                                    onChange={handleChange}
                                    required
                                    placeholder="ex: Laptop HP ProBook 450"
                                    className="h-12 rounded-xl border-slate-200 focus:ring-blue-500/20"/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sku" className="text-xs font-black uppercase tracking-widest text-slate-500">Code SKU *</Label>
                                <Input id="sku" name="sku"
                                    value={
                                        formData.sku
                                    }
                                    onChange={handleChange}
                                    required
                                    placeholder="ex: LHP-001"
                                    className="h-12 rounded-xl border-slate-200 font-mono focus:ring-blue-500/20"/>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="category" className="text-xs font-black uppercase tracking-widest text-slate-500">Catégorie *</Label>
                                <select id="category" name="category" title="Sélectionner une catégorie"
                                    value={
                                        formData.category
                                    }
                                    onChange={handleChange}
                                    required
                                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-1 text-sm shadow-sm transition-colors outline-none focus:ring-2 focus:ring-blue-500/20">
                                    <option value="">Sélectionner une catégorie</option>
                                    {
                                    categories ?. results ?. map((cat : Category) => (
                                        <option key={
                                                cat.id
                                            }
                                            value={
                                                cat.id
                                        }>
                                            {
                                            cat.name
                                        }</option>
                                    ))
                                } </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="supplier" className="text-xs font-black uppercase tracking-widest text-slate-500">Fournisseur</Label>
                                <select id="supplier" name="supplier" title="Sélectionner un fournisseur"
                                    value={
                                        formData.supplier
                                    }
                                    onChange={handleChange}
                                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-1 text-sm shadow-sm transition-colors outline-none focus:ring-2 focus:ring-blue-500/20">
                                    <option value="">Sélectionner un fournisseur</option>
                                    {
                                    suppliers ?. results ?. map((sup : Supplier) => (
                                        <option key={
                                                sup.id
                                            }
                                            value={
                                                sup.id
                                        }>
                                            {
                                            sup.name
                                        }</option>
                                    ))
                                } </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-slate-500">Description</Label>
                            <textarea id="description" name="description"
                                value={
                                    formData.description
                                }
                                onChange={handleChange}
                                rows={3}
                                placeholder="Description détaillée du produit..."
                                className="flex w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition-colors outline-none resize-none focus:ring-2 focus:ring-blue-500/20"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reorder_level" className="text-xs font-black uppercase tracking-widest text-slate-500">Seuil de Réapprovisionnement (Alerte Stock)</Label>
                            <div className="relative group max-w-xs">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold group-focus-within:bg-rose-100 group-focus-within:text-rose-600 transition-colors">
                                    <TrendingUp className="h-4 w-4"/>
                                </div>
                                <Input id="reorder_level" name="reorder_level" type="number" min="0"
                                    value={
                                        formData.reorder_level
                                    }
                                    onChange={handleChange}
                                    required
                                    placeholder="5"
                                    className="pl-14 h-12 font-bold rounded-xl border-slate-200 focus:ring-4 focus:ring-rose-500/10 transition-all"/>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">Le produit passera en statut "Faible" quand le stock atteindra ce nombre.</p>
                        </div>
                    </section>

                    <Separator className="bg-slate-200"/> {/* Pricing Grid */}
                    {/* Pricing Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Retail Pricing */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                    <Package className="h-5 w-5 text-blue-600"/>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[#1a1c23] leading-none">Vente au Détail</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Configuration prix unitaire</p>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 hover:shadow-md transition-shadow">
                                <div className="space-y-2">
                                    <Label htmlFor="purchase_price" className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        Prix d'achat unitaire
                                        <span className="text-rose-500">*</span>
                                    </Label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold group-focus-within:bg-blue-100 group-focus-within:text-blue-600 transition-colors">
                                            <DollarSign className="h-4 w-4"/>
                                        </div>
                                        <Input id="purchase_price" name="purchase_price" type="number" step="0.01"
                                            value={
                                                formData.purchase_price
                                            }
                                            onChange={handleChange}
                                            required
                                            placeholder="0.00"
                                            className="pl-14 h-14 text-lg font-bold rounded-2xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50/50"/>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="selling_price" className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        Prix de vente unitaire
                                        <span className="text-rose-500">*</span>
                                    </Label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold group-focus-within:bg-blue-100 group-focus-within:text-blue-600 transition-colors">
                                            <TrendingUp className="h-4 w-4"/>
                                        </div>
                                        <Input id="selling_price" name="selling_price" type="number" step="0.01"
                                            value={
                                                formData.selling_price
                                            }
                                            onChange={handleChange}
                                            required
                                            placeholder="0.00"
                                            className="pl-14 h-14 text-lg font-bold rounded-2xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50/50"/>
                                    </div>
                                </div>
                                <div className="bg-emerald-50 p-5 rounded-2xl flex justify-between items-center group border border-emerald-100">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70">Marge calculée</span>
                                        <span className="text-xs font-medium text-emerald-600 mt-0.5">Bénéfice par unité</span>
                                    </div>
                                    <span className="text-2xl font-black text-emerald-600 tracking-tight">
                                        {
                                        formatCurrency(margin)
                                    }</span>
                                </div>
                            </div>
                        </div>

                        {/* Wholesale Pricing */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="bg-violet-100 p-2 rounded-lg">
                                    <Layers className="h-5 w-5 text-violet-600"/>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[#1a1c23] leading-none">Vente en Gros</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Configuration par colis</p>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 hover:shadow-md transition-shadow relative overflow-hidden">
                                {/* Decorative background element */}
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-violet-50 rounded-full blur-3xl opacity-50 pointer-events-none"/>

                                <div className="space-y-2 relative">
                                    <Label htmlFor="units_per_box" className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        Unités par colis
                                        <span className="text-violet-500">(Composition)</span>
                                    </Label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold group-focus-within:bg-violet-100 group-focus-within:text-violet-600 transition-colors">
                                            <Box className="h-4 w-4"/>
                                        </div>
                                        <Input id="units_per_box" name="units_per_box" type="number" min="1"
                                            value={
                                                formData.units_per_box
                                            }
                                            onChange={handleChange}
                                            placeholder="1"
                                            className="pl-14 h-14 text-lg font-bold rounded-2xl border-slate-200 focus:ring-4 focus:ring-violet-500/10 transition-all bg-slate-50/50"/>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
                                    <div className="space-y-2">
                                        <Label htmlFor="wholesale_purchase_price" className="text-xs font-black uppercase tracking-widest text-slate-500">Achat (Gros)</Label>
                                        <Input id="wholesale_purchase_price" name="wholesale_purchase_price" type="number" step="0.01"
                                            value={
                                                formData.wholesale_purchase_price
                                            }
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            className="h-12 font-bold rounded-xl border-slate-200 focus:ring-2 focus:ring-violet-500/20 bg-slate-50/50"/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="wholesale_selling_price" className="text-xs font-black uppercase tracking-widest text-slate-500">Vente (Gros)</Label>
                                        <Input id="wholesale_selling_price" name="wholesale_selling_price" type="number" step="0.01"
                                            value={
                                                formData.wholesale_selling_price
                                            }
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            className="h-12 font-bold rounded-xl border-slate-200 focus:ring-2 focus:ring-violet-500/20 bg-slate-50/50"/>
                                    </div>
                                </div>
                                <div className="bg-violet-50 p-5 rounded-2xl flex justify-between items-center border border-violet-100 relative">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-violet-600/70">Marge Gros</span>
                                        <span className="text-xs font-medium text-violet-600 mt-0.5">Bénéfice par colis</span>
                                    </div>
                                    <span className="text-2xl font-black text-violet-600 tracking-tight">
                                        {
                                        formatCurrency(wholesaleMargin)
                                    }</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="bg-white -m-8 mt-8 p-8 border-t border-slate-100 flex items-center justify-end gap-3">
                        <Button type="button" variant="ghost"
                            onClick={onClose}
                            className="h-12 px-8 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">
                            Annuler
                        </Button>
                        <Button type="submit"
                            disabled={
                                mutation.isPending
                            }
                            className="h-12 px-10 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-xl shadow-blue-500/20">
                            {
                            mutation.isPending ? "Enregistrement..." : (isEditing ? "Mettre à jour le produit" : "Créer le produit")
                        } </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
