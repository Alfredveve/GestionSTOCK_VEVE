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
  AlertCircle, 
  FileSpreadsheet, 
  FileText, 
  Loader2,
  Plus,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Eye,
  Edit,
  Download,
  Trash2,
  MoreVertical,
  Calendar,
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import type { Invoice, InvoiceItem } from '@/types';
import { toast } from 'sonner';
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { formatCurrency } from '@/lib/utils';

type StatusFilter = 'all' | 'paid' | 'partial' | 'unpaid';
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

export function InvoicesPage() {
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [page, setPage] = useState(1);

  const navigate = useNavigate();
  const queryClient = useQueryClient();


  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', page, searchQuery, statusFilter],
    queryFn: () => inventoryService.getInvoices({ 
      page, 
      search: searchQuery || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter
    }),
  });

  // Filter invoices based on search, status, and date
  const filteredInvoices = useMemo(() => {
    if (!invoices?.results) return [];

    let filtered = invoices.results;



    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter((invoice: Invoice) => {
        const invoiceDate = new Date(invoice.date_issued);
        
        if (dateFilter === 'today') {
          return invoiceDate >= today;
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return invoiceDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return invoiceDate >= monthAgo;
        } else if (dateFilter === 'custom') {
          // Custom date range filter
          if (customStartDate && customEndDate) {
            const startDate = new Date(customStartDate);
            const endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999); // Include the entire end date
            return invoiceDate >= startDate && invoiceDate <= endDate;
          } else if (customStartDate) {
            const startDate = new Date(customStartDate);
            return invoiceDate >= startDate;
          } else if (customEndDate) {
            const endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999);
            return invoiceDate <= endDate;
          }
        }
        return true;
      });
    }

    return filtered;
  }, [invoices, dateFilter, customStartDate, customEndDate]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!invoices?.results) return { total: 0, paid: 0, balance: 0 };

    const total = invoices.results.reduce((sum: number, inv: Invoice) => sum + Number(inv.total_amount), 0);
    const balance = invoices.results.reduce((sum: number, inv: Invoice) => sum + Number(inv.balance), 0);
    const paid = total - balance;

    return { total, paid, balance };
  }, [invoices]);

  // Count by status
  const statusCounts = useMemo(() => {
    if (!invoices?.results) return { all: 0, paid: 0, partial: 0, unpaid: 0 };

    return {
      all: invoices.results.length,
      paid: invoices.results.filter((inv: Invoice) => inv.status === 'paid').length,
      partial: invoices.results.filter((inv: Invoice) => inv.status === 'partial').length,
      unpaid: invoices.results.filter((inv: Invoice) => inv.status === 'unpaid').length,
    };
  }, [invoices]);

  const handleExportExcel = async () => {
    try {
      setIsExporting('excel');
      await inventoryService.exportInvoicesExcel();
      toast.success("Registre Excel exporté avec succès");
    } catch {
      toast.error("Erreur lors de l'exportation Excel");
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting('pdf');
      await inventoryService.exportInvoicesPdf();
      toast.success("Catalogue PDF exporté avec succès");
    } catch {
      toast.error("Erreur lors de l'exportation PDF");
    } finally {
      setIsExporting(null);
    }
  };

  const handleViewDetails = (invoice: Invoice) => {
    navigate(`/invoices/${invoice.id}`);
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    try {
      toast.info(`Téléchargement de la facture ${invoice.invoice_number}...`);
      // Temporairement changer le titre pour aider certains navigateurs
      const originalTitle = document.title;
      document.title = `Facture_${invoice.invoice_number}`;
      
      await inventoryService.exportInvoicePdf(invoice.id, invoice.invoice_number);
      
      document.title = originalTitle;
      toast.success("Facture téléchargée avec succès");
    } catch {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleEditInvoice = (invoice: Invoice) => {
    navigate(`/invoices/${invoice.id}/edit`);
  };
  
  const handleRecordPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };


  const handleDeleteInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDeleteModal(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // TODO: Implement delete endpoint
      console.log('Deleting invoice:', id);
      throw new Error("Delete endpoint not implemented");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success("Facture supprimée avec succès");
      setShowDeleteModal(false);
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const handleConfirmDelete = () => {
    if (selectedInvoice) {
      deleteMutation.mutate(selectedInvoice.id);
    }
  };

  const handleNewInvoice = () => {
    navigate('/invoices/new');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Facturation</h2>
          <p className="text-muted-foreground">Gérez vos factures clients et suivez les paiements.</p>
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
            onClick={handleNewInvoice}
            className="bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle Facture
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg bg-linear-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Facturé</p>
                <p className="text-2xl font-black text-foreground mt-2">{formatCurrency(stats.total)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-linear-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Encaissé</p>
                <p className="text-2xl font-black text-foreground mt-2">{formatCurrency(stats.paid)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-linear-to-br from-rose-500/10 to-rose-600/5 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Solde Dû</p>
                <p className="text-2xl font-black text-foreground mt-2">{formatCurrency(stats.balance)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-rose-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
              <SelectItem value="custom">Intervalle personnalisé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Date Range Inputs */}
      {dateFilter === 'custom' && (
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 max-w-xs">
            <Label htmlFor="start-date" className="text-sm font-medium mb-2 block">
              Date de début
            </Label>
            <Input
              id="start-date"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1 max-w-xs">
            <Label htmlFor="end-date" className="text-sm font-medium mb-2 block">
              Date de fin
            </Label>
            <Input
              id="end-date"
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="w-full"
            />
          </div>
          {(customStartDate || customEndDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="whitespace-nowrap"
            >
              Réinitialiser
            </Button>
          )}
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('all')}
          className="whitespace-nowrap"
        >
          Tout
          <Badge variant="secondary" className="ml-2">{statusCounts.all}</Badge>
        </Button>
        <Button
          variant={statusFilter === 'paid' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('paid')}
          className="whitespace-nowrap"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Payé
          <Badge variant="secondary" className="ml-2">{statusCounts.paid}</Badge>
        </Button>
        <Button
          variant={statusFilter === 'partial' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('partial')}
          className="whitespace-nowrap"
        >
          <Clock className="mr-2 h-4 w-4" />
          Partiel
          <Badge variant="secondary" className="ml-2">{statusCounts.partial}</Badge>
        </Button>
        <Button
          variant={statusFilter === 'unpaid' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('unpaid')}
          className="whitespace-nowrap"
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          Impayé
          <Badge variant="secondary" className="ml-2">{statusCounts.unpaid}</Badge>
        </Button>
      </div>

      {/* Table */}
      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-muted/20">
                <TableHead className="pl-6 font-bold uppercase text-[11px] tracking-wider">N° Facture</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Client</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Statut</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Date</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider text-right">Total TTC</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider text-right">Reste à payer</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                        <FileText className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2">
                        {searchQuery || statusFilter !== 'all' || dateFilter !== 'all' 
                          ? 'Aucune facture trouvée' 
                          : 'Aucune facture'}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {searchQuery || statusFilter !== 'all' || dateFilter !== 'all'
                          ? 'Essayez de modifier vos filtres de recherche'
                          : 'Commencez par créer votre première facture'}
                      </p>
                      {!searchQuery && statusFilter === 'all' && dateFilter === 'all' && (
                        <Button onClick={handleNewInvoice} className="mt-2">
                          <Plus className="mr-2 h-4 w-4" />
                          Créer votre première facture
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.map((invoice: Invoice) => (
                <TableRow key={invoice.id} className="group border-muted/20 hover:bg-muted/10 transition-colors">
                  <TableCell className="pl-6 font-mono text-xs font-bold text-primary">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-foreground">{invoice.client_name}</div>
                  </TableCell>
                   <TableCell>
                    <Badge className={`gap-1 font-bold text-[10px] uppercase ${
                      invoice.status === 'paid' || Number(invoice.balance) <= 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      (invoice.status === 'partial' || (Number(invoice.balance) > 0 && Number(invoice.balance) < Number(invoice.total_amount))) ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    }`} variant="outline">
                      {invoice.status === 'paid' || Number(invoice.balance) <= 0 ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Payée
                        </>
                      ) : (invoice.status === 'partial' || (Number(invoice.balance) > 0 && Number(invoice.balance) < Number(invoice.total_amount))) ? (
                        <>
                          <Clock className="h-3 w-3" />
                          Partielle
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          Impayée
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(invoice.date_issued).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right font-black">
                    {formatCurrency(invoice.total_amount)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-rose-500">
                    {formatCurrency(invoice.balance)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleViewDetails(invoice)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir les détails
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDownloadPdf(invoice)}>
                          <Download className="mr-2 h-4 w-4" />
                          Télécharger PDF
                        </DropdownMenuItem>
                        {Number(invoice.balance) > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleRecordPayment(invoice)}>
                              <DollarSign className="mr-2 h-4 w-4" />
                              Enregistrer un paiement
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteInvoice(invoice)}
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
      {invoices?.count && invoices.count > 10 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Affichage de <span className="font-bold">{filteredInvoices.length}</span> sur <span className="font-bold">{invoices.count}</span> factures
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
              {Array.from({ length: Math.ceil(invoices.count / 10) }, (_, i) => i + 1).map((p) => (
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
              disabled={page >= Math.ceil(invoices.count / 10)}
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
              Êtes-vous sûr de vouloir supprimer la facture {selectedInvoice?.invoice_number} ?
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
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Payment Modal */}
      <PaymentDialog 
        open={showPaymentModal} 
        onOpenChange={setShowPaymentModal}
        invoice={selectedInvoice}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }}
      />

      {/* Hidden Print Contents */}
      <div id="print-invoice" className="print-only p-8 bg-white text-black min-h-screen">
          {/* Full Invoice Layout */}
          {selectedInvoice && (
              <div className="space-y-8">
                  <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-black uppercase text-blue-600 mb-2">FACTURE</h1>
                        <p className="text-xl font-bold text-gray-400">#{selectedInvoice.invoice_number}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-black text-2xl tracking-tighter">GESTION STOCK</p>
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Le Partenaire de votre Succès</p>
                        <p className="text-sm text-gray-400">Conakry, Guinée</p>
                    </div>
                  </div>

                  <div className="h-2 bg-blue-600 rounded-full w-full" />

                  <div className="grid grid-cols-2 gap-12">
                      <div className="space-y-2">
                          <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Facturé à :</p>
                          <p className="text-2xl font-black text-gray-900">{selectedInvoice.client_name}</p>
                          <p className="text-sm text-gray-500">Compte Client Actif</p>
                      </div>
                      <div className="text-right space-y-2">
                          <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Détails de facturation :</p>
                          <div className="flex justify-end gap-x-4">
                              <span className="text-sm font-bold text-gray-400">Émise le</span>
                              <span className="text-sm font-black">{new Date(selectedInvoice.date_issued).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="flex justify-end gap-x-4 text-rose-600">
                              <span className="text-sm font-bold opacity-60">Échéance</span>
                              <span className="text-sm font-black">{new Date(selectedInvoice.due_date).toLocaleDateString('fr-FR')}</span>
                          </div>
                      </div>
                  </div>

                  <Table className="mt-8">
                      <TableHeader className="bg-gray-900 rounded-xl overflow-hidden">
                          <TableRow className="hover:bg-transparent border-none">
                              <TableHead className="text-white font-black uppercase text-xs h-12">Produit & Description</TableHead>
                              <TableHead className="text-white font-black uppercase text-xs text-center">Qté</TableHead>
                              <TableHead className="text-white font-black uppercase text-xs text-right">Prix Unitaire</TableHead>
                              <TableHead className="text-white font-black uppercase text-xs text-right">Total Ligne</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {selectedInvoice.items?.map((item: InvoiceItem) => (
                              <TableRow key={item.id} className="border-b border-gray-100 hover:bg-transparent">
                                  <TableCell className="py-6">
                                      <p className="font-black text-gray-900">{item.product_name}</p>
                                      <p className="text-[10px] text-gray-400 font-bold uppercase">{item.product_sku}</p>
                                  </TableCell>
                                  <TableCell className="text-center font-black text-gray-900">{item.quantity}</TableCell>
                                  <TableCell className="text-right font-bold text-gray-600">{formatCurrency(item.unit_price)}</TableCell>
                                  <TableCell className="text-right font-black text-gray-900">{formatCurrency(item.total)}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>

                  <div className="flex justify-end mt-12 bg-gray-50 rounded-3xl p-8 border border-gray-100">
                      <div className="w-80 space-y-4">
                          {Number(selectedInvoice.subtotal) > 0 && (
                            <div className="flex justify-between items-center text-gray-500">
                                <span className="text-sm font-bold uppercase tracking-widest">Sous-Total</span>
                                <span className="font-black">{formatCurrency(selectedInvoice.subtotal)}</span>
                            </div>
                          )}
                          {Number(selectedInvoice.tax_amount) > 0 && (
                            <div className="flex justify-between items-center text-gray-500">
                                <span className="text-sm font-bold uppercase tracking-widest">TVA ({selectedInvoice.tax_rate}%)</span>
                                <span className="font-black">{formatCurrency(selectedInvoice.tax_amount)}</span>
                            </div>
                          )}
                          {Number(selectedInvoice.discount_amount) > 0 && (
                            <div className="flex justify-between items-center text-emerald-600">
                                <span className="text-sm font-bold uppercase tracking-widest">Remise</span>
                                <span className="font-black">- {formatCurrency(selectedInvoice.discount_amount)}</span>
                            </div>
                          )}
                          <div className="h-px bg-gray-200 my-4" />
                          <div className="flex justify-between items-center bg-blue-600 text-white p-4 rounded-2xl shadow-xl shadow-blue-200">
                              <span className="text-lg font-black uppercase tracking-tighter">Total TTC</span>
                              <span className="text-2xl font-black">{formatCurrency(selectedInvoice.total_amount)}</span>
                          </div>
                          {Number(selectedInvoice.balance) > 0 && (
                            <div className="flex justify-between items-center text-rose-600 pt-2 px-4 italic">
                                <span className="text-xs font-bold uppercase tracking-widest">Reste à payer</span>
                                <span className="text-sm font-black">{formatCurrency(selectedInvoice.balance)}</span>
                            </div>
                          )}
                      </div>
                  </div>

                  <div className="mt-24 text-center space-y-2">
                    <p className="text-sm font-black text-gray-900">Merci de votre confiance !</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] italic">Conditions de paiement : 30 jours à réception de facture</p>
                  </div>
              </div>
          )}
      </div>

      <div id="print-ticket" className="print-only p-4 bg-white text-black text-[12px] w-[80mm] font-mono leading-tight">
          {/* Ticket Layout for Thermal Printers */}
          {selectedInvoice && (
              <div className="space-y-4">
                  <div className="text-center space-y-1">
                      <p className="font-black text-2xl uppercase tracking-tighter">GESTION STOCK</p>
                      <p className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">Expert en Distribution</p>
                      <p className="text-[10px]">Conakry, Guinée</p>
                      <div className="h-px bg-black/20 w-full my-2" />
                      <p className="font-black uppercase">Ticket n° {selectedInvoice.invoice_number}</p>
                      <p className="text-[10px]">{new Date(selectedInvoice.date_issued).toLocaleDateString('fr-FR')} - {new Date().toLocaleTimeString('fr-FR')}</p>
                  </div>
                  
                  <div className="border-y border-dashed py-2">
                      <p className="uppercase font-bold">Client: {selectedInvoice.client_name}</p>
                  </div>

                  <div className="py-2 space-y-3">
                      {selectedInvoice.items?.map((item: InvoiceItem) => (
                          <div key={item.id} className="space-y-0.5">
                              <div className="flex justify-between font-black uppercase text-[11px]">
                                  <span>{item.product_name}</span>
                                  <span>{formatCurrency(item.total)}</span>
                              </div>
                              <div className="flex justify-between text-[10px] text-gray-600 italic">
                                  <span>{item.quantity} x {formatCurrency(item.unit_price)}</span>
                              </div>
                          </div>
                      ))}
                  </div>

                  <div className="border-t border-dashed pt-2 space-y-1 font-bold">
                      {Number(selectedInvoice.subtotal) > 0 && (
                        <div className="flex justify-between text-[11px]">
                            <span className="uppercase">Total HT</span>
                            <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                        </div>
                      )}
                      {Number(selectedInvoice.tax_amount) > 0 && (
                        <div className="flex justify-between text-[11px]">
                            <span className="uppercase">TVA {selectedInvoice.tax_rate}%</span>
                            <span>{formatCurrency(selectedInvoice.tax_amount)}</span>
                        </div>
                      )}
                      {Number(selectedInvoice.discount_amount) > 0 && (
                        <div className="flex justify-between text-gray-600">
                            <span>REMISE</span>
                            <span>- {formatCurrency(selectedInvoice.discount_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-base pt-2 border-t mt-2">
                          <span>TOTAL TTC</span>
                          <span>{formatCurrency(selectedInvoice.total_amount)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 border-t border-dashed mt-2 pt-2">
                          <span>PAYÉ</span>
                          <span>{formatCurrency(Number(selectedInvoice.total_amount) - Number(selectedInvoice.balance))}</span>
                      </div>
                      <div className="flex justify-between">
                          <span>SOLDE</span>
                          <span>{formatCurrency(selectedInvoice.balance)}</span>
                      </div>
                  </div>

                  <div className="text-center pt-8 space-y-1 border-t border-dashed mt-8">
                      <p className="font-black uppercase tracking-widest">Merci de votre visite !</p>
                      <p className="text-[10px]">A bientôt chez PGSTOCK</p>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onSuccess: () => void;
}

function PaymentDialog({ open, onOpenChange, invoice, onSuccess }: PaymentDialogProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset fields when invoice changes
  useMemo(() => {
    if (invoice) {
      setAmount(invoice.balance.toString());
      setNotes(`Paiement pour ${invoice.invoice_number}`);
    }
  }, [invoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || !amount) return;

    try {
      setIsSubmitting(true);
      await inventoryService.createPayment({
        invoice: invoice.id,
        amount: Number(amount),
        payment_date: date,
        payment_method: method,
        notes: notes,
        reference: `REMP-${invoice.invoice_number}-${new Date().getTime().toString().slice(-4)}`
      });
      toast.success("Paiement enregistré avec succès");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement du paiement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Enregistrer un paiement
          </DialogTitle>
          <DialogDescription>
            Facture {invoice?.invoice_number} - Solde dû: {invoice ? formatCurrency(invoice.balance) : ''}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Montant à payer</Label>
            <Input
              id="amount"
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="method">Mode de paiement</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                <SelectItem value="check">Chèque</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="card">Carte bancaire</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date du paiement</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes optionnelles..."
              rows={2}
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
              Confirmer le paiement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
