import { Button } from "@/components/ui/button";
import { Printer, Download, Ticket, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface InvoiceActionsProps {
    onPrint: (type: 'invoice' | 'ticket') => void;
    onDownload: () => void;
}

export function InvoiceActions({ onPrint, onDownload }: InvoiceActionsProps) {
    return (
        <div className="bg-card rounded-2xl p-6 shadow-xs border border-muted/20 space-y-4 no-print">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">Actions</h3>

            <Button className="w-full justify-start rounded-xl h-12 text-base font-bold shadow-lg shadow-primary/20"
                onClick={() => onPrint('invoice')}>
                <Printer className="mr-3 h-5 w-5"/>
                Imprimer Facture
            </Button>

            <Button variant="outline" className="w-full justify-start rounded-xl h-12 text-base font-bold border-muted/20"
                onClick={onDownload}>
                <Download className="mr-3 h-5 w-5"/>
                Télécharger PDF
            </Button>

            <Button variant="secondary" className="w-full justify-start rounded-xl h-12 text-base font-bold bg-amber-500 text-white hover:bg-amber-600"
                onClick={() => onPrint('ticket')}>
                <Ticket className="mr-3 h-5 w-5"/>
                Imprimer Ticket
            </Button>

            <Button variant="outline" className="w-full justify-start rounded-xl h-12 text-base font-bold border-muted/20"
                onClick={() => toast.info("Fonctionnalité d'envoi d'email à venir")}>
                <Mail className="mr-3 h-5 w-5"/>
                Envoyer par Email
            </Button>
        </div>
    );
}
