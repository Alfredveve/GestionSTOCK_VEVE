import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import inventoryService from '@/services/inventoryService';
import type { QuoteItem } from '@/types';
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
    Clock,
    Loader2,
    FileText,
    Rocket,
    FileOutput,
    Package,
    ChevronRight,
    Hash,
    Calculator,
    CheckCircle2
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

export function QuoteDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: quote, isLoading, error } = useQuery({
        queryKey: ['quote', id],
        queryFn: () => inventoryService.getQuote(Number(id)),
        enabled: !!id
    });

    const convertMutation = useMutation({
        mutationFn: (id: number) => inventoryService.convertQuoteToInvoice(id),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            toast.success("Devis converti en facture avec succès");
            navigate(`/sales/invoices/${data.invoice_id}`);
        },
        onError: () => {
            toast.error("Erreur lors de la conversion du devis");
        }
    });

    const handlePrint = () => {
        if (!quote) return;
        document.body.classList.add('printing-quote');
        window.print();
        setTimeout(() => {
            document.body.classList.remove('printing-quote');
        }, 500);
    };

    const handleDownloadPdf = async () => {
        if (!quote) return;
        try {
            toast.info("Génération du PDF...");
            await inventoryService.exportQuotePdf(quote.id, quote.quote_number);
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
                    <p className="text-sm font-bold text-muted-foreground animate-pulse tracking-widest uppercase">Chargement du devis...</p>
                </div>
            </div>
        );
    }

    if (error || !quote) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-6">
                <div className="h-24 w-24 rounded-full bg-destructive/5 flex items-center justify-center ring-1 ring-destructive/10">
                    <FileText className="h-12 w-12 text-destructive/50" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-black tracking-tight">Devis introuvable</h2>
                    <p className="text-muted-foreground font-medium mt-1">Le devis demandé est inaccessible.</p>
                </div>
                <Button onClick={() => navigate('/quotes')} className="rounded-2xl h-12 px-8 font-bold">
                    Retour aux devis
                </Button>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'converted': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'sent': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
            case 'accepted': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'rejected': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
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
            {/* Glassy Header */}
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
                                <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">Devis</h1>
                                <Badge className={`px-3 py-1 font-black text-[10px] uppercase tracking-wider rounded-lg border-none ${getStatusColor(quote.status)}`}>
                                    {quote.status === 'converted' ? 'Converti' : quote.status === 'sent' ? 'Envoyé' : 'Brouillon'}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="p-1 rounded-md">
                                    <Hash className="h-3 w-3 text-primary" />
                                </span>
                                <p className="text-sm font-black text-slate-400 tracking-widest">{quote.quote_number}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="outline" onClick={handlePrint}
                            className="rounded-2xl font-black text-xs h-12 border-slate-200 glass-bg px-6">
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimer
                        </Button>
                        <Button variant="outline" onClick={handleDownloadPdf}
                            className="rounded-2xl font-black text-xs h-12 border-slate-200 glass-bg px-6">
                            <Download className="mr-2 h-4 w-4" />
                            PDF
                        </Button>
                        
                        {quote.status !== 'converted' && (
                            <Button 
                                onClick={() => convertMutation.mutate(quote.id)}
                                disabled={convertMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs h-12 shadow-xl shadow-emerald-200/50 px-8"
                            >
                                {convertMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                                Facturer ce Devis
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-8">
                    {/* Stats Band */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
                        <div className="bg-white/80 backdrop-blur-md rounded-4xl p-6 border border-white shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <User className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Client</p>
                                    <p className="text-sm font-black text-slate-900">{quote.client_name}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/80 backdrop-blur-md rounded-4xl p-6 border border-white shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <Calendar className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date d'émission</p>
                                    <p className="text-sm font-black text-slate-900">
                                        {new Date(quote.date_issued).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/80 backdrop-blur-md rounded-4xl p-6 border border-white shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expiration</p>
                                    <p className="text-sm font-black text-slate-900">
                                        {new Date(quote.valid_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Table Section */}
                    <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-md rounded-4xl border border-white shadow-xl shadow-slate-200/30 overflow-hidden no-print">
                        <div className="p-8 flex items-center justify-between border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center">
                                    <Package className="h-4 w-4" />
                                </div>
                                <h3 className="text-xl font-black tracking-tight text-slate-900">Articles Sélectionnés</h3>
                            </div>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full uppercase text-[10px] tracking-widest">
                                {quote.items?.length || 0} ITEMS
                            </Badge>
                        </div>
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="pl-10 h-16 text-[11px] uppercase font-black tracking-widest text-slate-400">Produit</TableHead>
                                    <TableHead className="h-16 text-[11px] uppercase font-black tracking-widest text-slate-400 text-center">Vente</TableHead>
                                    <TableHead className="h-16 text-[11px] uppercase font-black tracking-widest text-slate-400 text-center">Qté</TableHead>
                                    <TableHead className="h-16 text-[11px] uppercase font-black tracking-widest text-slate-400 text-right">Prix Unitaire</TableHead>
                                    <TableHead className="pr-10 h-16 text-[11px] uppercase font-black tracking-widest text-slate-400 text-right">Sous-Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quote.items?.map((item: QuoteItem) => (
                                    <TableRow key={item.id} className="group border-slate-50 hover:bg-slate-50/50">
                                        <TableCell className="pl-10 py-6">
                                            <div className="font-black text-slate-900 text-base leading-none mb-1">{item.product_name}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Article de vente</div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                {item.is_wholesale ? 'Gros' : 'Détail'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center h-8 px-4 rounded-lg bg-slate-100 font-black text-slate-700 font-mono">
                                                {item.quantity}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-600">
                                            {formatCurrency(item.unit_price)}
                                        </TableCell>
                                        <TableCell className="pr-10 text-right font-black text-slate-900 text-lg leading-none">
                                            {formatCurrency(item.total)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </motion.div>
                </div>

                {/* Right Panel */}
                <div className="lg:col-span-4 space-y-8 no-print">
                    <motion.div variants={itemVariants} className="bg-indigo-600 rounded-4xl p-8 text-white shadow-2xl shadow-indigo-200/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-white/5 scale-150 rotate-12 group-hover:rotate-45 transition-transform duration-1000">
                            <Calculator className="h-32 w-32" />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-white/50 mb-8 relative">Résumé Financier</h3>
                        
                        <div className="space-y-5 relative">
                            <div className="flex justify-between items-center text-sm font-medium text-white/80">
                                <span>Total HT</span>
                                <span>{formatCurrency(quote.subtotal)}</span>
                            </div>

                            
                            <div className="pt-4 border-t border-white/10 mt-6 md:mt-8">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-black text-white/50 uppercase tracking-widest">Montant Total Devis</span>
                                </div>
                                <div className="text-4xl font-black tracking-tighter text-white">
                                    {formatCurrency(quote.total_amount)}
                                </div>
                                <p className="text-[10px] font-bold text-white/40 uppercase mt-2 tracking-widest italic">Valable 30 jours calendaires</p>
                            </div>

                            {quote.status === 'converted' && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-3 p-4 bg-white/10 rounded-2xl border border-white/20 mt-4"
                                >
                                    <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-300">Converti en Facture</span>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-md rounded-4xl p-8 border border-white shadow-xl shadow-slate-200/30">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 font-primary">Actions & Export</h3>
                        <div className="space-y-4">
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => inventoryService.exportQuotesExcel()}
                                className="w-full flex items-center justify-between p-4 rounded-3xl bg-slate-50 border border-slate-100"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                        <FileOutput className="h-5 w-5" />
                                    </div>
                                    <span className="font-black text-slate-900 text-sm italic">Registre Excel</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-300" />
                            </motion.button>

                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleDownloadPdf}
                                className="w-full flex items-center justify-between p-4 rounded-3xl bg-slate-50 border border-slate-100"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                                        <Download className="h-5 w-5" />
                                    </div>
                                    <span className="font-black text-slate-900 text-sm italic">Copie PDF</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-300" />
                            </motion.button>
                        </div>
                    </motion.div>

                    {quote.notes && (
                      <motion.div variants={itemVariants} className="bg-indigo-50/50 backdrop-blur-sm rounded-4xl p-8 border border-indigo-100 shadow-sm">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-4 flex items-center gap-2">
                              <FileText className="h-3 w-3" />
                              Commentaires
                          </h3>
                          <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{quote.notes}</p>
                      </motion.div>
                    )}
                </div>
            </div>

            {/* Printable Structure - REDESIGNED with even better centering */}
            <div id="print-quote" className="print-only hidden p-16 px-32 bg-white text-slate-900 min-h-screen font-sans">
                {/* Header with Blue Accents */}
                <div className="flex justify-between items-start mb-12">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                            <Rocket className="h-10 w-10" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">Gestion Stock</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Devis & Solutions Logistiques</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h1 className="text-5xl font-black text-blue-500/10 uppercase tracking-tighter mb-1 absolute top-12 right-12">PRO-FORMA</h1>
                        <div className="mt-4">
                            <p className="text-sm font-black text-slate-900 tracking-widest">{quote.quote_number}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Émis le {new Date(quote.date_issued).toLocaleDateString('fr-FR')}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-16 mb-12 pt-4 border-t border-slate-100">
                    <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Destinataire</p>
                        <div className="space-y-1">
                            <p className="text-xl font-black text-slate-900">{quote.client_name}</p>
                            <p className="text-sm font-medium text-slate-500 italic">Proposition commerciale valable 30 jours</p>
                        </div>
                    </div>
                    <div className="bg-blue-50/50 p-6 rounded-3xl space-y-3 border border-blue-100/50">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-400 uppercase tracking-widest">Expiration</span>
                            <span className="font-black text-blue-700">{new Date(quote.valid_until).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-400 uppercase tracking-widest">Type de Vente</span>
                            <span className="font-black text-slate-900 uppercase tracking-widest">Multiple</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-400 uppercase tracking-widest">Statut Devis</span>
                            <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md font-black uppercase text-[8px] tracking-wider">{quote.status}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-12">
                    <Table>
                        <TableHeader className="bg-slate-900 hover:bg-slate-900 border-none">
                            <TableRow className="border-none hover:bg-slate-900">
                                <TableHead className="pl-6 h-12 text-[10px] font-black uppercase tracking-[0.2em] text-white">Description Article</TableHead>
                                <TableHead className="h-12 text-[10px] font-black uppercase tracking-[0.2em] text-white text-center">Mode</TableHead>
                                <TableHead className="h-12 text-[10px] font-black uppercase tracking-[0.2em] text-white text-center">Qté</TableHead>
                                <TableHead className="h-12 text-[10px] font-black uppercase tracking-[0.2em] text-white text-right">P.U</TableHead>
                                <TableHead className="pr-6 h-12 text-[10px] font-black uppercase tracking-[0.2em] text-white text-right">Sous-Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quote.items?.map((item: QuoteItem, idx: number) => (
                                <TableRow key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-slate-100`}>
                                    <TableCell className="pl-6 py-5">
                                        <p className="font-black text-slate-900 text-base leading-none mb-1">{item.product_name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Ligne de devis #{idx + 1}</p>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="text-[10px] font-black uppercase text-slate-400 border border-slate-200 px-2 py-0.5 rounded">
                                            {item.is_wholesale ? 'Gros' : 'Détail'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center font-black text-slate-700">{item.quantity}</TableCell>
                                    <TableCell className="text-right font-medium text-slate-500">{formatCurrency(item.unit_price)}</TableCell>
                                    <TableCell className="pr-6 text-right font-black text-slate-900 text-lg tracking-tighter">{formatCurrency(item.total)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex justify-end pt-12">
                    <div className="w-96 space-y-4">
                        <div className="flex justify-between items-center px-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Partiel HT</span>
                            <span className="font-bold text-slate-900">{formatCurrency(quote.subtotal)}</span>
                        </div>

                        
                        <div className="h-px bg-slate-200 my-2" />

                        <div className="flex justify-between items-center p-6 bg-blue-600 rounded-4xl text-white shadow-2xl shadow-blue-200">
                            <span className="text-xs font-black uppercase tracking-[0.3em] opacity-70">Total Devis TTC</span>
                            <span className="text-3xl font-black tracking-tighter">{formatCurrency(quote.total_amount)}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-24 pt-8 border-t border-slate-100 flex justify-between items-end">
                    <div>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Responsable Commercial</p>
                        <p className="text-sm font-black text-slate-900">GESTION STOCK SARL</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">Document Pro-forma PGStock</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
