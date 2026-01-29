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
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import type { Invoice } from '@/types';
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
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [page] = useState(1);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', page, searchQuery, statusFilter],
    queryFn: () => inventoryService.getInvoices({ 
      page, 
      search: searchQuery || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      ordering: '-created_at'
    }),
  });

  const filteredInvoices = useMemo(() => {
    if (!invoices?.results) return [];
    let filtered = invoices.results;

    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter((invoice: Invoice) => {
        const invoiceDate = new Date(invoice.date_issued);
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

  const stats = useMemo(() => {
    if (!invoices?.results) return { total: 0, paid: 0, balance: 0 };
    const total = invoices.results.reduce((sum: number, inv: Invoice) => sum + Number(inv.total_amount), 0);
    const balance = invoices.results.reduce((sum: number, inv: Invoice) => sum + Number(inv.balance), 0);
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
      toast.info(`Téléchargement de la facture ${invoice.invoice_number}...`);
      await inventoryService.exportInvoicePdf(invoice.id, invoice.invoice_number);
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
      return inventoryService.deleteInvoice(id);
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Facturation</h2>
          <p className="text-muted-foreground">Gérez vos factures clients et suivez les paiements.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportExcel} disabled={isExporting !== null}>
            {isExporting === 'excel' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            Excel
          </Button>
          <Button variant="outline" onClick={handleExportPdf} disabled={isExporting !== null}>
            {isExporting === 'pdf' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            PDF
          </Button>
          <Button onClick={() => navigate('/invoices/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle Facture
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard label="Total Facturé" value={stats.total} icon={TrendingUp} color="blue" />
        <StatsCard label="Total Encaissé" value={stats.paid} icon={DollarSign} color="emerald" />
        <StatsCard label="Solde Dû" value={stats.balance} icon={AlertTriangle} color="rose" />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label="Tout" count={statusCounts.all} />
        <FilterButton active={statusFilter === 'paid'} onClick={() => setStatusFilter('paid')} label="Payé" count={statusCounts.paid} icon={CheckCircle2} />
        <FilterButton active={statusFilter === 'partial'} onClick={() => setStatusFilter('partial')} label="Partiel" count={statusCounts.partial} icon={Clock} />
        <FilterButton active={statusFilter === 'unpaid'} onClick={() => setStatusFilter('unpaid')} label="Impayé" count={statusCounts.unpaid} icon={AlertCircle} />
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-6">N° Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Solde</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filteredInvoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="pl-6 font-mono text-xs font-bold text-primary">{inv.invoice_number}</TableCell>
                  <TableCell className="font-bold">{inv.client_name}</TableCell>
                  <TableCell><StatusBadge status={inv.status} balance={Number(inv.balance)} total={Number(inv.total_amount)} /></TableCell>
                  <TableCell className="text-xs">{new Date(inv.date_issued).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right font-black">{formatCurrency(inv.total_amount)}</TableCell>
                  <TableCell className="text-right font-bold text-rose-50">{formatCurrency(inv.balance)}</TableCell>
                  <TableCell className="text-right pr-6">
                    <InvoiceActions 
                      invoice={inv} 
                      onView={() => navigate(`/invoices/${inv.id}`)} 
                      onEdit={() => navigate(`/invoices/${inv.id}/edit`)}
                      onDownload={() => handleDownloadPdf(inv)}
                      onPay={() => handleRecordPayment(inv)}
                      onDelete={() => handleDeleteInvoice(inv)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supprimer la facture</DialogTitle><DialogDescription>Action irréversible.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(selectedInvoice!.id)} disabled={deleteMutation.isPending}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentDialog open={showPaymentModal} onOpenChange={setShowPaymentModal} invoice={selectedInvoice} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })} />
    </div>
  );
}



function FilterButton({ active, onClick, label, count, icon: Icon }: { active: boolean, onClick: () => void, label: string, count: number, icon?: React.ElementType }) {
  return (
    <Button variant={active ? 'default' : 'outline'} onClick={onClick} className="whitespace-nowrap">
      {Icon && <Icon className="mr-2 h-4 w-4" />}{label}<Badge variant="secondary" className="ml-2">{count}</Badge>
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
        {Number(invoice.balance) > 0 && <DropdownMenuItem onClick={onPay}><DollarSign className="mr-2 h-4 w-4" />Payer</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
