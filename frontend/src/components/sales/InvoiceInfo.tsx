import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { User, Calendar, Activity, Clock } from 'lucide-react';
import type { Order as Invoice } from '@/services/salesService';

interface InvoiceInfoProps {
    invoice: Invoice;
}

export function InvoiceInfo({ invoice }: InvoiceInfoProps) {
    const totalAmount = Number(invoice.total_amount || 0);
    const amountPaid = Number(invoice.amount_paid || 0);
    const balance = totalAmount - amountPaid;

    const getStatusColor = () => {
        if (balance <= 0) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        if (invoice.status === 'paid') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        if (invoice.status === 'partial') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        if (invoice.status === 'draft') return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    };

    const getStatusLabel = () => {
        if (balance <= 0) return 'Payée';
        if (invoice.status === 'paid') return 'Payée';
        if (invoice.payment_status === 'partial') return 'Partiel';
        if (invoice.status === 'draft') return 'Brouillon';
        if (invoice.status === 'cancelled') return 'Annulée';
        return 'Impayée';
    };

    return (
        <div className="bg-card rounded-2xl p-6 shadow-xs border border-muted/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex gap-4 items-start p-4 rounded-xl bg-muted/30 border border-muted/20">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary"/>
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Client</Label>
                        <p className="font-bold text-foreground text-sm">{invoice.client_name}</p>
                    </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-xl bg-muted/30 border border-muted/20">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Calendar className="h-5 w-5 text-emerald-500"/>
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Date d'émission</Label>
                        <p className="font-bold text-foreground text-sm">
                            {invoice.date_created ? new Date(invoice.date_created).toLocaleDateString('fr-FR') : 'Non définie'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-xl bg-muted/30 border border-muted/20">
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Activity className="h-5 w-5 text-amber-500"/>
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Statut</Label>
                        <div>
                            <Badge className={`mt-1 font-bold text-[10px] uppercase ${getStatusColor()}`} variant="outline">
                                {getStatusLabel()}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-xl bg-muted/30 border border-muted/20">
                    <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 text-rose-500"/>
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Date d'échéance</Label>
                        <p className="font-bold text-foreground text-sm">À payer à réception</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
