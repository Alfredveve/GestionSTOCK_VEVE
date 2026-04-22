import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Order as Invoice } from '@/services/salesService';

interface InvoiceHeaderProps {
    invoice: Invoice;
    selectedTemplate: 'premium' | 'classic' | 'minimal';
    setSelectedTemplate: (template: 'premium' | 'classic' | 'minimal') => void;
    onPrint: (type: 'invoice' | 'ticket') => void;
    onDownload: () => void;
}

export function InvoiceHeader({ 
    invoice, 
    selectedTemplate, 
    setSelectedTemplate, 
    onPrint, 
    onDownload 
}: InvoiceHeaderProps) {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print bg-white p-4 rounded-3xl shadow-sm border border-muted/20">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon"
                    onClick={() => navigate('/invoices')}
                    className="h-10 w-10 rounded-full hover:bg-muted">
                    <ArrowLeft className="h-5 w-5"/>
                </Button>
                <div>
                    <h1 className="text-xl font-black tracking-tight">Détails de la facture</h1>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        Gérer la facture <span className="text-primary">#{invoice.order_number}</span>
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {/* Template Selector */}
                <div className="flex items-center bg-muted/30 p-1 rounded-2xl mr-2">
                    {(['minimal', 'classic', 'premium'] as const).map((template) => (
                        <button 
                            key={template}
                            onClick={() => setSelectedTemplate(template)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                selectedTemplate === template 
                                    ? 'bg-white text-primary shadow-sm' 
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {template === 'minimal' ? 'Minimal' : template === 'classic' ? 'Classique' : 'Premium'}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Button variant="outline"
                        onClick={() => onPrint('invoice')}
                        className="rounded-xl font-bold text-xs h-10 border-muted/20">
                        <Printer className="mr-2 h-4 w-4"/>
                        Imprimer
                    </Button>
                    <Button variant="outline"
                        onClick={onDownload}
                        className="rounded-xl font-bold text-xs h-10 border-muted/20">
                        <Download className="mr-2 h-4 w-4"/>
                        PDF
                    </Button>
                </div>
            </div>
        </div>
    );
}
