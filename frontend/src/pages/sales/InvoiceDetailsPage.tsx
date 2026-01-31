import { useState } from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import salesService from '@/services/salesService';
import type { OrderItem as InvoiceItem } from '@/services/salesService';
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Separator} from "@/components/ui/separator";
import {Label} from "@/components/ui/label";
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
    Mail,
    User,
    Calendar,
    Activity,
    Clock,
    Ticket,
    Loader2,
    FileText,
} from 'lucide-react';
import {toast} from 'sonner';

import { formatCurrency } from '@/lib/utils';

export function InvoiceDetailsPage() {
    const {id} = useParams();
    const navigate = useNavigate();
    const [selectedTemplate, setSelectedTemplate] = useState < 'premium' | 'classic' | 'minimal' > ('premium');

    const {data: invoice, isLoading, error} = useQuery({
        queryKey: [
            'invoice', id
        ],
        queryFn: () => salesService.getOrder(Number(id)),
        enabled: !!id
    });

    const handlePrint = (type : 'invoice' | 'ticket') => {
        if (!invoice) 
            return;
        
        document.body.classList.add(`printing-${type}`);
        document.body.classList.add(`template-${selectedTemplate}`);
        window.print();
        setTimeout(() => {
            document.body.classList.remove(`printing-${type}`);
            document.body.classList.remove(`template-${selectedTemplate}`);
        }, 500);
    };

    const handleDownloadPdf = async () => {
        if (!invoice) 
            return;
        
        try {
            toast.info(`Téléchargement de la facture ${
                invoice.order_number
            }...`);
            const originalTitle = document.title;
            document.title = `Facture_${
                invoice.order_number
            }`;

            await salesService.exportOrderPdf(invoice.id, invoice.order_number);

            document.title = originalTitle;
            toast.success("Facture téléchargée avec succès");
        } catch {
            toast.error("Erreur lors du téléchargement");
        }};

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                    <FileText className="h-10 w-10 text-destructive"/>
                </div>
                <h2 className="text-xl font-bold">Facture introuvable</h2>
                <Button onClick={
                    () => navigate('/invoices')
                }>Retour aux factures</Button>
            </div>
        );
    }

    return (
        <div id="invoice-details-container" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print bg-white p-4 rounded-3xl shadow-sm border border-muted/20">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon"
                        onClick={
                            () => navigate('/invoices')
                        }
                        className="h-10 w-10 rounded-full hover:bg-muted">
                        <ArrowLeft className="h-5 w-5"/>
                    </Button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight">Détails de la facture</h1>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            Gérer la facture
                            <span className="text-primary">#{
                                invoice.order_number
                            }</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Template Selector */}
                    <div className="flex items-center bg-muted/30 p-1 rounded-2xl mr-2">
                        <button onClick={
                                () => setSelectedTemplate('minimal')
                            }
                            className={
                                `px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                    selectedTemplate === 'minimal' ? 'bg-white text-gray-800 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                }`
                        }>
                            Minimal
                        </button>
                        <button onClick={
                                () => setSelectedTemplate('classic')
                            }
                            className={
                                `px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                    selectedTemplate === 'classic' ? 'bg-white text-gray-800 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                }`
                        }>
                            Classique
                        </button>
                        <button onClick={
                                () => setSelectedTemplate('premium')
                            }
                            className={
                                `px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                    selectedTemplate === 'premium' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-primary'
                                }`
                        }>
                            Premium
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline"
                            onClick={
                                () => handlePrint('invoice')
                            }
                            className="rounded-xl font-bold text-xs h-10 border-muted/20">
                            <Printer className="mr-2 h-4 w-4"/>
                            Imprimer
                        </Button>
                        <Button variant="outline"
                            onClick={handleDownloadPdf}
                            className="rounded-xl font-bold text-xs h-10 border-muted/20">
                            <Download className="mr-2 h-4 w-4"/>
                            PDF
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Invoice Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Status & Info */}
                    <div className="bg-card rounded-2xl p-6 shadow-xs border border-muted/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex gap-4 items-start p-4 rounded-xl bg-muted/30 border border-muted/20">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <User className="h-5 w-5 text-primary"/>
                                </div>
                                <div>
                                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Client</Label>
                                    <p className="font-bold text-foreground text-sm">
                                        {
                                        invoice.client_name
                                    }</p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start p-4 rounded-xl bg-muted/30 border border-muted/20">
                                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                    <Calendar className="h-5 w-5 text-emerald-500"/>
                                </div>
                                <div>
                                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Date d'émission</Label>
                                    <p className="font-bold text-foreground text-sm">
                                        {
                                        invoice.date_created ? new Date(invoice.date_created).toLocaleDateString('fr-FR') : 'Non définie'
                                    } </p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start p-4 rounded-xl bg-muted/30 border border-muted/20">
                                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                    <Activity className="h-5 w-5 text-amber-500"/>
                                </div>
                                <div>
                                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Statut</Label>
                                    <div>
                                        <Badge className={
                                                `mt-1 font-bold text-[10px] uppercase ${
                                                    ((Number(invoice.total_amount) - Number(invoice.amount_paid)) <= 0) ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                    invoice.status === 'partial' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                                    invoice.status === 'draft' ? 'bg-slate-500/10 text-slate-500 border-slate-500/20' :
                                                    'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                }`
                                            }
                                            variant="outline">
                                            {
                                            (Number(invoice.total_amount) - Number(invoice.amount_paid) <= 0) ? 'Payée' :
                                            invoice.status === 'paid' ? 'Payée' : 
                                            invoice.payment_status === 'partial' ? 'Partiel' : 
                                            invoice.status === 'draft' ? 'Brouillon' :
                                            invoice.status === 'cancelled' ? 'Annulée' : 'Impayée'
                                        } </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start p-4 rounded-xl bg-muted/30 border border-muted/20">
                                <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                                    <Clock className="h-5 w-5 text-rose-500"/>
                                </div>
                                <div>
                                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Date d'échéance</Label>
                                    <p className="font-bold text-foreground text-sm">
                                        {'À payer à réception'} </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-card rounded-2xl shadow-xs border border-muted/20 overflow-hidden">
                        <div className="p-6 border-b border-muted/20">
                            <h3 className="text-lg font-black tracking-tight">Articles</h3>
                        </div>
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="pl-6 text-[10px] uppercase font-bold tracking-wider">Produit</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-center">Qté</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-right">P.U</TableHead>
                                    <TableHead className="pr-6 text-[10px] uppercase font-bold tracking-wider text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody> {
                                invoice.items && invoice.items.length > 0 ? (invoice.items.map((item
                                : InvoiceItem) => (
                                    <TableRow key={
                                            item.id
                                        }
                                        className="hover:bg-muted/10 transition-colors">
                                        <TableCell className="pl-6 py-4">
                                            <div className="font-bold text-foreground text-sm">
                                                {
                                                item.product_name
                                            }</div>
                                            <div className="text-[10px] text-muted-foreground font-mono">
                                                {
                                                item.product_sku
                                            }</div>
                                        </TableCell>
                                        <TableCell className="text-center font-medium">
                                            {
                                            item.quantity
                                        }</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {
                                            formatCurrency(item.unit_price)
                                        }</TableCell>
                                        <TableCell className="pr-6 text-right font-bold">
                                            {
                                            formatCurrency(Number(item.total_price))
                                        }</TableCell>
                                    </TableRow>
                                ))) : (
                                    <TableRow>
                                        <TableCell colSpan={4}
                                            className="text-center py-8 text-muted-foreground">
                                            Aucun article trouvé
                                        </TableCell>
                                    </TableRow>
                                )
                            } </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Right Column: Actions & Summary */}
                <div className="space-y-6">
                    {/* Actions Card */}
                    <div className="bg-card rounded-2xl p-6 shadow-xs border border-muted/20 space-y-4 no-print">
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">Actions</h3>

                        <Button className="w-full justify-start rounded-xl h-12 text-base font-bold shadow-lg shadow-primary/20"
                            onClick={
                                () => handlePrint('invoice')
                        }>
                            <Printer className="mr-3 h-5 w-5"/>
                            Imprimer Facture
                        </Button>

                        <Button variant="outline" className="w-full justify-start rounded-xl h-12 text-base font-bold border-muted/20"
                            onClick={handleDownloadPdf}>
                            <Download className="mr-3 h-5 w-5"/>
                            Télécharger PDF
                        </Button>

                        <Button variant="secondary" className="w-full justify-start rounded-xl h-12 text-base font-bold bg-amber-500 text-white hover:bg-amber-600"
                            onClick={
                                () => handlePrint('ticket')
                        }>
                            <Ticket className="mr-3 h-5 w-5"/>
                            Imprimer Ticket
                        </Button>

                        <Button variant="outline" className="w-full justify-start rounded-xl h-12 text-base font-bold border-muted/20"
                            onClick={
                                () => toast.info("Fonctionnalité d'envoi d'email à venir")
                        }>
                            <Mail className="mr-3 h-5 w-5"/>
                            Envoyer par Email
                        </Button>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-card rounded-2xl p-6 shadow-xs border border-muted/20">
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6">Résumé Financier</h3>

                        <div className="space-y-4">
                            {
                            Number(invoice.subtotal) > 0 && (
                                <div className="flex justify-between items-center text-sm text-muted-foreground">
                                    <span>Sous-total</span>
                                    <span className="font-medium">
                                        {
                                        formatCurrency(invoice.subtotal)
                                    }</span>
                                </div>
                            )
                        }

                            {
                            Number(invoice.tax_amount) > 0 && (
                                <div className="flex justify-between items-center text-sm text-muted-foreground">
                                    <span>TVA ({
                                        invoice.tax_rate || 18
                                    }%)</span>
                                    <span className="font-medium">
                                        {
                                        formatCurrency(invoice.tax_amount)
                                    }</span>
                                </div>
                            )
                        }

                            {
                            Number(invoice.discount) > 0 && (
                                <div className="flex justify-between items-center text-sm text-rose-500">
                                    <span>Remise</span>
                                    <span className="font-bold">- {
                                        formatCurrency(Number(invoice.discount))
                                    }</span>
                                </div>
                            )
                        }

                            <Separator className="bg-muted/50"/>

                            <div className="flex justify-between items-center">
                                <span className="font-bold text-foreground">Total TTC</span>
                                <span className="text-xl font-black text-foreground">
                                    {
                                    formatCurrency(invoice.total_amount)
                                }</span>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                                <span className="text-sm font-bold text-emerald-600">Montant payé</span>
                                <span className="text-lg font-bold text-emerald-600">
                                    {
                                    formatCurrency(Number(invoice.amount_paid))
                                } </span>
                            </div>

                            <div className="flex justify-between items-center p-4 bg-rose-500/5 rounded-xl border border-rose-500/20">
                                <span className="text-base font-bold text-rose-600">Reste à payer</span>
                                <span className="text-2xl font-black text-rose-600">
                                    {
                                    formatCurrency(Number(invoice.total_amount) - Number(invoice.amount_paid))
                                }</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Printable Invoice Structure (Hidden on Screen) */}
            <div id="print-invoice" className="print-only hidden bg-white">
                <div className="max-w-[210mm] mx-auto p-8 print:p-0 font-sans text-gray-900">
                    {selectedTemplate === 'premium' && (
                        <div className="premium-template space-y-8">
                            {/* Premium Header */}
                            <div className="flex justify-between items-start mb-10">
                                <div className="flex items-start gap-5">
                                    <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
                                        <FileText className="h-10 w-10" />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-black tracking-tighter text-gray-900">ETS BEA & FILS</h2>
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                                            <p>📍 Marché Madina, Conakry, Guinée</p>
                                            <p>📞 +224 620 00 00 00</p>
                                            <p>✉ contact@beafils.com</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h1 className="text-7xl font-black text-gray-100 uppercase tracking-tighter leading-none select-none">FACTURE</h1>
                                    <p className="text-lg font-black text-primary -mt-8 relative z-10">#{invoice.order_number}</p>
                                </div>
                            </div>

                            {/* Premium Info Bar */}
                            <div className="grid grid-cols-2 gap-8 mb-10">
                                <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-5">
                                        <User className="h-12 w-12" />
                                    </div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-3">Facturé à</h3>
                                    <p className="text-xl font-black text-gray-900 mb-1">{invoice.client_name}</p>
                                    <div className="text-xs font-bold text-gray-500 space-y-1">
                                        {invoice.client_address && <p>📍 {invoice.client_address}</p>}
                                        {invoice.client_phone && <p>📞 {invoice.client_phone}</p>}
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">Détails de paiement</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Date d'émission</p>
                                            <p className="text-sm font-black text-gray-700">{invoice.date_created ? new Date(invoice.date_created).toLocaleDateString('fr-FR') : '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Échéance</p>
                                            <p className="text-sm font-black text-gray-700">À réception</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Premium Table */}
                            <div className="overflow-hidden rounded-3xl border border-gray-100 shadow-sm mb-10">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-900 text-white">
                                            <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest">Description</th>
                                            <th className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest w-20">Qté</th>
                                            <th className="py-4 px-4 text-right text-[10px] font-black uppercase tracking-widest w-32">P.U.</th>
                                            {invoice.items && invoice.items.some((item: InvoiceItem) => Number(item.discount || 0) > 0) && (
                                                <th className="py-4 px-4 text-right text-[10px] font-black uppercase tracking-widest w-24">Remise</th>
                                            )}
                                            <th className="py-4 px-6 text-right text-[10px] font-black uppercase tracking-widest w-36">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {invoice.items && invoice.items.map((item: InvoiceItem, index: number) => (
                                            <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                                <td className="py-4 px-6">
                                                    <p className="font-black text-gray-900">{item.product_name}</p>
                                                    {item.product_sku && <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 tracking-tighter">{item.product_sku}</p>}
                                                </td>
                                                <td className="py-4 px-4 text-center font-black text-gray-700">{item.quantity}</td>
                                                <td className="py-4 px-4 text-right font-black text-gray-700">{formatCurrency(item.unit_price)}</td>
                                                {invoice.items.some((i: InvoiceItem) => Number(i.discount || 0) > 0) && (
                                                    <td className="py-4 px-4 text-right font-black text-rose-500">
                                                        {Number(item.discount || 0) > 0 ? `-${item.discount}%` : '-'}
                                                    </td>
                                                )}
                                                <td className="py-4 px-6 text-right font-black text-gray-900">{formatCurrency(Number(item.total_price))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Premium Totals */}
                            <div className="flex justify-end pt-5">
                                <div className="w-72 space-y-3">
                                    <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest px-2">
                                        <span>Sous-total</span>
                                        <span className="text-gray-900">{formatCurrency(invoice.subtotal)}</span>
                                    </div>
                                    {Number(invoice.tax_amount) > 0 && (
                                        <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest px-2">
                                            <span>TVA ({invoice.tax_rate || 18}%)</span>
                                            <span className="text-gray-900">{formatCurrency(invoice.tax_amount)}</span>
                                        </div>
                                    )}
                                    {Number(invoice.discount) > 0 && (
                                        <div className="flex justify-between text-xs font-bold text-rose-500 uppercase tracking-widest px-2">
                                            <span>Remise</span>
                                            <span>-{formatCurrency(Number(invoice.discount))}</span>
                                        </div>
                                    )}
                                    <div className="h-px bg-gray-100 my-4" />
                                    <div className="bg-primary rounded-3xl p-6 text-white shadow-xl shadow-primary/30">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Total Net</span>
                                            <span className="text-3xl font-black tracking-tighter leading-none">{formatCurrency(invoice.total_amount)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center px-2 mt-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                        <span>Montant Payé</span>
                                        <span className="text-gray-900">{formatCurrency(Number(invoice.amount_paid))}</span>
                                    </div>

                                    {Number(invoice.total_amount) - Number(invoice.amount_paid) > 0 && (
                                        <div className="flex justify-between items-center p-4 bg-rose-50 border border-rose-100 rounded-3xl mt-2">
                                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest italic">Reste à payer</span>
                                            <span className="text-lg font-black text-rose-600">{formatCurrency(Number(invoice.total_amount) - Number(invoice.amount_paid))}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedTemplate === 'classic' && (
                        <div className="classic-template border-4 border-double border-gray-200 p-8 h-auto relative">
                            {/* Classic Header */}
                            <div className="text-center mb-12 space-y-2">
                                <h1 className="text-4xl font-extrabold uppercase tracking-[0.2em] text-gray-900 underline underline-offset-8 decoration-4 decoration-gray-900">Facture</h1>
                                <p className="text-lg font-bold text-gray-600">N° {invoice.order_number}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-12 mb-12">
                                <div className="space-y-4">
                                    <div className="border-b-2 border-gray-900 pb-1">
                                        <h3 className="text-xs font-black uppercase tracking-widest">Émetteur</h3>
                                    </div>
                                    <div className="text-sm font-bold space-y-1">
                                        <p className="text-lg font-black">ETS BEA & FILS</p>
                                        <p>Marché Madina, Guinée</p>
                                        <p>Tél: +224 620 00 00 00</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="border-b-2 border-gray-900 pb-1 text-right">
                                        <h3 className="text-xs font-black uppercase tracking-widest">Destinataire</h3>
                                    </div>
                                    <div className="text-sm font-bold space-y-1 text-right">
                                        <p className="text-lg font-black">{invoice.client_name}</p>
                                        <p>{invoice.client_address || '-'}</p>
                                        <p>{invoice.client_phone || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-12">
                                <div className="bg-gray-100 p-3 mb-4 rounded-md">
                                    <div className="grid grid-cols-2 text-xs font-black uppercase tracking-wider">
                                        <p>Date d'émission: {invoice.date_created ? new Date(invoice.date_created).toLocaleDateString('fr-FR') : '-'}</p>
                                        <p className="text-right">Échéance: À réception</p>
                                    </div>
                                </div>

                                <table className="w-full border-2 border-gray-900">
                                    <thead>
                                        <tr className="bg-gray-900 text-white">
                                            <th className="py-2 px-3 border border-gray-800 text-left text-xs uppercase">Désignation</th>
                                            <th className="py-2 px-3 border border-gray-800 text-center text-xs uppercase w-20">Qté</th>
                                            <th className="py-2 px-3 border border-gray-800 text-right text-xs uppercase w-32">Prix Unitaire</th>
                                            <th className="py-2 px-3 border border-gray-800 text-right text-xs uppercase w-32">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm font-bold">
                                        {invoice.items && invoice.items.map((item: InvoiceItem) => (
                                            <tr key={item.id}>
                                                <td className="py-2 px-3 border border-gray-300">{item.product_name}</td>
                                                <td className="py-2 px-3 border border-gray-300 text-center">{item.quantity}</td>
                                                <td className="py-2 px-3 border border-gray-300 text-right">{formatCurrency(item.unit_price)}</td>
                                                <td className="py-2 px-3 border border-gray-300 text-right">{formatCurrency(Number(item.total_price))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end">
                                <div className="w-64 border-2 border-gray-900">
                                    <div className="p-3 border-b border-gray-200 flex justify-between text-sm">
                                        <span>Total Brut</span>
                                        <span className="font-bold">{formatCurrency(invoice.subtotal)}</span>
                                    </div>
                                    <div className="p-3 border-b border-gray-200 flex justify-between text-sm">
                                        <span>Total Taxes</span>
                                        <span className="font-bold">{formatCurrency(invoice.tax_amount)}</span>
                                    </div>
                                    {Number(invoice.discount) > 0 && (
                                        <div className="p-3 border-b border-gray-200 flex justify-between text-sm text-rose-600">
                                            <span>Remise</span>
                                            <span className="font-bold">-{formatCurrency(Number(invoice.discount))}</span>
                                        </div>
                                    )}
                                    <div className="p-4 bg-gray-900 text-white flex justify-between items-center">
                                        <span className="font-black uppercase tracking-tighter">Total Net</span>
                                        <span className="text-xl font-black">{formatCurrency(invoice.total_amount)}</span>
                                    </div>
                                    <div className="p-3 border-b border-gray-200 flex justify-between text-sm">
                                        <span>Montant Payé</span>
                                        <span className="font-bold">{formatCurrency(Number(invoice.amount_paid))}</span>
                                    </div>
                                    {Number(invoice.total_amount) - Number(invoice.amount_paid) > 0 && (
                                        <div className="p-3 flex justify-between text-sm bg-rose-50 text-rose-600 font-bold">
                                            <span>Reste à payer</span>
                                            <span>{formatCurrency(Number(invoice.total_amount) - Number(invoice.amount_paid))}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-8 right-8 text-center text-[10px] font-black uppercase text-gray-400 border-t border-gray-100 pt-4">
                                <p>ETS BEA & FILS • Marché Madina, Conakry • Tél: +224 620 00 00 00</p>
                            </div>
                        </div>
                    )}

                    {selectedTemplate === 'minimal' && (
                        <div className="minimal-template space-y-16 py-10">
                            {/* Minimal Header */}
                            <div className="flex items-end justify-between border-b-2 border-gray-900 pb-8">
                                <div>
                                    <h2 className="text-4xl font-black tracking-tighter text-gray-900">BEA & FILS.</h2>
                                    <p className="text-xs font-bold text-gray-400 mt-2">Conakry, Guinée • +224 620 00 00 00</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-8xl font-black text-gray-900 opacity-[0.03] absolute top-0 right-0 pointer-events-none">INVOICE</p>
                                    <p className="text-sm font-black text-gray-900">FACT-{invoice.order_number}</p>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{invoice.date_issued ? new Date(invoice.date_issued).toLocaleDateString('fr-FR') : '-'}</p>
                                </div>
                            </div>

                            {/* Minimal Addresses */}
                            <div className="grid grid-cols-2 gap-20">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-4 italic">Client</p>
                                    <p className="text-2xl font-black text-gray-900 leading-tight">{invoice.client_name}</p>
                                    <p className="text-sm font-bold text-gray-500 mt-2 max-w-xs">{invoice.client_address || 'Adresse non spécifiée'}</p>
                                </div>
                                <div className="text-right flex flex-col justify-end">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-4 italic">Statut</p>
                                    <p className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">
                                        {((Number(invoice.total_amount) - Number(invoice.amount_paid)) <= 0) ? 'Payé' : invoice.status === 'paid' ? 'Payé' : invoice.status === 'partial' ? 'Partiel' : 'Impayé'}
                                    </p>
                                </div>
                            </div>

                            {/* Minimal Table */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-12 gap-4 pb-4 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-300">
                                    <div className="col-span-6">Détails</div>
                                    <div className="col-span-2 text-center">Quantité</div>
                                    <div className="col-span-2 text-right">Prix</div>
                                    <div className="col-span-2 text-right">Montant</div>
                                </div>
                                {invoice.items && invoice.items.map((item: InvoiceItem) => (
                                    <div key={item.id} className="grid grid-cols-12 gap-4 py-2 text-gray-900">
                                        <div className="col-span-6">
                                            <p className="font-black truncate text-sm">{item.product_name}</p>
                                            <p className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">{item.product_sku}</p>
                                        </div>
                                        <div className="col-span-2 text-center font-black text-sm">{item.quantity}</div>
                                        <div className="col-span-2 text-right font-black text-sm opacity-60 tracking-tighter">{formatCurrency(item.unit_price)}</div>
                                        <div className="col-span-2 text-right font-black text-sm tracking-tighter">{formatCurrency(Number(item.total_price))}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Minimal Totals */}
                            <div className="flex justify-end pt-10 border-t-2 border-gray-900">
                                <div className="w-full max-w-xs space-y-4">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300 italic">Pre-total</span>
                                        <span className="text-xl font-black text-gray-400 tracking-tighter">{formatCurrency(invoice.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300 italic">Taxation</span>
                                        <span className="text-xl font-black text-gray-400 tracking-tighter">{formatCurrency(invoice.tax_amount)}</span>
                                    </div>
                                    {Number(invoice.discount) > 0 && (
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-300 italic">Remise</span>
                                            <span className="text-xl font-black text-rose-400 tracking-tighter">-{formatCurrency(Number(invoice.discount))}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-end pt-4">
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-900 italic">Total Final</span>
                                        <span className="text-5xl font-black text-gray-900 tracking-tighter leading-none">{formatCurrency(invoice.total_amount)}</span>
                                    </div>
                                    <div className="flex justify-between items-end pt-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 italic">Payé</span>
                                        <span className="text-lg font-black text-gray-600 tracking-tighter">{formatCurrency(Number(invoice.amount_paid))}</span>
                                    </div>
                                    {Number(invoice.total_amount) - Number(invoice.amount_paid) > 0 && (
                                        <div className="flex justify-between items-end pt-2">
                                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-500 italic">Reste</span>
                                            <span className="text-xl font-black text-rose-600 tracking-tighter">{formatCurrency(Number(invoice.total_amount) - Number(invoice.amount_paid))}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Minimal Footer */}
                            <div className="pt-20">
                                <p className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-300">Merci de votre confiance • BEA & FILS • 2026</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Printable Ticket Structure (Hidden on Screen) */}
            <div id="print-ticket" className="print-only hidden text-black bg-white">
                <div className="w-[72mm] mx-auto py-4 font-mono text-[10px] leading-tight space-y-3">
                    {/* Header */}
                    <div className="text-center space-y-1">
                        <h2 className="text-sm font-black uppercase">ETS BEA & FILS</h2>
                        <p className="font-bold">Vente de marchandises générales</p>
                        <p>Marché Madina, Conakry, Guinée</p>
                        <p>Tél: +224 620 00 00 00</p>
                        <div className="pt-2">--------------------------------</div>
                        <h3 className="font-black">TICKET DE VENTE</h3>
                        <p>N°: {invoice.order_number}</p>
                        <p>Date: {invoice.date_issued ? new Date(invoice.date_issued).toLocaleDateString('fr-FR') : '-'}</p>
                        <div>--------------------------------</div>
                    </div>

                    {/* Client details if any */}
                    <div className="space-y-0.5 uppercase font-bold">
                        <p>Client: {invoice.client_name}</p>
                    </div>

                    <div>--------------------------------</div>

                    {/* Items Table */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-[1fr,40px,80px] font-black border-b border-black pb-1">
                            <span>Désignation</span>
                            <span className="text-center">Qté</span>
                            <span className="text-right">Total</span>
                        </div>
                        {invoice.items && invoice.items.map((item: InvoiceItem) => (
                            <div key={item.id} className="space-y-1">
                                <div className="font-bold uppercase leading-none">{item.product_name}</div>
                                <div className="grid grid-cols-[1fr,40px,80px]">
                                    <span className="italic pl-2">{formatCurrency(item.unit_price)}</span>
                                    <span className="text-center">{item.quantity}</span>
                                    <span className="text-right font-bold">{formatCurrency(Number(item.total_price))}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-1">--------------------------------</div>

                    {/* Totals */}
                    <div className="space-y-1">
                        <div className="flex justify-between font-bold">
                            <span>SOUS-TOTAL:</span>
                            <span>{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        {Number(invoice.tax_amount) > 0 && (
                            <div className="flex justify-between">
                                <span>TVA ({invoice.tax_rate || 18}%):</span>
                                <span>{formatCurrency(invoice.tax_amount)}</span>
                            </div>
                        )}
                        {Number(invoice.discount) > 0 && (
                            <div className="flex justify-between">
                                <span>REMISE:</span>
                                <span>-{formatCurrency(Number(invoice.discount))}</span>
                            </div>
                        )}
                        <div className="pt-1">--------------------------------</div>
                        <div className="flex justify-between text-base font-black border-y-2 border-black py-1">
                            <span>TOTAL NET:</span>
                            <span>{formatCurrency(invoice.total_amount)}</span>
                        </div>
                        
                        <div className="flex justify-between font-bold pt-1">
                            <span>PAYÉ:</span>
                            <span>{formatCurrency(Number(invoice.amount_paid))}</span>
                        </div>
                        
                        {Number(invoice.total_amount) - Number(invoice.amount_paid) > 0 && (
                            <div className="flex justify-between font-bold pt-1">
                                <span>RESTE À PAYER:</span>
                                <span>{formatCurrency(Number(invoice.total_amount) - Number(invoice.amount_paid))}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="text-center pt-6 space-y-2">
                        <div>--------------------------------</div>
                        <p className="font-black italic">MERCI DE VOTRE VISITE !</p>
                        <p className="text-[8px] uppercase">Les marchandises vendues ne sont ni reprises ni échangées.</p>
                        <div className="pt-2 text-[7px] text-gray-500">
                            Logiciel PGStock - {new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
