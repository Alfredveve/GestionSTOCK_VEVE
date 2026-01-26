import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { 
  Phone, 
  MapPin, 
  MoreVertical, 
  Users, 
  Truck, 
  Plus, 
  Search,
  UserPlus,
  Building2,
  TrendingUp,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import inventoryService from '@/services/inventoryService';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactForm } from '@/components/contacts/ContactForm';
import { cn } from '@/lib/utils';

interface Contact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  city?: string;
  address?: string;
}

export function ContactsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
  
  const activeTab = useMemo(() => 
    typeParam === 'supplier' ? 'suppliers' : 'clients',
  [typeParam]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: suppliersData, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => inventoryService.getSuppliers(),
  });

  const { data: clientsData, isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => inventoryService.getClients(),
  });

  const suppliers = useMemo(() => suppliersData?.results || [], [suppliersData]);
  const clients = useMemo(() => clientsData?.results || [], [clientsData]);

  const filteredList = useMemo(() => {
    const list = activeTab === 'clients' ? clients : suppliers;
    if (!searchTerm) return list as Contact[];
    
    const term = searchTerm.toLowerCase();
    return (list as Contact[]).filter((item: Contact) => 
      item.name?.toLowerCase().includes(term) ||
      item.email?.toLowerCase().includes(term) ||
      item.phone?.toLowerCase().includes(term) ||
      item.city?.toLowerCase().includes(term)
    );
  }, [activeTab, clients, suppliers, searchTerm]);

  const stats = useMemo(() => [
    {
      label: 'Total Clients',
      value: clients.length,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      label: 'Total Fournisseurs',
      value: suppliers.length,
      icon: Truck,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
    {
      label: 'Nouveaux ce mois',
      value: Math.floor(clients.length * 0.1) + 2, // Mock stat
      icon: UserPlus,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    {
      label: 'Villes couvertes',
      value: new Set([...clients, ...suppliers].map((c: Contact) => c.city).filter(Boolean)).size || 1,
      icon: Globe,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10'
    }
  ], [clients, suppliers]);

  const handleTabChange = (tab: 'clients' | 'suppliers') => {
    setSearchParams({ type: tab === 'clients' ? 'client' : 'supplier' });
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative space-y-8 pb-8"
    >
      {/* Premium Background Decorations */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1],
            x: [0, -70, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] bg-blue-500/10 blur-[100px] rounded-full"
        />
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] bg-purple-500/10 blur-[110px] rounded-full"
        />
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Répertoire
          </h2>
          <p className="text-muted-foreground text-lg">
            Gérez votre écosystème de {activeTab === 'clients' ? 'clients' : 'fournisseurs'} partenaires.
          </p>
        </div>
        <Button 
          onClick={() => setIsFormOpen(true)} 
          className="h-12 px-8 rounded-2xl bg-primary shadow-[0_8px_30px_rgb(var(--primary-rgb),0.3)] transition-all hover:scale-105 active:scale-95 text-lg font-bold"
        >
          <Plus className="mr-2 h-5 w-5" />
          Nouveau {activeTab === 'clients' ? 'Client' : 'Fournisseur'}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="border-none bg-card/40 backdrop-blur-md shadow-sm overflow-hidden group">
              <CardContent className="p-6 relative">
                <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110", stat.bg)} />
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-2xl", stat.bg)}>
                    <stat.icon className={cn("h-6 w-6", stat.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <h3 className="text-2xl font-bold mt-0.5">{stat.value}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Card */}
      <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-xl rounded-4xl overflow-hidden">
        <div className="p-8 space-y-8">
          {/* Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex p-1.5 bg-muted/30 backdrop-blur-sm rounded-2xl w-fit border border-white/5">
              <button
                onClick={() => handleTabChange('clients')}
                className={cn(
                  "relative flex items-center px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300",
                  activeTab === 'clients' 
                    ? "text-primary cursor-default" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {activeTab === 'clients' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-background shadow-lg rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Users className="mr-2 h-4 w-4 relative z-10" />
                <span className="relative z-10">Clients</span>
              </button>
              <button
                onClick={() => handleTabChange('suppliers')}
                className={cn(
                  "relative flex items-center px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300",
                  activeTab === 'suppliers' 
                    ? "text-primary cursor-default" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {activeTab === 'suppliers' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-background shadow-lg rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Truck className="mr-2 h-4 w-4 relative z-10" />
                <span className="relative z-10">Fournisseurs</span>
              </button>
            </div>

            <div className="relative w-full lg:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input 
                placeholder={`Rechercher un ${activeTab === 'clients' ? 'client' : 'fournisseur'}...`}
                className="pl-12 bg-muted/20 border-none h-14 rounded-2xl transition-all focus-visible:ring-2 focus-visible:ring-primary/20 text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Table Implementation */}
          <div className="relative min-h-[400px]">
            <AnimatePresence mode="wait">
              {(activeTab === 'suppliers' ? isLoadingSuppliers : isLoadingClients) ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center flex-col gap-4"
                >
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-muted-foreground font-medium animate-pulse">Chargement des données...</p>
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-muted/20">
                        <TableHead className="w-[300px] text-xs uppercase tracking-wider font-black opacity-50 px-6 py-4">Nom & Identité</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider font-black opacity-50 px-6 py-4">Coordonnées</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider font-black opacity-50 px-6 py-4">Localisation</TableHead>
                        <TableHead className="text-right text-xs uppercase tracking-wider font-black opacity-50 px-6 py-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredList.map((contact: Contact, idx: number) => (
                        <motion.tr 
                          key={contact.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="group border-muted/10 hover:bg-muted/10 transition-colors cursor-pointer"
                        >
                          <TableCell className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "h-11 w-11 rounded-xl flex items-center justify-center font-black text-sm shadow-inner transition-transform group-hover:scale-110",
                                activeTab === 'clients' ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"
                              )}>
                                {getInitials(contact.name)}
                              </div>
                              <div className="space-y-0.5">
                                <div className="font-bold text-foreground group-hover:text-primary transition-colors">{contact.name}</div>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                  <Building2 className="h-3 w-3" />
                                  ID: #{contact.id.toString().padStart(4, '0')}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-5">
                            <div className="space-y-1.5 focus-within:opacity-100">
                              {contact.phone && (
                                <div className="flex items-center text-xs font-semibold text-foreground/80">
                                  <Phone className="mr-2.5 h-3.5 w-3.5 text-primary/60" />
                                  {contact.phone}
                                </div>
                              )}
                              <div className="flex items-center text-[11px] text-muted-foreground">
                                <TrendingUp className="mr-2.5 h-3.5 w-3.5 opacity-50" />
                                {contact.email || 'Pas d\'email'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-5">
                            <div className="flex items-center text-xs text-muted-foreground font-medium">
                              <MapPin className="mr-2.5 h-3.5 w-3.5 text-destructive/50" />
                              {contact.city || contact.address ? (
                                <span>{contact.city}{contact.city && contact.address ? ', ' : ''}{contact.address}</span>
                              ) : (
                                <span className="italic opacity-50">Non spécifiée</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-5 text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>

                  {filteredList.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                      <div className="h-20 w-20 bg-muted/50 rounded-4xl flex items-center justify-center">
                        <Search className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">Aucun résultat trouvé</h4>
                        <p className="text-muted-foreground text-sm max-w-[250px]">
                          Nous n'avons trouvé aucun {activeTab === 'clients' ? 'client' : 'fournisseur'} correspondant à "{searchTerm}".
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => setSearchTerm('')} className="rounded-xl">
                        Effacer la recherche
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Card>

      <ContactForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        type={activeTab} 
      />
    </motion.div>
  );
}
