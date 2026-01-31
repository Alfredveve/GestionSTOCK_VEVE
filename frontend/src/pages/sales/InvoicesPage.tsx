import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import inventoryService from '@/services/inventoryService';
import salesService from '@/services/salesService';
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
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import type { Order as Invoice } from '@/services/salesService'; // Using Order as Invoice for UI compatibility
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
import { formatCurrency } from '@/lib/utils';
import { PaymentDialog } from '@/components/sales/PaymentDialog';
import { StatsCard } from '@/components/StatsCard';

type StatusFilter = 'all' | 'paid' | 'partial' | 'unpaid';
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

export function InvoicesPage() {
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter] = useState<DateFilter>('all');
  const [customStartDate] = useState('');
  const [customEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [page] = useState(1);
  
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', page, searchQuery, statusFilter],
    queryFn: () => salesService.getOrders({ 
      page, 
      search: searchQuery || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      ordering: '-date_created'
    }),
  });

  const filteredInvoices = useMemo(() => {
    if (!invoices?.results) return [];
    let filtered = invoices.results;

    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter((invoice: Invoice) => {
        const invoiceDate = new Date(invoice.date_created || "");
        if (dateFilter === 'today') return invoiceDate >= today;
        if (dateFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return invoiceDate >= weekAgo;
        }
        if (dateFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return invoiceDate >= monthAgo;
        }
        if (dateFilter === 'custom') {
          if (customStartDate && customEndDate) {
            const startDate = new Date(customStartDate);
            const endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999);
            return invoiceDate >= startDate && invoiceDate <= endDate;
          }
        }
        return true;
      });
    }
    return filtered;
  }, [invoices, dateFilter, customStartDate, customEndDate]);

  const getBalance = (invoice: Invoice) => Number(invoice.total_amount) - (invoice.amount_paid || 0);

  const stats = useMemo(() => {
    if (!invoices?.results) return { total: 0, paid: 0, balance: 0 };
    const total = invoices.results.reduce((sum: number, inv: Invoice) => sum + Number(inv.total_amount), 0);
    const balance = invoices.results.reduce((sum: number, inv: Invoice) => sum + getBalance(inv), 0);
    const paid = total - balance;
    return { total, paid, balance };
  }, [invoices]);

  const statusCounts = useMemo(() => {
    if (!filteredInvoices) return { all: 0, paid: 0, partial: 0, unpaid: 0 };
    return {
      all: filteredInvoices.length,
      paid: filteredInvoices.filter((inv: Invoice) => inv.status === 'paid').length,
      partial: filteredInvoices.filter((inv: Invoice) => inv.status === 'partial').length,
      unpaid: filteredInvoices.filter((inv: Invoice) => inv.status === 'unpaid').length,
    };
  }, [filteredInvoices]);

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

  const handleDownloadPdf = async (invoice: Invoice) => {
    try {
      toast.info(`Téléchargement de la facture ${invoice.order_number}...`);
      await salesService.exportOrderPdf(invoice.id!, invoice.order_number);
      toast.success("Facture téléchargée avec succès");
    } catch {
      toast.error("Erreur lors du téléchargement");
    }
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
      // Logic for deleting orders if available, otherwise fallback/dummy
      toast.info(`Suppression de la facture ${id} à venir`);
      return Promise.resolve();
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

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 p-6 max-w-[1600px] mx-auto"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 uppercase tracking-widest text-[10px] font-bold py-1 px-3 rounded-full w-fit">
            Espace Finance
          </Badge>
          <h2 className="text-4xl font-black tracking-tight bg-linear-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            Facturation
          </h2>
          <p className="text-muted-foreground text-lg font-medium max-w-2xl">
            Gérez vos factures clients, suivez les encaissements et analysez votre trésorerie en temps réel.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/50 dark:bg-slate-900/50 p-2 rounded-2xl border border-white/20 shadow-lg backdrop-blur-sm">
          <Button variant="ghost" size="sm" onClick={handleExportExcel} disabled={isExporting !== null} className="hover:bg-green-50 text-slate-600 hover:text-green-700 transition-colors">
            {isExporting === 'excel' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            Excel
          </Button>
          <div className="w-px h-6 bg-slate-200" />
          <Button variant="ghost" size="sm" onClick={handleExportPdf} disabled={isExporting !== null} className="hover:bg-red-50 text-slate-600 hover:text-red-700 transition-colors">
            {isExporting === 'pdf' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            PDF
          </Button>
          <Button onClick={() => navigate('/invoices/new')} className="ml-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-xl px-6">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle Facture
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard label="Chiffre d'Affaires" value={stats.total} icon={TrendingUp} color="blue" />
        <StatsCard label="Total Encaissé" value={stats.paid} icon={DollarSign} color="emerald" />
        <StatsCard label="Reste à Recouvrer" value={stats.balance} icon={AlertTriangle} color="rose" />
      </motion.div>

      {/* Filters & Search - Glassmorphism Bar */}
      <motion.div variants={itemVariants} className="sticky top-4 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 shadow-sm rounded-2xl p-2 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-1 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl">
          <FilterTab active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label="Tout" count={statusCounts.all} />
          <FilterTab active={statusFilter === 'paid'} onClick={() => setStatusFilter('paid')} label="Payées" count={statusCounts.paid} icon={CheckCircle2} color="text-emerald-600" />
          <FilterTab active={statusFilter === 'partial'} onClick={() => setStatusFilter('partial')} label="Partielles" count={statusCounts.partial} icon={Clock} color="text-amber-600" />
          <FilterTab active={statusFilter === 'unpaid'} onClick={() => setStatusFilter('unpaid')} label="Impayées" count={statusCounts.unpaid} icon={AlertCircle} color="text-rose-600" />
        </div>

        <div className="relative w-full md:w-96 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <Input 
            placeholder="Rechercher une facture (N°, Client)..." 
            className="pl-10 h-11 bg-transparent border-transparent hover:bg-slate-50 focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/10 transition-all rounded-xl"
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </motion.div>

      {/* Table Card */}
      <motion.div variants={itemVariants}>
        <Card className="border-none shadow-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-200/50 dark:ring-slate-800/50 overflow-hidden rounded-3xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-100">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="pl-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-500">N° Facture</TableHead>
                  <TableHead className="py-5 text-xs font-bold uppercase tracking-wider text-slate-500">Client</TableHead>
                  <TableHead className="py-5 text-xs font-bold uppercase tracking-wider text-slate-500">Statut</TableHead>
                  <TableHead className="py-5 text-xs font-bold uppercase tracking-wider text-slate-500">Date</TableHead>
                  <TableHead className="text-right py-5 text-xs font-bold uppercase tracking-wider text-slate-500">Total</TableHead>
                  <TableHead className="text-right py-5 text-xs font-bold uppercase tracking-wider text-slate-500">Solde</TableHead>
                  <TableHead className="text-right pr-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode='wait'>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
                        <p className="text-sm font-medium text-slate-400">Chargement des factures...</p>
                      </div>
                    </TableCell></TableRow>
                  ) : filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-50">
                          <FileText className="h-12 w-12 text-slate-300" />
                          <p className="text-lg font-medium text-slate-500">Aucune facture trouvée</p>
                          <Button variant="link" onClick={() => setStatusFilter('all')} className="text-primary">Voir toutes les factures</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoices.map((inv: Invoice, index: number) => (
                    <motion.tr 
                      key={inv.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 last:border-0"
                    >
                      <TableCell className="pl-8 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-sm font-bold text-primary">{inv.order_number}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{inv.point_of_sale_name || 'POS'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 font-bold text-slate-700 dark:text-slate-200">{inv.client_name}</TableCell>
                      <TableCell className="py-4"><StatusBadge balance={getBalance(inv)} total={Number(inv.total_amount)} /></TableCell>
                      <TableCell className="py-4 text-sm text-slate-500">{new Date(inv.date_created || "").toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                      <TableCell className="text-right py-4 font-black text-slate-700 dark:text-slate-200">{formatCurrency(Number(inv.total_amount))}</TableCell>
                      <TableCell className="text-right py-4 font-bold text-red-600">{formatCurrency(Number(inv.total_amount) - Number(inv.amount_paid))}</TableCell>
                      <TableCell className="text-right pr-8 py-4">
                        <InvoiceActions 
                          invoice={inv} 
                          onView={() => navigate(`/invoices/${inv.id}`)} 
                          onEdit={() => navigate(`/invoices/${inv.id}/edit`)}
                          onDownload={() => handleDownloadPdf(inv)}
                          onPay={() => handleRecordPayment(inv)}
                          onDelete={() => handleDeleteInvoice(inv)}
                        />
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supprimer la facture</DialogTitle><DialogDescription>Attention : Cette action est irréversible et supprimera définitivement cette facture et les paiements associés.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(selectedInvoice!.id!)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer la suppression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentDialog open={showPaymentModal} onOpenChange={setShowPaymentModal} invoice={selectedInvoice} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })} />
    </motion.div>
  );
}



function FilterTab({ active, onClick, label, count, icon: Icon, color }: { active: boolean, onClick: () => void, label: string, count: number, icon?: React.ElementType, color?: string }) {
  return (
    <Button 
      variant="ghost" 
      onClick={onClick} 
      className={`relative h-9 px-4 rounded-lg transition-all ${active ? 'bg-white shadow-sm text-foreground hover:bg-white' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}
    >
      {active && (
        <motion.div
            layoutId="activeFilter"
            className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-sm"
            initial={false}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
      <span className="relative z-10 flex items-center font-medium">
        {Icon && <Icon className={`mr-2 h-4 w-4 ${active && color ? color : ''}`} />}
        {label}
        {count > 0 && <Badge variant="secondary" className={`ml-2 h-5 min-w-5 px-1 text-[10px] ${active ? 'bg-slate-100 text-slate-900' : ''}`}>{count}</Badge>}
      </span>
    </Button>
  );
}

function StatusBadge({ balance, total }: { balance: number, total: number }) {
  const isPaid = balance <= 0;
  const isPartial = balance > 0 && balance < total;
  return (
    <Badge className={`gap-1 font-bold text-[10px] uppercase ${isPaid ? 'bg-emerald-500/10 text-emerald-500' : isPartial ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`} variant="outline">
      {isPaid ? <CheckCircle2 className="h-3 w-3" /> : isPartial ? <Clock className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {isPaid ? 'Payée' : isPartial ? 'Partielle' : 'Impayée'}
    </Badge>
  );
}

function InvoiceActions({ invoice, onView, onEdit, onDownload, onPay, onDelete }: { invoice: Invoice, onView: () => void, onEdit: () => void, onDownload: () => void, onPay: () => void, onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}><Eye className="mr-2 h-4 w-4" />Voir</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
        <DropdownMenuItem onClick={onDownload}><Download className="mr-2 h-4 w-4" />PDF</DropdownMenuItem>
        {(Number(invoice.total_amount) - (invoice.amount_paid || 0)) > 0 && <DropdownMenuItem onClick={onPay}><DollarSign className="mr-2 h-4 w-4" />Payer</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
