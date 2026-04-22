import { Separator } from "@/components/ui/separator";
import { formatCurrency } from '@/lib/utils';
import type { Order as Invoice } from '@/services/salesService';

interface InvoiceSummaryProps {
    invoice: Invoice;
}

export function InvoiceSummary({ invoice }: InvoiceSummaryProps) {
    const subtotal = Number(invoice.subtotal || 0);
    const taxAmount = Number(invoice.tax_amount || 0);
    const taxRate = invoice.tax_rate || 18;
    const discount = Number(invoice.discount || 0);
    const totalAmount = Number(invoice.total_amount || 0);
    const amountPaid = Number(invoice.amount_paid || 0);
    const balance = totalAmount - amountPaid;

    return (
        <div className="bg-card rounded-2xl p-6 shadow-xs border border-muted/20">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6">Résumé Financier</h3>

            <div className="space-y-4">
                {subtotal > 0 && (
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Sous-total</span>
                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                )}

                {taxAmount > 0 && (
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>TVA ({taxRate}%)</span>
                        <span className="font-medium">{formatCurrency(taxAmount)}</span>
                    </div>
                )}

                {discount > 0 && (
                    <div className="flex justify-between items-center text-sm text-rose-500">
                        <span>Remise</span>
                        <span className="font-bold">- {formatCurrency(discount)}</span>
                    </div>
                )}

                <Separator className="bg-muted/50"/>

                <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground">Total TTC</span>
                    <span className="text-xl font-black text-foreground">{formatCurrency(totalAmount)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                    <span className="text-sm font-bold text-emerald-600">Montant payé</span>
                    <span className="text-lg font-bold text-emerald-600">{formatCurrency(amountPaid)}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-rose-500/5 rounded-xl border border-rose-500/20">
                    <span className="text-base font-bold text-rose-600">Reste à payer</span>
                    <span className="text-2xl font-black text-rose-600">{formatCurrency(balance)}</span>
                </div>
            </div>
        </div>
    );
}
