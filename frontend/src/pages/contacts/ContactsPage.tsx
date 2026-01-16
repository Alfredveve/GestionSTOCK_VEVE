import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, MapPin, MoreVertical, Users, Truck, Plus, Search } from 'lucide-react';
import inventoryService from '@/services/inventoryService';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactForm } from '@/components/contacts/ContactForm';

export function ContactsPage() {
  const [activeTab, setActiveTab] = useState<'clients' | 'suppliers'>('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => inventoryService.getSuppliers(),
  });

  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => inventoryService.getClients(),
  });
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Contacts</h2>
          <p className="text-muted-foreground">Gérez vos relations avec les clients et les fournisseurs.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="shadow-lg shadow-primary/20 transition-all hover:scale-105">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau {activeTab === 'clients' ? 'Client' : 'Fournisseur'}
        </Button>
      </div>

      <ContactForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        type={activeTab} 
      />

      <div className="flex p-1 bg-muted/50 rounded-xl w-fit border border-muted/30">
        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'clients' 
              ? "bg-background text-primary shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="mr-2 h-4 w-4" />
          Clients
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'suppliers' 
              ? "bg-background text-primary shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Truck className="mr-2 h-4 w-4" />
          Fournisseurs
        </button>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-bold">Liste des {activeTab === 'clients' ? 'Clients' : 'Fournisseurs'}</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher..." 
              className="pl-9 bg-muted/30 border-none h-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-muted/30">
                <TableHead>{activeTab === 'clients' ? 'Client' : 'Fournisseur'}</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(activeTab === 'suppliers' ? isLoadingSuppliers : isLoadingClients) ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : (activeTab === 'suppliers' ? suppliers : clients)?.results?.map((contact: { id: number, name: string, email?: string, phone?: string, contact_person?: string, city?: string, address?: string }) => (
                <TableRow key={contact.id} className="group border-muted/20 hover:bg-muted/10 transition-colors">
                  <TableCell>
                    <div>
                      <div className="font-bold text-foreground">{contact.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{contact.email || 'Aucun email'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Phone className="mr-2 h-3 w-3 text-primary/60" />
                        {contact.phone || 'N/A'}
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground italic opacity-70">
                        {contact.contact_person || 'N/A'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-xs text-muted-foreground italic truncate max-w-[200px]">
                      <MapPin className="mr-2 h-3 w-3 text-destructive/60" />
                      {contact.city || contact.address || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {((activeTab === 'suppliers' ? suppliers : clients)?.results?.length === 0) && (
                <TableRow>
                   <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Aucun {activeTab === 'clients' ? 'Client' : 'Fournisseur'} trouvé.
                   </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
