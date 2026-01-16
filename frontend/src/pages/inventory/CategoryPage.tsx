import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Tags,
  AlertCircle,
} from 'lucide-react';
import inventoryService from '@/services/inventoryService';
import type { Category } from '@/services/inventoryService';

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

  const filteredCategories = categories?.results?.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Tags className="h-8 w-8 text-primary" />
            Catégories
          </h2>
          <p className="text-muted-foreground italic">Organisez vos produits par catégories pour une meilleure gestion.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsFormOpen(true); }} className="shadow-lg shadow-primary/20 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle Catégorie
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center">
            <Search className="mr-2 h-3 w-3" />
            Rechercher une catégorie
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom ou description..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card/50 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
            />
          </div>
        </div>
      </div>

      <Card className="border-none shadow-2xl bg-card/30 backdrop-blur-md overflow-hidden ring-1 ring-white/10">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-muted/20">
                <TableHead className="w-[200px] py-4 pl-6 font-bold uppercase text-[10px] tracking-widest">Nom</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Description</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-center">Produits</TableHead>
                <TableHead className="text-right pr-6 font-bold uppercase text-[10px] tracking-widest">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center text-muted-foreground italic">
                    <div className="flex flex-col items-center gap-2">
                       <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                       Chargement des catégories...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCategories?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center text-muted-foreground italic">
                    Aucune catégorie trouvée.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories?.map((category: Category & { product_count?: number }) => (
                  <TableRow key={category.id} className="group hover:bg-muted/20 transition-colors border-muted/10">
                    <TableCell className="pl-6 font-bold text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Tags className="h-4 w-4" />
                        </div>
                        {category.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-md truncate">
                      {category.description || <span className="text-muted-foreground/30 italic text-xs">Aucune description</span>}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-none">
                        {category.product_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(category)} className="h-8 w-8 text-blue-400 hover:text-blue-500 hover:bg-blue-500/10">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteClick(category)} 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={(category?.product_count || 0) > 0}
                          title={(category?.product_count || 0) > 0 ? "Impossible de supprimer une catégorie contenant des produits" : "Supprimer"}
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
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setIsFormOpen(false); }}>
        <DialogContent className="sm:max-w-[425px] bg-[#1e1e2e] border-[#2e2e3e] text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {selectedCategory ? <Edit2 className="h-5 w-5 text-blue-400" /> : <Plus className="h-5 w-5 text-blue-400" />}
              {selectedCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 italic">
              {selectedCategory ? 'Mettez à jour les informations de la catégorie.' : 'Remplissez les détails pour créer une nouvelle catégorie.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nom de la catégorie</label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Électronique, Boissons..."
                className="bg-[#2e2e3e] border-none focus-visible:ring-1 focus-visible:ring-blue-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Description (optionnel)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez brièvement cette catégorie..."
                className="flex min-h-[100px] w-full rounded-md border-none bg-[#2e2e3e] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-100 hover:bg-white/5">
                Annuler
              </Button>
              <Button type="submit" disabled={formMutation.isPending} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                {formMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#1e1e2e] border-[#2e2e3e] text-slate-100 p-0 overflow-hidden">
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl font-bold text-white">Supprimer la catégorie ?</DialogTitle>
              <p className="text-sm text-slate-400">
                Êtes-vous sûr de vouloir supprimer <span className="font-bold text-slate-200">"{selectedCategory?.name}"</span> ? Cette action est irréversible.
              </p>
            </div>
          </div>
          <div className="bg-[#2e2e3e]/50 p-4 flex justify-center gap-3">
            <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="text-slate-400 hover:text-slate-100 hover:bg-white/5">
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(selectedCategory!.id)} disabled={deleteMutation.isPending} className="shadow-lg shadow-destructive/20">
              {deleteMutation.isPending ? 'Suppression...' : 'Confirmer la suppression'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
