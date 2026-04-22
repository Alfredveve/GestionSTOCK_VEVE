import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import salesService from '@/services/salesService';
import { Loader2, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

// New Sub-components
import { InvoiceHeader } from '@/components/sales/InvoiceHeader';
import { InvoiceInfo } from '@/components/sales/InvoiceInfo';
import { InvoiceItemsTable } from '@/components/sales/InvoiceItemsTable';
import { InvoiceSummary } from '@/components/sales/InvoiceSummary';
import { InvoiceActions } from '@/components/sales/InvoiceActions';
import { PrintableInvoice } from '@/components/sales/PrintableInvoice';
import { PrintableTicket } from '@/components/sales/PrintableTicket';

export function InvoiceDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [selectedTemplate, setSelectedTemplate] = useState<'premium' | 'classic' | 'minimal'>('premium');

    const { data: invoice, isLoading, error } = useQuery({
        queryKey: ['invoice', id],
        queryFn: () => salesService.getOrder(Number(id)),
        enabled: !!id
    });

    const handlePrint = (type: 'invoice' | 'ticket') => {
        if (!invoice) return;
        
        document.body.classList.add(`printing-${type}`);
        document.body.classList.add(`template-${selectedTemplate}`);
        window.print();
        setTimeout(() => {
            document.body.classList.remove(`printing-${type}`);
            document.body.classList.remove(`template-${selectedTemplate}`);
        }, 500);
    };

    const handleDownloadPdf = async () => {
        if (!invoice) return;
        
        try {
            toast.info(`Téléchargement de la facture ${invoice.order_number}...`);
            const originalTitle = document.title;
            document.title = `Facture_${invoice.order_number}`;

            await salesService.exportOrderPdf(invoice.id, invoice.order_number);

            document.title = originalTitle;
            toast.success("Facture téléchargée avec succès");
        } catch {
            toast.error("Erreur lors du téléchargement");
        }
    };

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
                <Button onClick={() => navigate('/invoices')}>Retour aux factures</Button>
            </div>
        );
    }

    return (
        <div id="invoice-details-container" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Navigation */}
            <InvoiceHeader 
                invoice={invoice}
                selectedTemplate={selectedTemplate}
                setSelectedTemplate={setSelectedTemplate}
                onPrint={handlePrint}
                onDownload={handleDownloadPdf}
            />

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Invoice Details */}
                <div className="lg:col-span-2 space-y-6">
                    <InvoiceInfo invoice={invoice} />
                    <InvoiceItemsTable items={invoice.items || []} />
                </div>

                {/* Right Column: Actions & Summary */}
                <div className="space-y-6">
                    <InvoiceActions 
                        onPrint={handlePrint}
                        onDownload={handleDownloadPdf}
                    />
                    <InvoiceSummary invoice={invoice} />
                </div>
            </div>

            {/* Printable Invoice Structure (Hidden on Screen) */}
            <PrintableInvoice 
                invoice={invoice}
                selectedTemplate={selectedTemplate}
            />

            {/* Printable Ticket Structure (Hidden on Screen) */}
            <PrintableTicket invoice={invoice} />
        </div>
    );
}
