import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import salesService from '@/services/salesService';
import type { OrderItem } from '@/services/salesService';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    ArrowLeft,
    Printer,
    Download,
    User,
    Calendar,
    Activity,
    Loader2,
    FileText,
    CheckCircle2,
    Truck,
    FileOutput,
    Package,
    ShieldCheck,
    CreditCard,
    ChevronRight,
    Hash
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
};

export function OrderDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: order, isLoading, error } = useQuery({
        queryKey: ['order', id],
        queryFn: () => salesService.getOrder(Number(id)),
        enabled: !!id
    });

    const updateStatusMutation = useMutation({
        mutationFn: (status: string) => salesService.updateOrder(Number(id), { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['order', id] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success("Statut de la commande mis à jour");
        },
        onError: () => {
            toast.error("Erreur lors de la mise à jour du statut");
        }
    });

    const handlePrint = () => {
        if (!order) return;
        document.body.classList.add('printing-order');
        window.print();
        setTimeout(() => {
            document.body.classList.remove('printing-order');
        }, 500);
    };

    const handleDownloadPdf = async () => {
        if (!order) return;
        try {
            toast.info("Génération du PDF...");
            await salesService.exportOrderPdf(order.id, order.order_number);
            toast.success("PDF téléchargé");
        } catch {
            toast.error("Erreur lors de l'export PDF");
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
                    <p className="text-sm font-bold text-muted-foreground animate-pulse tracking-widest uppercase">Chargement de la commande...</p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-6">
                <div className="h-24 w-24 rounded-full bg-destructive/5 flex items-center justify-center ring-1 ring-destructive/10">
                    <FileText className="h-12 w-12 text-destructive/50" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-black tracking-tight">Commande introuvable</h2>
                    <p className="text-muted-foreground font-medium mt-1">La commande que vous recherchez n'existe pas ou a été supprimée.</p>
                </div>
                <Button onClick={() => navigate('/quotes')} className="rounded-2xl h-12 px-8 font-bold shadow-xl shadow-primary/20">
                    Retour aux commandes
                </Button>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
            case 'validated':
            case 'delivered':
            case 'paid': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'cancelled': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
            default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
        }
    };

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-8 pb-12"
        >
            {/* NEW Header: Sophisticated and Glassy */}
            <div className="relative overflow-hidden no-print">
                <div className="absolute inset-0 bg-linear-to-r from-primary/10 via-transparent to-transparent opacity-50" />
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/60 backdrop-blur-xl p-8 rounded-4xl shadow-2xl shadow-slate-200/50 border border-white/20">
                    <div className="flex items-start gap-5">
                        <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigate('/quotes')}
                            className="mt-1 h-12 w-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-600" />
                        </motion.button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">Commande</h1>
                                <Badge className={`px-3 py-1 font-black text-[10px] uppercase tracking-wider rounded-lg border-none ${getStatusColor(order.status)}`}>
                                    {order.status === 'pending' ? 'En attente' : 
                                     order.status === 'validated' ? 'Validée' : 
                                     order.status === 'delivered' ? 'Livrée' : 
                                     order.status === 'paid' ? 'Payée' :
                                     order.status === 'cancelled' ? 'Annulée' : order.status}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="bg-primary/10 text-primary p-1 rounded-md">
                                    <Hash className="h-3 w-3" />
                                </span>
                                <p className="text-sm font-black text-slate-400 tracking-widest">{order.order_number}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="outline" onClick={handlePrint}
                            className="rounded-2xl font-black text-xs h-12 border-slate-200 glass-bg hover:bg-white px-6">
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimer
                        </Button>
                        <Button variant="outline" onClick={handleDownloadPdf}
                            className="rounded-2xl font-black text-xs h-12 border-slate-200 glass-bg hover:bg-white px-6">
                            <Download className="mr-2 h-4 w-4" />
                            PDF
                        </Button>
                        
                        {order.status === 'pending' && (
                            <Button 
                                onClick={() => updateStatusMutation.mutate('validated')}
                                disabled={updateStatusMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs h-12 shadow-xl shadow-emerald-200/50 px-8"
                            >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Valider la Commande
                            </Button>
                        )}

                        {(order.status === 'validated') && (
                            <Button 
                                onClick={() => updateStatusMutation.mutate('delivered')}
                                disabled={updateStatusMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs h-12 shadow-xl shadow-blue-200/50 px-8"
                            >
                                <Truck className="mr-2 h-4 w-4" />
                                Confirmer Livraison
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-8">
                    {/* Top Stats Band */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
                        <div className="bg-white/80 backdrop-blur-md rounded-4xl p-6 border border-white shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <User className="h-6 w-6" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Client</p>
                                    <p className="text-sm font-black text-slate-900 truncate">{order.client_name}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/80 backdrop-blur-md rounded-4xl p-6 border border-white shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <Calendar className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Date</p>
                                    <p className="text-sm font-black text-slate-900">
                                        {new Date(order.date_created).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/80 backdrop-blur-md rounded-4xl p-6 border border-white shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                    <CreditCard className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Paiement</p>
                                    <p className="text-sm font-black text-slate-900 uppercase">{order.payment_method || '---'}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Table Section: Re-imagined */}
                    <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-md rounded-4xl border border-white shadow-xl shadow-slate-200/30 overflow-hidden no-print">
                        <div className="p-8 flex items-center justify-between border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center">
                                    <Package className="h-4 w-4" />
                                </div>
                                <h3 className="text-xl font-black tracking-tight text-slate-900 underline decoration-primary/30 decoration-4 underline-offset-4">Articles Commandés</h3>
                            </div>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full">
                                {order.items?.length || 0} référence(s)
                            </Badge>
                        </div>
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="pl-10 h-16 text-[11px] uppercase font-black tracking-[0.15em] text-slate-400">Désignation Produit</TableHead>
                                    <TableHead className="h-16 text-[11px] uppercase font-black tracking-[0.15em] text-slate-400 text-center">Quantité</TableHead>
                                    <TableHead className="h-16 text-[11px] uppercase font-black tracking-[0.15em] text-slate-400 text-right">Prix Unitaire</TableHead>
                                    <TableHead className="pr-10 h-16 text-[11px] uppercase font-black tracking-[0.15em] text-slate-400 text-right">Montant Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {order.items?.map((item: OrderItem, index: number) => (
                                    <TableRow key={item.id} className="group border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="pl-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-base group-hover:text-primary transition-colors leading-none mb-1">{item.product_name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ref: PROD-{item.product}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center h-8 px-4 rounded-lg bg-slate-100 font-black text-slate-700">
                                                {item.quantity}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-600">
                                            {formatCurrency(item.unit_price)}
                                        </TableCell>
                                        <TableCell className="pr-10 text-right">
                                            <span className="text-lg font-black text-slate-900">{formatCurrency(item.total_price || 0)}</span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </motion.div>
                </div>

                {/* Right Panel: Side Stats */}
                <div className="lg:col-span-4 space-y-8 no-print">
                    {/* Financial Summary card */}
                    <motion.div variants={itemVariants} className="bg-slate-900 rounded-4xl p-8 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:scale-150 transition-transform duration-700">
                            <ShieldCheck className="h-32 w-32" />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 relative">Résumé de Facturation</h3>
                        
                        <div className="space-y-5 relative">
                            <div className="flex justify-between items-center text-sm font-medium text-slate-300">
                                <span>Sous-total HT</span>
                                <span>{formatCurrency(order.subtotal || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-medium text-slate-300">
                                <span>TVA (GND - 18%)</span>
                                <span>{formatCurrency(order.tax_amount || 0)}</span>
                            </div>
                            
                            <div className="pt-4 border-t border-white/10">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total TTC</span>
                                    <span className="text-4xl font-black tracking-tighter text-white">{formatCurrency(order.total_amount || 0)}</span>
                                </div>
                            </div>

                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                                className="flex justify-between items-center p-5 bg-white/5 rounded-3xl border border-white/10 group-hover:bg-white/10 transition-colors"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Déjà réglé</span>
                                    <span className="text-2xl font-black text-white">{formatCurrency(order.amount_paid || 0)}</span>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                            </motion.div>

                            {order.total_amount - order.amount_paid > 0 && (
                                <div className="flex justify-between items-center p-5 bg-rose-500/10 rounded-3xl border border-rose-500/20">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Reste à payer</span>
                                        <span className="text-xl font-black text-white">{formatCurrency(order.total_amount - order.amount_paid)}</span>
                                    </div>
                                    <Activity className="h-5 w-5 text-rose-500" />
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Exporters and quick actions */}
                    <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-md rounded-4xl p-8 border border-white shadow-xl shadow-slate-200/30">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-6 font-primary">Actions & Export</h3>
                        <div className="space-y-4">
                            <motion.button 
                                whileHover={{ scale: 1.02, backgroundColor: '#f1f5f9' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => salesService.exportOrdersExcel()}
                                className="w-full flex items-center justify-between p-4 rounded-3xl bg-slate-50 border border-slate-100 transition-shadow"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                        <FileOutput className="h-5 w-5" />
                                    </div>
                                    <span className="font-black text-slate-900 text-sm">Feuille Excel</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-300" />
                            </motion.button>

                            <motion.button 
                                whileHover={{ scale: 1.02, backgroundColor: '#fdf2f2' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleDownloadPdf}
                                className="w-full flex items-center justify-between p-4 rounded-3xl bg-slate-50 border border-slate-100 transition-shadow"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                                        <Download className="h-5 w-5" />
                                    </div>
                                    <span className="font-black text-slate-900 text-sm">Archivage PDF</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-300" />
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Notes logic */}
                    {order.notes && (
                      <motion.div variants={itemVariants} className="bg-amber-50 rounded-4xl p-8 border border-amber-100 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 text-amber-500/10 -rotate-12 translate-x-4 -translate-y-4">
                              <FileText className="h-24 w-24" />
                          </div>
                          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600 mb-4">Notes d'instruction</h3>
                          <p className="text-sm text-slate-700 leading-relaxed font-medium relative italic">"{order.notes}"</p>
                      </motion.div>
                    )}
                </div>
            </div>

            {/* Printable Structure - REDESIGNED with even better centering */}
            <div id="print-order" className="print-only hidden p-16 px-32 bg-white text-slate-900 min-h-screen font-sans">
                {/* Header with Color Accents */}
                <div className="flex justify-between items-start mb-12">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                            <Package className="h-10 w-10" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">Gestion Stock</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Intelligence Logistique</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h1 className="text-5xl font-black text-slate-100 uppercase tracking-tighter mb-1 absolute top-12 right-12 opacity-50">COMMANDE</h1>
                        <div className="mt-4">
                            <p className="text-sm font-black text-slate-900 tracking-widest">{order.order_number}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Généré le {new Date().toLocaleDateString('fr-FR')}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-16 mb-12 pt-4 border-t border-slate-100">
                    <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Détails du Client</p>
                        <div className="space-y-1">
                            <p className="text-xl font-black text-slate-900">{order.client_name}</p>
                            <p className="text-sm font-medium text-slate-500">Référence Client: CL-{order.client_id || '---'}</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-400 uppercase tracking-widest">Date de Commande</span>
                            <span className="font-black text-slate-900">{new Date(order.date_created).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-400 uppercase tracking-widest">Méthode de Paiement</span>
                            <span className="font-black text-slate-900 uppercase tracking-widest">{order.payment_method || 'Standard'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-400 uppercase tracking-widest">Statut</span>
                            <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md font-black uppercase text-[8px]">{order.status}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-12">
                    <Table>
                        <TableHeader className="bg-slate-900 hover:bg-slate-900 border-none">
                            <TableRow className="border-none hover:bg-slate-900">
                                <TableHead className="pl-6 h-12 text-[10px] font-black uppercase tracking-[0.2em] text-white">Désignation</TableHead>
                                <TableHead className="h-12 text-[10px] font-black uppercase tracking-[0.2em] text-white text-center">Qté</TableHead>
                                <TableHead className="h-12 text-[10px] font-black uppercase tracking-[0.2em] text-white text-right">Prix Unitaire</TableHead>
                                <TableHead className="pr-6 h-12 text-[10px] font-black uppercase tracking-[0.2em] text-white text-right">Montant Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {order.items?.map((item: OrderItem, idx: number) => (
                                <TableRow key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-slate-100`}>
                                    <TableCell className="pl-6 py-5">
                                        <p className="font-black text-slate-900 text-base">{item.product_name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Réf: PROD-{item.product}</p>
                                    </TableCell>
                                    <TableCell className="text-center font-black text-slate-700">{item.quantity}</TableCell>
                                    <TableCell className="text-right font-medium text-slate-500">{formatCurrency(item.unit_price)}</TableCell>
                                    <TableCell className="pr-6 text-right font-black text-slate-900 text-lg">{formatCurrency(item.total_price || 0)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex justify-end pt-12">
                    <div className="w-96 space-y-4">
                        <div className="flex justify-between items-center px-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sous-Total Hors Taxes</span>
                            <span className="font-bold text-slate-900">{formatCurrency(order.subtotal || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center px-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TVA (GND 18%)</span>
                            <span className="font-bold text-slate-900">{formatCurrency(order.tax_amount || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center px-4 py-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Montant dejà Payé</span>
                            <span className="font-black text-emerald-600">{formatCurrency(order.amount_paid || 0)}</span>
                        </div>
                        
                        <div className="h-px bg-slate-200 my-2" />

                        <div className="flex justify-between items-center p-6 bg-slate-900 rounded-4xl text-white shadow-2xl shadow-slate-200">
                            <span className="text-xs font-black uppercase tracking-[0.3em] opacity-50">Total Net TTC</span>
                            <span className="text-3xl font-black tracking-tighter">{formatCurrency(order.total_amount || 0)}</span>
                        </div>
                        
                        {order.total_amount - order.amount_paid > 0 && (
                            <div className="flex justify-between items-center px-6 py-4 bg-rose-500 rounded-2xl text-white text-sm font-black uppercase tracking-widest">
                                <span>Reste à Régler</span>
                                <span>{formatCurrency(order.total_amount - order.amount_paid)}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-24 pt-8 border-t border-slate-100 flex justify-between items-end">
                    <div>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Authentifié par</p>
                        <p className="text-sm font-black text-slate-900">SYSTÈME GESTION STOCK</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">Document Numérique PGStock</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
