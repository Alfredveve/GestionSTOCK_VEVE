import { useState } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import inventoryService from '@/services/inventoryService';

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExpenseForm({ isOpen, onClose }: ExpenseFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    reference: 'EXP-TEMP' 
  });

  // Need categories for expenses
  const { data: categoriesData } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => inventoryService.getExpenseCategories(),
  });

  const categories = categoriesData?.results || (Array.isArray(categoriesData) ? categoriesData : []);

  const mutation = useMutation({
    mutationFn: (data: { amount: string, category: string, description: string, date: string, reference: string }) => inventoryService.createExpense({
        ...data,
        point_of_sale: 1 // Default POS for now
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      onClose();
      setFormData({
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        reference: `EXP-${Date.now().toString().slice(-6)}`
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Nouvelle Dépense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Catégorie</label>
              <select 
                title="Catégorie de dépense"
                name="category" 
                value={formData.category} 
                onChange={handleChange}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors outline-none"
              >
                <option value="">Sélectionner</option>
                {categories?.map((cat: { id: number, name: string }) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Montant (GNF)</label>
              <Input name="amount" type="number" value={formData.amount} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Date</label>
              <Input name="date" type="date" value={formData.date} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Référence</label>
              <Input name="reference" value={formData.reference} onChange={handleChange} required />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
            <textarea 
               name="description"
               value={formData.description}
               onChange={handleChange}
               className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors outline-none"
               placeholder="Détails de la dépense..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Création..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
