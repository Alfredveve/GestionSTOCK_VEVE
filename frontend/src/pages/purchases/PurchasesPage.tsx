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
import { 
  Truck, 
  Search, 
  CheckCircle2, 
  Clock, 
  Plus,
  TrendingUp,
  Package,
  Eye,
  Edit,
  Printer,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileSpreadsheet,
  FileText,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import type { Receipt, ReceiptCreatePayload } from '@/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

const formatCurrency = (amount: string | number) => {
  return new Intl.NumberFormat('fr-GN', {
    maximumFractionDigits: 0
  }).format(Number(amount)) + ' GNF';
};

export function PurchasesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'received'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReceiptId, setEditingReceiptId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null);
  const queryClient = useQueryClient();

  // Form State
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedPOS, setSelectedPOS] = useState<string>('');
  const [receiptDate, setReceiptDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<{ productId: string; quantity: number; unitCost: number }[]>([]);

  const { data: receipts, isLoading, refetch } = useQuery({
    queryKey: ['receipts', page, searchQuery, statusFilter],
    queryFn: () => inventoryService.getReceipts({ 
      page, 
      search: searchQuery || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter
    }),
    placeholderData: (previousData) => previousData,
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => inventoryService.getSuppliers(),
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => inventoryService.getProducts({ page_size: 100 }),
  });

  const { data: pointsOfSale } = useQuery({
    queryKey: ['points-of-sale'],
    queryFn: () => inventoryService.getPointsOfSale(),
  });

  const createMutation = useMutation({
    mutationFn: (data: ReceiptCreatePayload) => inventoryService.createReceipt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast.success('Le bon de réception a été créé avec succès.');
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Erreur lors de la création du bon : ' + (error.response?.data?.error || error.message));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ReceiptCreatePayload> }) => inventoryService.updateReceipt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast.success('Le bon de réception a été mis à jour avec succès.');
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Erreur lors de la mise à jour du bon : ' + (error.response?.data?.error || error.message));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryService.deleteReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast.success('Le bon de réception a été supprimé avec succès.');
      setIsDeleteModalOpen(false);
      setReceiptToDelete(null);
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Erreur lors de la suppression du bon : ' + (error.response?.data?.error || error.message));
    }
  });

  const resetForm = () => {
    setEditingReceiptId(null);
    setSelectedSupplier('');
    setSelectedPOS('');
    setReceiptDate(new Date().toISOString().split('T')[0]);
    setReference('');
    setNotes('');
    setItems([]);
  };

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, unitCost: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleEdit = async (receipt: Receipt) => {
    try {
      const fullReceipt = await inventoryService.getReceipt(receipt.id);
      setEditingReceiptId(receipt.id);
      setSelectedSupplier(fullReceipt.supplier.toString());
      setSelectedPOS(fullReceipt.point_of_sale?.toString() || '');
      setReceiptDate(fullReceipt.date_received);
      setReference(fullReceipt.supplier_reference || '');
      setNotes(fullReceipt.notes || '');
      
      if (fullReceipt.items) {
          setItems(fullReceipt.items.map(item => ({
            productId: item.product.toString(),
            quantity: item.quantity,
            unitCost: Number(item.unit_cost)
          })));
      } else {
          setItems([]);
      }
      
      setIsModalOpen(true);
    } catch {
      toast.error("Impossible de charger les détails du bon");
    }
  };

  const promptDelete = (receipt: Receipt) => {
    setReceiptToDelete(receipt);
    setIsDeleteModalOpen(true);
  };
   
  const handleDeleteConfirm = () => {
    if (receiptToDelete) {
      deleteMutation.mutate(receiptToDelete.id);
    }
  };

  const handleSubmit = () => {
    if (!selectedSupplier || !selectedPOS || items.length === 0) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const payload: ReceiptCreatePayload = {
      supplier: parseInt(selectedSupplier),
      point_of_sale: parseInt(selectedPOS),
      date_received: receiptDate,
      reference: reference,
      notes: notes,
      status: 'received',
      items: items.map(item => ({
        product: parseInt(item.productId),
        quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity,
        unit_cost: typeof item.unitCost === 'string' ? parseFloat(item.unitCost) : item.unitCost,
        is_wholesale: true
      }))
    };

    if (editingReceiptId) {
      updateMutation.mutate({ id: editingReceiptId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (status: 'all' | 'pending' | 'received') => {
    setStatusFilter(status);
    setPage(1);
  };

  const totalAmount = receipts?.results?.reduce((acc: number, r: Receipt) => acc + Number(r.total_amount), 0) || 0;
  const pendingCount = receipts?.results?.filter((r: Receipt) => r.status === 'pending').length || 0;
  const receivedCount = receipts?.results?.filter((r: Receipt) => r.status === 'received').length || 0;

  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);

  const handleExportExcel = async () => {
    try {
      setIsExporting('excel');
      await inventoryService.exportReceiptsExcel();
      toast.success("Registre des achats exporté (Excel)");
    } catch {
      toast.error("Erreur lors de l'exportation Excel");
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting('pdf');
      await inventoryService.exportReceiptsPdf();
      toast.success("Journal des achats exporté (PDF)");
    } catch {
      toast.error("Erreur lors de l'exportation PDF");
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-4 md:p-8 space-y-8 pb-20 rounded-2xl border border-white/5 shadow-2xl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-linear-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 text-white">
              <Truck className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Achats & Réceptions</h1>
          </div>
          <p className="text-white/60 ml-1">
            Gérez vos commandes fournisseurs et suivez les réceptions de marchandises en temps réel.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 bg-white/5 border-white/10 text-white hover:bg-white/10" 
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>

          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportExcel}
              disabled={isExporting !== null}
              className="h-10 bg-white/5 border-white/10 text-white/70 hover:text-white"
            >
              {isExporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportPdf}
              disabled={isExporting !== null}
              className="h-10 bg-white/5 border-white/10 text-white/70 hover:text-white"
            >
              {isExporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            </Button>
          </div>

          <Button className="h-10 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 font-bold px-6" onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-5 w-5" />
            Nouveau Bon
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-linear-to-br from-gray-900 to-gray-800 border-white/5 shadow-xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/60">Total Achats (Mois)</p>
                <div className="text-3xl font-bold text-white mt-1">{formatCurrency(totalAmount)}</div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-linear-to-br from-gray-900 to-gray-800 border-white/5 shadow-xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/60">En Attente</p>
                <div className="text-3xl font-bold text-amber-500 mt-1">{pendingCount} Bons</div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-linear-to-br from-gray-900 to-gray-800 border-white/5 shadow-xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/60">Commandes Reçues</p>
                <div className="text-3xl font-bold text-emerald-500 mt-1">{receivedCount} Bons</div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2 bg-black/20 p-1 rounded-xl border border-white/10 self-start sm:self-center">
            <button 
              onClick={() => handleStatusFilterChange('all')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                statusFilter === 'all' ? "bg-white/10 text-white shadow-lg" : "text-white/60 hover:text-white"
              )}
            >
              Tous les bons
            </button>
            <button 
              onClick={() => handleStatusFilterChange('pending')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2",
                statusFilter === 'pending' ? "bg-amber-600 text-white shadow-lg shadow-amber-500/25" : "text-white/60 hover:text-white"
              )}
            >
              <Clock className="h-3 w-3" /> En attente
            </button>
            <button 
              onClick={() => handleStatusFilterChange('received')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2",
                statusFilter === 'received' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25" : "text-white/60 hover:text-white"
              )}
            >
              <CheckCircle2 className="h-3 w-3" /> Reçus
            </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input 
            placeholder="Référence ou fournisseur..." 
            className="w-full flex h-11 pl-10 bg-black/20 border border-white/10 text-white placeholder:text-white/30 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all px-3 py-2 text-sm"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Table Section */}
      <Card className="border-white/10 bg-linear-to-b from-gray-900/90 to-black/90 backdrop-blur-2xl shadow-2xl overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/5 border-b border-white/5">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="pl-6 py-5 text-[11px] font-bold uppercase tracking-widest text-white/70">N° Bon</TableHead>
                <TableHead className="py-5 text-[11px] font-bold uppercase tracking-widest text-white/70">Fournisseur</TableHead>
                <TableHead className="py-5 text-[11px] font-bold uppercase tracking-widest text-white/70">Statut</TableHead>
                <TableHead className="py-5 text-[11px] font-bold uppercase tracking-widest text-white/70">Date de réception</TableHead>
                <TableHead className="py-5 text-right text-[11px] font-bold uppercase tracking-widest text-white/70">Total HT</TableHead>
                <TableHead className="py-5 pr-6 text-right text-[11px] font-bold uppercase tracking-widest text-white/70">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-white/5">
                    <TableCell className="pl-6"><div className="h-4 w-28 bg-white/5 animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-40 bg-white/5 animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-6 w-20 bg-white/5 animate-pulse rounded-lg" /></TableCell>
                    <TableCell><div className="h-4 w-24 bg-white/5 animate-pulse rounded" /></TableCell>
                    <TableCell className="text-right"><div className="h-4 w-24 bg-white/5 animate-pulse rounded ml-auto" /></TableCell>
                    <TableCell className="pr-6 text-right"><div className="h-8 w-8 bg-white/5 animate-pulse rounded ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : receipts?.results?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center border-none">
                    <div className="flex flex-col items-center justify-center text-white/40">
                      <Package className="h-16 w-16 mb-4 stroke-1" />
                      <p className="text-xl font-bold text-white">Aucun bon trouvé</p>
                      <p className="text-sm">Essayez de modifier vos critères de recherche.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence mode="popLayout">
                  {receipts?.results?.map((receipt: Receipt, index: number) => (
                    <motion.tr 
                      key={receipt.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group border-b border-white/5 hover:bg-white/2 transition-colors"
                    >
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase">
                            {receipt.receipt_number}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 font-semibold text-white">
                        {receipt.supplier_name}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className={`gap-1.5 pl-1.5 pr-2.5 py-1 text-[10px] uppercase tracking-wider font-bold border ${
                          receipt.status === 'received' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`} variant="outline">
                          {receipt.status === 'received' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {receipt.status === 'received' ? 'Reçu' : 'En attente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2 text-white/70 text-sm">
                          <Calendar className="h-3.5 w-3.5 opacity-50" />
                          {new Date(receipt.date_received).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4 font-mono font-bold text-sm text-white">
                        {formatCurrency(receipt.total_amount)}
                      </TableCell>
                      <TableCell className="pr-6 text-right py-4">
                        <div className="flex items-center justify-end gap-2">
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             title="Voir les détails"
                             className="h-9 w-9 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all scale-90 group-hover:scale-100"
                           >
                             <Eye className="h-4.5 w-4.5" />
                           </Button>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             title="Modifier"
                             onClick={() => handleEdit(receipt)}
                             disabled={receipt.status !== 'pending'}
                             className="h-9 w-9 rounded-lg hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 transition-all scale-90 group-hover:scale-100 disabled:opacity-30 disabled:cursor-not-allowed"
                           >
                             <Edit className="h-4.5 w-4.5" />
                           </Button>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             title="Supprimer"
                             onClick={() => promptDelete(receipt)}
                             disabled={receipt.status !== 'pending'}
                             className="h-9 w-9 rounded-lg hover:bg-rose-600/20 text-rose-400 hover:text-rose-300 transition-all scale-90 group-hover:scale-100 disabled:opacity-30 disabled:cursor-not-allowed"
                           >
                             <Trash2 className="h-4.5 w-4.5" />
                           </Button>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             title="Imprimer"
                             className="h-9 w-9 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all scale-90 group-hover:scale-100"
                           >
                             <Printer className="h-4.5 w-4.5" />
                           </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>

          {/* Pagination Section */}
          {receipts?.count && receipts.count > 10 && (
            <div className="flex items-center justify-between px-6 py-5 border-t border-white/5 bg-white/1">
              <div className="text-sm text-white/40 font-medium">
                Affichage de <span className="text-white">{Math.min(receipts.count, (page - 1) * 10 + 1)}</span> à <span className="text-white">{Math.min(receipts.count, page * 10)}</span> sur <span className="text-white">{receipts.count}</span> résultats
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === 1}
                  onClick={() => setPage(prev => prev - 1)}
                  className="h-10 w-10 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-20 transition-all rounded-xl"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </Button>
                <div className="flex items-center justify-center h-10 min-w-[40px] px-3 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20">
                  {page}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!receipts?.next}
                  onClick={() => setPage(prev => prev + 1)}
                  className="h-10 w-10 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-20 transition-all rounded-xl"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* NEW RECEIPT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-white/10 text-white p-0 rounded-2xl">
          <DialogHeader className="p-6 border-b border-white/5 bg-white/2">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="bg-blue-500/10 p-2 rounded-lg">
                <Plus className="h-5 w-5 text-blue-400" />
              </div>
              {editingReceiptId ? 'Modifier le Bon de Réception' : 'Nouveau Bon de Réception'}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {/* General Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/60">Fournisseur <span className="text-rose-500">*</span></Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
                    <SelectValue placeholder="Choisir un fournisseur" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-white/10 text-white">
                    {suppliers?.results?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white/60">Point de Vente (Réception) <span className="text-rose-500">*</span></Label>
                <Select value={selectedPOS} onValueChange={setSelectedPOS}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
                    <SelectValue placeholder="Choisir un magasin" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-white/10 text-white">
                    {pointsOfSale?.results?.map((pos: any) => (
                      <SelectItem key={pos.id} value={pos.id.toString()}>{pos.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white/60">Date de Réception</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="date"
                    id="receiptDate"
                    value={receiptDate}
                    aria-label="Date de réception"
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full pl-10 h-11 bg-white/5 border border-white/10 text-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/60">Référence Externe</Label>
                <input
                  type="text"
                  placeholder="N° BL fournisseur..."
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 h-11 bg-white/5 border border-white/10 text-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Package className="h-5 w-5 text-indigo-400" />
                  Articles reçus
                </h3>
                <Button 
                  onClick={handleAddItem}
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un produit
                </Button>
              </div>

              <div className="overflow-hidden border border-white/5 rounded-xl">
                <Table>
                  <TableHeader className="bg-white/2">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-white/40">Produit</TableHead>
                      <TableHead className="text-white/40 w-32 text-center">Quantité</TableHead>
                      <TableHead className="text-white/40 w-44 text-right">Coût Unitaire (HT)</TableHead>
                      <TableHead className="text-white/40 w-44 text-right">Total HT</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow className="border-none">
                        <TableCell colSpan={5} className="h-32 text-center text-white/20">
                          Aucun produit ajouté. Cliquez sur "Ajouter un produit".
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => (
                        <TableRow key={index} className="border-white/5 hover:bg-white/1 group">
                          <TableCell className="py-3">
                            <Select 
                              value={item.productId} 
                              onValueChange={(val) => handleUpdateItem(index, 'productId', val)}
                            >
                              <SelectTrigger className="bg-transparent border-white/10 h-10">
                                <SelectValue placeholder="Rechercher..." />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 border-white/10 text-white">
                                {products?.results?.map((p: any) => (
                                  <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.sku})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="py-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              aria-label="Quantité"
                              placeholder="Qté"
                              onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                              className="w-full h-10 bg-white/5 border border-white/10 text-white text-center rounded-md outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </TableCell>
                          <TableCell className="py-3">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitCost}
                              aria-label="Coût unitaire"
                              placeholder="P.U."
                              onChange={(e) => handleUpdateItem(index, 'unitCost', e.target.value)}
                              className="w-full h-10 bg-white/5 border border-white/10 text-white text-right pr-3 rounded-md outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </TableCell>
                          <TableCell className="py-3 text-right font-bold text-white pr-4">
                            {formatCurrency(item.quantity * item.unitCost)}
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <Button 
                              onClick={() => handleRemoveItem(index)}
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-white/20 hover:text-rose-500 hover:bg-rose-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-white/5">
                <Label className="text-white/60">Notes / Commentaires</Label>
                <textarea
                  rows={3}
                  placeholder="Détails supplémentaires..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 bg-white/5 border border-white/10 text-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>
          </div>

          <DialogFooter className="p-6 border-t border-white/5 bg-white/2 gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsModalOpen(false)}
              className="bg-transparent border-white/10 text-white hover:bg-white/5"
            >
              Annuler
            </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 font-bold shadow-lg shadow-blue-500/20"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {editingReceiptId ? 'Mise à jour...' : 'Création...'}
                  </div>
                ) : (editingReceiptId ? 'Mettre à jour' : 'Valider la Réception')}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-gray-900 border-white/10 text-white p-0 rounded-2xl max-w-md">
          <DialogHeader className="p-6 border-b border-white/5 bg-white/2">
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <div className="bg-rose-500/10 p-2 rounded-lg">
                <Trash2 className="h-5 w-5 text-rose-500" />
              </div>
              Confirmer la suppression
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <p className="text-white/70">
              Êtes-vous sûr de vouloir supprimer le bon n° <span className="font-bold text-white">{receiptToDelete?.receipt_number}</span> ?
              <br/><br/>
              Cette action est irréversible et supprimera toutes les lignes associées.
            </p>
          </div>
          <DialogFooter className="p-6 border-t border-white/5 bg-white/2 gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteModalOpen(false)}
              className="bg-transparent border-white/10 text-white hover:bg-white/5"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-500/20"
            >
               {deleteMutation.isPending ? 'Suppression...' : 'Supprimer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
