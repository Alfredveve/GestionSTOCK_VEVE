import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Tags,
  Package,
  Layers,
} from 'lucide-react';
import inventoryService from '@/services/inventoryService';
import type { Category } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CategoryPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  // Fetch categories
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => inventoryService.getCategories(),
  });

  // Calculate Stats
  const totalCategories = categories?.results?.length || 0;
  const totalProducts = categories?.results?.reduce((acc: number, cat: Category & { product_count?: number }) => acc + (cat.product_count || 0), 0) || 0;

  // Create/Update Mutation
  const formMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => {
      if (selectedCategory) {
        return inventoryService.updateCategory(selectedCategory.id, data);
      }
      return inventoryService.createCategory(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsFormOpen(false);
      resetForm();
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
    },
  });

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setSelectedCategory(null);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormData({ name: category.name, description: category.description || '' });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    formMutation.mutate(formData);
  };

  const filteredCategories = categories?.results?.filter((cat: Category) => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="space-y-8 animate-in fade-in duration-700 p-6 max-w-[1600px] mx-auto font-sans text-slate-200">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-linear-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 shadow-2xl shadow-indigo-500/20">
              <Tags className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-400" />
            </div>
            Catégories
          </h2>
          <p className="mt-1 sm:mt-2 text-slate-400 text-sm sm:text-lg">Gérez et organisez votre inventaire avec style et efficacité.</p>
        </div>
        
        <Button 
          onClick={() => { resetForm(); setIsFormOpen(true); }} 
          className="h-12 px-8 rounded-xl shadow-lg shadow-indigo-500/30 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold transition-all duration-300 hover:scale-105 active:scale-95 text-base"
        >
          <Plus className="mr-2 h-5 w-5" />
          Nouvelle Catégorie
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none bg-[#1e1e2e]/50 backdrop-blur-xl ring-1 ring-white/5 shadow-xl hover:bg-[#1e1e2e]/70 transition-colors duration-300 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
             <Layers className="w-32 h-32 text-indigo-500 rotate-12 transform translate-x-8 -translate-y-8" />
          </div>
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Layers className="h-6 w-6" />
              </div>
              <p className="text-slate-400 font-medium uppercase tracking-wider text-sm">Total Catégories</p>
            </div>
            <div className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {totalCategories}
              <span className="text-base sm:text-lg font-medium text-slate-500 ml-2">actives</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-[#1e1e2e]/50 backdrop-blur-xl ring-1 ring-white/5 shadow-xl hover:bg-[#1e1e2e]/70 transition-colors duration-300 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
             <Package className="w-32 h-32 text-purple-500 rotate-12 transform translate-x-8 -translate-y-8" />
          </div>
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-2">
               <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                <Package className="h-6 w-6" />
              </div>
              <p className="text-slate-400 font-medium uppercase tracking-wider text-sm">Produits Associés</p>
            </div>
            <div className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {totalProducts}
              <span className="text-base sm:text-lg font-medium text-slate-500 ml-2">en stock</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tool Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#1e1e2e]/30 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-300" />
          <Input 
            placeholder="Rechercher une catégorie..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 bg-[#0b0f19]/50 border-transparent focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-slate-200 placeholder:text-slate-600 transition-all duration-300"
          />
        </div>
        <div className="text-sm text-slate-500 font-medium">
            Affichage de <span className="text-white font-bold">{filteredCategories?.length || 0}</span> résultats
        </div>
      </div>

      {/* Content Grid/List */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
           Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 w-full bg-[#1e1e2e] animate-pulse rounded-xl" />
          ))
        ) : filteredCategories?.length === 0 ? (
          <div className="text-center py-20 bg-[#1e1e2e]/30 rounded-3xl border border-dashed border-slate-700">
            <Layers className="h-16 w-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400">Aucune catégorie trouvée</h3>
            <p className="text-slate-600 mt-2">Essayez de modifier votre recherche ou créez une nouvelle catégorie.</p>
          </div>
        ) : (
          filteredCategories?.map((category: Category & { product_count?: number }) => (
            <div 
              key={category.id} 
              className="group relative flex flex-col md:flex-row md:items-center justify-between p-5 bg-[#1e1e2e]/60 hover:bg-[#1e1e2e] border border-white/5 hover:border-indigo-500/30 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
            >
              {/* Left Side: Info */}
              <div className="flex items-center gap-6 mb-4 md:mb-0">
                <div className="p-3 sm:p-4 rounded-xl bg-linear-to-br from-slate-800 to-slate-900 border border-white/10 group-hover:from-indigo-500/20 group-hover:to-purple-500/20 group-hover:border-indigo-500/30 transition-all duration-300">
                  <Tags className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 line-clamp-1 max-w-[200px] sm:max-w-md">
                    {category.description || <span className="opacity-50 italic">Aucune description</span>}
                  </p>
                </div>
              </div>

              {/* Right Side: Stats & Actions */}
              <div className="flex items-center gap-4 sm:gap-12 pl-12 sm:pl-0">
                <div className="flex flex-col items-end">
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-0.5 sm:mb-1">Produits</span>
                    <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm">
                        {category.product_count || 0}
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(category)} 
                      className="h-10 w-10 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteClick(category)} 
                      className="h-10 w-10 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                      disabled={(category?.product_count || 0) > 0}
                      title={(category?.product_count || 0) > 0 ? "Impossible de supprimer une catégorie contenant des produits" : "Supprimer"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setIsFormOpen(false); }}>
        <DialogContent className="sm:max-w-[480px] bg-[#111827] border border-[#2e2e3e] shadow-2xl p-0 overflow-hidden rounded-2xl">
          <div className="p-6 pb-0">
             <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-white">
                  <div className={`p-2 rounded-lg ${selectedCategory ? 'bg-indigo-500/10 text-indigo-400' : 'bg-green-500/10 text-green-400'}`}>
                    {selectedCategory ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  </div>
                  {selectedCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-base">
                  {selectedCategory ? 'Mettez à jour les informations essentielles de votre catégorie.' : 'Ajoutez une nouvelle catégorie pour organiser vos produits.'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-indigo-300">Nom de la catégorie</label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Électronique, Boissons..."
                    className="h-12 bg-[#1f2937] border-transparent focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-white rounded-xl placeholder:text-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-indigo-300">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Décrivez brièvement cette catégorie..."
                    className="w-full min-h-[120px] bg-[#1f2937] border-transparent focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-white rounded-xl placeholder:text-slate-600 p-3 text-sm resize-none focus:outline-none"
                  />
                </div>

                 <div className="pt-4 flex justify-end gap-3 pb-6">
                  <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="h-11 px-6 rounded-xl text-slate-400 hover:text-white hover:bg-white/5">
                    Annuler
                  </Button>
                  <Button type="submit" disabled={formMutation.isPending} className="h-11 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                    {formMutation.isPending ? 'Sauvegarde...' : 'Enregistrer'}
                  </Button>
                </div>
              </form>
          </div>
          {/* Decorative bottom bar */}
          <div className="h-2 w-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50" />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
       <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#111827] border border-red-900/30 shadow-2xl p-0 overflow-hidden rounded-2xl">
          <div className="p-8 text-center space-y-6">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-900/10">
               <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" />
              <Trash2 className="h-10 w-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold text-white">Supprimer ?</DialogTitle>
              <p className="text-slate-400 leading-relaxed">
                Êtes-vous certain de vouloir supprimer <span className="text-white font-semibold">"{selectedCategory?.name}"</span> ? <br/>Cette action est irréversible.
              </p>
            </div>
             <div className="flex justify-center gap-4 pt-4">
              <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="h-11 px-6 rounded-xl text-slate-400 hover:text-white hover:bg-white/5">
                Annuler
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => deleteMutation.mutate(selectedCategory!.id)} 
                disabled={deleteMutation.isPending} 
                className="h-11 px-6 rounded-xl bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20 text-white font-semibold transition-all active:scale-95"
              >
                {deleteMutation.isPending ? 'Suppression...' : 'Confirmer'}
              </Button>
            </div>
          </div>
           <div className="h-1.5 w-full bg-red-600/30" />
        </DialogContent>
      </Dialog>

      </div>
    </div>
  );
}
