import { formatCurrency } from '@/lib/utils';
import type { Order as Invoice, OrderItem as InvoiceItem } from '@/services/salesService';

interface PrintableTicketProps {
    invoice: Invoice;
}

export function PrintableTicket({ invoice }: PrintableTicketProps) {
    return (
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
                                <span className="italic pl-2">{formatCurrency(Number(item.unit_price))}</span>
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
                        <span>{formatCurrency(Number(invoice.subtotal))}</span>
                    </div>
                    {Number((invoice as any).tax_amount) > 0 && (
                        <div className="flex justify-between">
                            <span>TVA ({(invoice as any).tax_rate || 18}%):</span>
                            <span>{formatCurrency((invoice as any).tax_amount)}</span>
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
                        <span>{formatCurrency(Number(invoice.total_amount))}</span>
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
    );
}
