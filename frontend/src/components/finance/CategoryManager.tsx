import { 
  Settings, 
  Trash2, 
  Pencil,
  PlusCircle,
  Tag,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import inventoryService from '@/services/inventoryService';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from 'react';
import { Badge } from "@/components/ui/badge";

interface ExpenseCategory {
  id: number;
  name: string;
  description: string;
}

export function CategoryManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const { data: categories, isLoading, isError } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => inventoryService.getExpenseCategories(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<ExpenseCategory>) => inventoryService.createExpenseCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success("Catégorie créée avec succès");
      handleCloseDialog();
    },
    onError: (error: unknown) => {
      console.error("Erreur création catégorie:", error);
      // @ts-expect-error - Response type is unknown in error object
      if (error?.response?.data?.name) {
        toast.error("Une catégorie avec ce nom existe déjà.");
      } else {
        toast.error("Erreur lors de la création de la catégorie.");
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ExpenseCategory> }) => 
      inventoryService.updateExpenseCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success("Catégorie mise à jour avec succès");
      handleCloseDialog();
    },
    onError: (error: unknown) => {
      console.error("Erreur modification catégorie:", error);
      toast.error("Impossible de modifier la catégorie.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryService.deleteExpenseCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success("Catégorie supprimée");
    },
    onError: (error) => {
      console.error("Erreur suppression:", error);
      toast.error("Impossible de supprimer cette catégorie car elle est probablement utilisée.");
    }
  });

  const handleOpenCreate = () => {
    console.log("Opening Create Dialog");
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (category: ExpenseCategory) => {
    console.log("Opening Edit Dialog for", category);
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    // Reset after transition to avoid UI flickering
    setTimeout(() => {
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
    }, 300);
  };

  const handleSubmit = () => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const categoryList: ExpenseCategory[] = categories?.results || 
    (Array.isArray(categories) ? categories : []);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <Card className="md:col-span-1 border-none shadow-xl bg-primary/5 h-fit">
        <CardHeader>
          <div className="p-3 bg-primary/10 rounded-2xl w-fit mb-4">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold">Gestion des Catégories</CardTitle>
          <CardDescription>
            Définissez les types de charges pour un meilleur suivi analytique.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleOpenCreate}
            className="w-full shadow-lg shadow-primary/20 cursor-pointer h-12 text-md font-semibold"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Ajouter une catégorie
          </Button>

          <div className="mt-8 space-y-4">
             <div className="flex items-center gap-3 p-4 bg-white/50 rounded-xl border border-white/20">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <div>
                   <p className="text-sm font-medium text-muted-foreground">Total Catégories</p>
                   <p className="text-2xl font-bold">{categoryList.length}</p>
                </div>
             </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 border-none shadow-2xl bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col">
        <CardHeader className="border-b border-white/10 pb-4">
            <div className="flex items-center justify-between">
                <CardTitle>Liste des catégories</CardTitle>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {categoryList.length} actifs
                </Badge>
            </div>
        </CardHeader>
        <CardContent className="p-0 grow">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10 border-white/5 hover:bg-muted/20">
                  <TableHead className="py-5 pl-6 font-bold uppercase text-[11px] tracking-widest text-muted-foreground w-[40%]">Nom</TableHead>
                  <TableHead className="font-bold uppercase text-[11px] tracking-widest text-muted-foreground w-[40%]">Description</TableHead>
                  <TableHead className="pr-6 font-bold uppercase text-[11px] tracking-widest text-right text-muted-foreground w-[20%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-48 text-center text-muted-foreground">
                       <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
                        <span className="text-sm font-medium animate-pulse">Chargement des catégories...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-48 text-center text-red-500">
                       <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                        <span className="text-sm font-medium">Erreur lors du chargement des catégories.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : categoryList.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={3} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/60">
                         <Tag className="h-8 w-8 mb-2 opacity-20" />
                         <span className="text-sm font-medium">Aucune catégorie définie.</span>
                         <Button variant="link" onClick={handleOpenCreate} className="text-primary mt-2">
                            Créer la première catégorie
                         </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : categoryList.map((cat) => (
                  <TableRow key={cat.id} className="group border-white/5 hover:bg-white/5 transition-all duration-200">
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                           <Tag className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-foreground/90">{cat.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm italic group-hover:text-foreground/80 transition-colors">
                      {cat.description || '-'}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            onClick={() => handleOpenEdit(cat)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm("Supprimer cette catégorie ?")) {
                              deleteMutation.mutate(cat.id);
                            }
                          }}
                        >
                           {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
                {editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie de dépense"}
            </DialogTitle>
            <DialogDescription>
                {editingCategory 
                    ? "Modifiez les informations de la catégorie existante." 
                    : "Créez une nouvelle catégorie pour classer vos dépenses."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la catégorie <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                placeholder="ex: Loyer, Salaires, Transport..." 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description (optionnel)</Label>
              <Input 
                id="desc" 
                placeholder="Description courte..." 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isSaving}>
                Annuler
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCategory ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

