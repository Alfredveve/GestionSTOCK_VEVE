import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
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

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'clients' | 'suppliers';
}

export function ContactForm({ isOpen, onClose, type }: ContactFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    city: '',
    country: 'Guinée',
    address: '',
    ...(type === 'clients' ? { client_type: 'individual' } : {})
  });

  const mutation = useMutation({
    mutationFn: (data: any): Promise<any> => 
      type === 'clients' 
        ? inventoryService.createClient(data) 
        : inventoryService.createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type] });
      onClose();
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        city: '',
        country: 'Guinée',
        address: '',
        ...(type === 'clients' ? { client_type: 'individual' } : {})
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
          <DialogTitle className="text-2xl font-black">
            Nouveau {type === 'clients' ? 'Client' : 'Fournisseur'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Nom / Entreprise</label>
            <Input name="name" value={formData.name} onChange={handleChange} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Téléphone</label>
              <Input name="phone" value={formData.phone} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Email</label>
              <Input name="email" type="email" value={formData.email} onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Personne de contact</label>
            <Input name="contact_person" value={formData.contact_person} onChange={handleChange} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Ville</label>
              <Input name="city" value={formData.city} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Pays</label>
              <Input name="country" value={formData.country} onChange={handleChange} />
            </div>
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
