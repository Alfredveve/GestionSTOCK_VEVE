import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import inventoryService from '@/services/inventoryService';
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  FileSpreadsheet, 
  FileText, 
  Loader2,
  Plus,
  Rocket,
  FileDown,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Calendar,
  FileBox,
  ArrowRightLeft,
  ShoppingBag,
  Truck,
  XCircle
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import type { Quote } from '@/types';
import type { Order } from '@/services/salesService';
import salesService from '@/services/salesService';
import dashboardService from '@/services/dashboardService';
import { toast } from 'sonner';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formatCurrency = (amount: string | number) => {
  return new Intl.NumberFormat('fr-GN', {
    maximumFractionDigits: 0
  }).format(Number(amount)) + ' GNF';
};

type StatusFilter = 'all' | 'draft' | 'sent' | 'converted';
type DateFilter = 'all' | 'today' | 'week' | 'month';

export function QuotesPage() {
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [page, setPage] = useState(1);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quotes', page, searchQuery, statusFilter, startDate, endDate],
    queryFn: () => inventoryService.getQuotes({ 
      page, 
      search: searchQuery || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      date_issued__gte: startDate || undefined,
      date_issued__lte: endDate || undefined,
    }),
  });

  // Filter quotes based on date (search and status are handled by API if supported, or here if not fully)
  const filteredQuotes = useMemo(() => {
    if (!quotes?.results) return [];

    let filtered = quotes.results;

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter((quote: Quote) => {
        const quoteDate = new Date(quote.valid_until);
        
        if (dateFilter === 'today') {
           return quoteDate >= today; 
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return quoteDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return quoteDate >= monthAgo;
        }
        return true;
      });
    }

    return filtered;
  }, [quotes, dateFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!quotes?.results) return { total: 0, converted: 0, active: 0, totalAmount: 0 };

    const total = quotes.results.length;
    const converted = quotes.results.filter((q: Quote) => q.status === 'converted').length;
    const active = quotes.results.filter((q: Quote) => ['draft', 'sent'].includes(q.status)).length;
    const totalAmount = quotes.results.reduce((sum: number, q: Quote) => sum + Number(q.total_amount), 0);

    return { total, converted, active, totalAmount };
  }, [quotes]);

  const handleExportExcel = async () => {
    try {
      setIsExporting('excel');
      await inventoryService.exportQuotesExcel();
      toast.success("Registre des devis exporté (Excel)");
    } catch {
      toast.error("Erreur lors de l'exportation Excel");
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting('pdf');
      await inventoryService.exportQuotesPdf();
      toast.success("Journal des devis exporté (PDF)");
    } catch {
      toast.error("Erreur lors de l'exportation PDF");
    } finally {
      setIsExporting(null);
    }
  };

  const convertMutation = useMutation({
    mutationFn: (id: number) => inventoryService.convertQuoteToInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success("Devis converti en facture avec succès");
    },
    onError: () => {
        toast.error("Erreur lors de la conversion du devis");
    }
  });

  const handleDeleteQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
      try {
        if (selectedQuote) {
             // await inventoryService.deleteQuote(selectedQuote.id); 
             // Service doesn't have deleteQuote. 
             toast.error("La suppression n'est pas encore activée pour les devis.");
        }
      } catch {
          toast.error("Erreur");
      } finally {
        setShowDeleteModal(false);
      }
  };


  const handleNewQuote = () => {
    navigate('/quotes/new');
  };

  const { data: orders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['orders', page, searchQuery, orderStatusFilter, startDate, endDate],
    queryFn: () => salesService.getOrders({ 
      page, 
      search: searchQuery || undefined,
      status: orderStatusFilter === 'all' ? undefined : orderStatusFilter,
      date_created__gte: startDate || undefined,
      date_created__lte: endDate || undefined,
    }),
  });

  const { data: dashStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Order> }) => 
      salesService.updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success("Commande mise à jour avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour de la commande");
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Ventes & Devis</h2>
          <p className="text-muted-foreground">Suivi complet de vos devis et commandes clients.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportExcel}
            disabled={isExporting !== null}
            className="bg-card border-muted/20 text-muted-foreground hover:text-foreground transition-all"
          >
            {isExporting === 'excel' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            Excel
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPdf}
            disabled={isExporting !== null}
            className="bg-card border-muted/20 text-muted-foreground hover:text-foreground transition-all"
          >
            {isExporting === 'pdf' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            PDF
          </Button>
          <Button 
            onClick={handleNewQuote}
            className="bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Devis
          </Button>
        </div>
      </div>

      {/* Statistics Cards - Global Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg bg-linear-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Devis</p>
                <p className="text-2xl font-black text-foreground mt-2">{quotes?.count || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FileBox className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-linear-to-br from-amber-500/10 to-amber-600/5 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commandes en attente</p>
                <p className="text-2xl font-black text-amber-600 mt-2">{dashStats?.pending_orders_count || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-linear-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Devis Convertis</p>
                <p className="text-2xl font-black text-foreground mt-2">{stats.converted}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-linear-to-br from-indigo-500/10 to-indigo-600/5 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En Cours (Devis)</p>
                <p className="text-2xl font-black text-foreground mt-2">{stats.active}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <ArrowRightLeft className="h-6 w-6 text-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="quotes" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-8 p-1 bg-muted/30 rounded-2xl">
          <TabsTrigger value="quotes" className="rounded-xl font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <FileText className="mr-2 h-4 w-4" />
            Devis
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-xl font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Commandes
            {dashStats?.pending_orders_count > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-500 text-white border-none animate-pulse">
                {dashStats.pending_orders_count}
              </Badge>
            )}
            {orders?.count > 0 && dashStats?.pending_orders_count === 0 && (
              <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-none">
                {orders.count}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

      <TabsContent value="quotes" className="space-y-6 mt-0 border-none p-0">

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher par numéro ou client..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 items-center">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-card border-muted/20 h-10 rounded-xl w-[150px]"
            placeholder="Date début"
          />
          <span className="text-muted-foreground text-sm">à</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-card border-muted/20 h-10 rounded-xl w-[150px]"
            placeholder="Date fin"
          />
        </div>

        <div className="flex gap-2">
          <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les dates</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('all')}
          className="whitespace-nowrap"
        >
          Tout
        </Button>
        <Button
          variant={statusFilter === 'converted' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('converted')}
          className="whitespace-nowrap"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Convertis
        </Button>
        <Button
          variant={statusFilter === 'sent' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('sent')}
          className="whitespace-nowrap"
        >
          <Clock className="mr-2 h-4 w-4" />
          Envoyés
        </Button>
        <Button
          variant={statusFilter === 'draft' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('draft')}
          className="whitespace-nowrap"
        >
          <FileText className="mr-2 h-4 w-4" />
          Brouillons
        </Button>
      </div>

      {/* Table */}
      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-muted/20">
                <TableHead className="pl-6 font-bold uppercase text-[11px] tracking-wider">N° Devis</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Client</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Statut</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Validité</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider text-right">Montant Total</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredQuotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64">
                    <div className="flex flex-col items-center justify-center text-center">
                       <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                        <FileBox className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2">
                        {searchQuery || statusFilter !== 'all' || dateFilter !== 'all' 
                          ? 'Aucun devis trouvé' 
                          : 'Aucun devis'}
                      </h3>
                       <p className="text-sm text-muted-foreground mb-4">
                        {searchQuery || statusFilter !== 'all' || dateFilter !== 'all'
                          ? 'Essayez de modifier vos filtres'
                          : 'Créez votre premier devis pour commencer'}
                      </p>
                      {!searchQuery && statusFilter === 'all' && dateFilter === 'all' && (
                        <Button onClick={handleNewQuote} className="mt-2 text-primary-foreground">
                          <Plus className="mr-2 h-4 w-4" />
                          Créer un devis
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredQuotes.map((quote: Quote) => (
                <TableRow key={quote.id} className="group border-muted/20 hover:bg-muted/10 transition-colors">
                  <TableCell className="pl-6 font-mono text-xs font-bold text-primary">
                    {quote.quote_number}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-foreground">{quote.client_name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`gap-1 font-bold text-[10px] uppercase ${
                      quote.status === 'converted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      quote.status === 'sent' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                      'bg-muted text-muted-foreground border-muted/50'
                    }`} variant="outline">
                      {quote.status === 'converted' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {quote.status === 'converted' ? 'Converti' : quote.status === 'sent' ? 'Envoyé' : 'Brouillon'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(quote.valid_until).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right font-black">
                    {formatCurrency(quote.total_amount)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => navigate(`/quotes/${quote.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir détails
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => navigate(`/quotes/${quote.id}/edit`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {quote.status !== 'converted' && (
                            <DropdownMenuItem 
                            onClick={() => convertMutation.mutate(quote.id)}
                            disabled={convertMutation.isPending}
                            className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50"
                            >
                            <Rocket className="mr-2 h-4 w-4" />
                            Facturer
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => toast.info('Téléchargement...')}>
                          <FileDown className="mr-2 h-4 w-4" />
                          Télécharger PDF
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteQuote(quote)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {quotes?.count && quotes.count > 10 && (
         <div className="flex items-center justify-between px-2">
           <p className="text-sm text-muted-foreground">
             Affichage de <span className="font-bold">{filteredQuotes.length}</span> sur <span className="font-bold">{quotes.count}</span> devis
           </p>
           <div className="flex items-center gap-2">
             <Button
               variant="outline"
               size="sm"
               onClick={() => setPage(p => Math.max(1, p - 1))}
               disabled={page === 1}
             >
               Précédent
             </Button>
             <div className="flex items-center gap-1">
               {Array.from({ length: Math.ceil(quotes.count / 10) }, (_, i) => i + 1).map((p) => (
                 <Button
                   key={p}
                   variant={page === p ? 'default' : 'outline'}
                   size="sm"
                   className="w-8 h-8 p-0"
                   onClick={() => setPage(p)}
                 >
                   {p}
                 </Button>
               ))}
             </div>
             <Button
               variant="outline"
               size="sm"
               onClick={() => setPage(p => p + 1)}
               disabled={page >= Math.ceil(quotes.count / 10)}
             >
               Suivant
             </Button>
           </div>
         </div>
       )}

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le devis {selectedQuote?.quote_number} ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        </TabsContent>

        <TabsContent value="orders" className="space-y-6 mt-0 border-none p-0">
          {/* Filters for Orders */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher une commande..." 
                className="pl-10 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-card border-muted/20 h-10 rounded-xl w-[150px]"
                placeholder="Date début"
              />
              <span className="text-muted-foreground text-sm">à</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-card border-muted/20 h-10 rounded-xl w-[150px]"
                placeholder="Date fin"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              <Button
                variant={orderStatusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setOrderStatusFilter('all')}
                size="sm"
                className="rounded-lg h-9"
              >
                Tout
              </Button>
              <Button
                variant={orderStatusFilter === 'pending' ? 'default' : 'outline'}
                onClick={() => setOrderStatusFilter('pending')}
                size="sm"
                className={`rounded-lg h-9 ${orderStatusFilter !== 'pending' && dashStats?.pending_orders_count > 0 ? 'border-amber-500 text-amber-600' : ''}`}
              >
                <Clock className="mr-2 h-4 w-4" />
                En attente
              </Button>
              <Button
                variant={orderStatusFilter === 'validated' ? 'default' : 'outline'}
                onClick={() => setOrderStatusFilter('validated')}
                size="sm"
                className="rounded-lg h-9"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Validées
              </Button>
            </div>
          </div>

          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-muted/20">
                    <TableHead className="pl-6 font-bold uppercase text-[11px] tracking-wider">N° Commande</TableHead>
                    <TableHead className="font-bold uppercase text-[11px] tracking-wider">Client</TableHead>
                    <TableHead className="font-bold uppercase text-[11px] tracking-wider">Statut</TableHead>
                    <TableHead className="font-bold uppercase text-[11px] tracking-wider">Date</TableHead>
                    <TableHead className="font-bold uppercase text-[11px] tracking-wider text-right">Total</TableHead>
                    <TableHead className="font-bold uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingOrders ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Chargement des commandes...
                      </TableCell>
                    </TableRow>
                  ) : !orders?.results || orders.results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mb-4" />
                          <h3 className="text-lg font-bold">Aucune commande trouvée</h3>
                          <p className="text-sm text-muted-foreground">Les commandes créées via le POS apparaîtront ici.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : orders.results.map((order: Order) => (
                    <TableRow key={order.id} className="group border-muted/20 hover:bg-muted/5 transition-colors">
                      <TableCell className="pl-6 font-mono text-xs font-bold text-primary">
                        {order.order_number}
                      </TableCell>
                      <TableCell className="font-bold">{order.client_name || `Client #${order.client}`}</TableCell>
                      <TableCell>
                        <Badge className={`font-bold capitalize ${
                          order.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          order.status === 'validated' || order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }`} variant="outline">
                          {order.status === 'pending' ? 'En attente' : 
                           order.status === 'validated' ? 'Validée' : 
                           order.status === 'delivered' ? 'Livrée' : 
                           order.status === 'paid' ? 'Payée' :
                           order.status === 'cancelled' ? 'Annulée' : order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {order.date_created ? new Date(order.date_created).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right font-black">
                        {formatCurrency(order.total_amount)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => navigate(`/orders/${order.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Voir détails
                            </DropdownMenuItem>
                            
                            {order.status === 'pending' && (
                              <DropdownMenuItem 
                                onClick={() => updateOrderMutation.mutate({ id: order.id!, data: { status: 'validated' } })}
                                className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50"
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Valider la commande
                              </DropdownMenuItem>
                            )}

                            {(order.status === 'validated' || order.status === 'processing') && (
                              <DropdownMenuItem 
                                onClick={() => updateOrderMutation.mutate({ id: order.id!, data: { status: 'delivered' } })}
                                className="text-blue-600 focus:text-blue-700 focus:bg-blue-50"
                              >
                                <Truck className="mr-2 h-4 w-4" />
                                Marquer comme livrée
                              </DropdownMenuItem>
                            )}

                            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => updateOrderMutation.mutate({ id: order.id!, data: { status: 'cancelled' } })}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Annuler la commande
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pagination (shared or duplicate?) - keeping it shared for quotes mostly for now as per current structure */}
    </div>
  );
}
