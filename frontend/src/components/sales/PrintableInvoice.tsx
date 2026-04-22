import { User } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Order as Invoice, OrderItem as InvoiceItem } from '@/services/salesService';

interface PrintableInvoiceProps {
    invoice: Invoice;
    selectedTemplate: 'premium' | 'classic' | 'minimal';
}

export function PrintableInvoice({ invoice, selectedTemplate }: PrintableInvoiceProps) {
    return (
        <div id="print-invoice" className="print-only hidden bg-white">
            <div className="max-w-[210mm] mx-auto p-8 print:p-0 font-sans text-gray-900">
                {selectedTemplate === 'premium' && <PremiumTemplate invoice={invoice} />}
                {selectedTemplate === 'classic' && <ClassicTemplate invoice={invoice} />}
                {selectedTemplate === 'minimal' && <MinimalTemplate invoice={invoice} />}
            </div>
        </div>
    );
}

function PremiumTemplate({ invoice }: { invoice: Invoice }) {
    return (
        <div className="premium-template space-y-8">
            {/* Premium Header */}
            <div className="flex justify-between items-start mb-10">
                <div className="flex items-start gap-5">
                    <div className="h-24 w-24 flex items-center justify-center overflow-hidden">
                        <img src="/logo-gstock.png" alt="Logo" className="h-full w-full object-contain" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black tracking-tighter text-gray-900">Gstock_BEA & FILS</h2>
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
                        {/* Note: backend fields names might vary, using what was in the original file */}
                        {(invoice as any).client_address && <p>📍 {(invoice as any).client_address}</p>}
                        {(invoice as any).client_phone && <p>📞 {(invoice as any).client_phone}</p>}
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
                                <td className="py-4 px-4 text-right font-black text-gray-700">{formatCurrency(Number(item.unit_price))}</td>
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
                        <span className="text-gray-900">{formatCurrency(Number(invoice.subtotal))}</span>
                    </div>
                    {(invoice as any).tax_amount > 0 && (
                        <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest px-2">
                            <span>TVA {(invoice as any).tax_rate || 18}%</span>
                            <span className="text-gray-900">{formatCurrency((invoice as any).tax_amount)}</span>
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
                            <span className="text-3xl font-black tracking-tighter leading-none">{formatCurrency(Number(invoice.total_amount))}</span>
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
    );
}

function ClassicTemplate({ invoice }: { invoice: Invoice }) {
    return (
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
                        <p>{(invoice as any).client_address || '-'}</p>
                        <p>{(invoice as any).client_phone || '-'}</p>
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
                                <td className="py-2 px-3 border border-gray-300 text-right">{formatCurrency(Number(item.unit_price))}</td>
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
                        <span className="font-bold">{formatCurrency(Number(invoice.subtotal))}</span>
                    </div>
                    <div className="p-3 border-b border-gray-200 flex justify-between text-sm">
                        <span>Total Taxes</span>
                        <span className="font-bold">{formatCurrency(Number((invoice as any).tax_amount || 0))}</span>
                    </div>
                    {Number(invoice.discount) > 0 && (
                        <div className="p-3 border-b border-gray-200 flex justify-between text-sm text-rose-600">
                            <span>Remise</span>
                            <span className="font-bold">-{formatCurrency(Number(invoice.discount))}</span>
                        </div>
                    )}
                    <div className="p-4 bg-gray-900 text-white flex justify-between items-center">
                        <span className="font-black uppercase tracking-tighter">Total Net</span>
                        <span className="text-xl font-black">{formatCurrency(Number(invoice.total_amount))}</span>
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
    );
}

function MinimalTemplate({ invoice }: { invoice: Invoice }) {
    return (
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
                    <p className="text-sm font-bold text-gray-500 mt-2 max-w-xs">{(invoice as any).client_address || 'Adresse non spécifiée'}</p>
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
                        <div className="col-span-2 text-right font-black text-sm opacity-60 tracking-tighter">{formatCurrency(Number(item.unit_price))}</div>
                        <div className="col-span-2 text-right font-black text-sm tracking-tighter">{formatCurrency(Number(item.total_price))}</div>
                    </div>
                ))}
            </div>

            {/* Minimal Totals */}
            <div className="flex justify-end pt-10 border-t-2 border-gray-900">
                <div className="w-full max-w-xs space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300 italic">Pre-total</span>
                        <span className="text-xl font-black text-gray-400 tracking-tighter">{formatCurrency(Number(invoice.subtotal))}</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300 italic">Taxation</span>
                        <span className="text-xl font-black text-gray-400 tracking-tighter">{formatCurrency(Number((invoice as any).tax_amount || 0))}</span>
                    </div>
                    {Number(invoice.discount) > 0 && (
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-300 italic">Remise</span>
                            <span className="text-xl font-black text-rose-400 tracking-tighter">-{formatCurrency(Number(invoice.discount))}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-end pt-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-900 italic">Total Final</span>
                        <span className="text-5xl font-black text-gray-900 tracking-tighter leading-none">{formatCurrency(Number(invoice.total_amount))}</span>
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
    );
}
