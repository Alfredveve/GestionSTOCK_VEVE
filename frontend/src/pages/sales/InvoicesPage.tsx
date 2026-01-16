import { useQuery } from '@tanstack/react-query';
import inventoryService from '@/services/inventoryService';
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import type { Invoice } from '@/services/inventoryService';

const formatCurrency = (amount: string | number) => {
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency: 'GNF',
    maximumFractionDigits: 0
  }).format(Number(amount));
};

export function InvoicesPage() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => inventoryService.getInvoices(),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Facturation</h2>
          <p className="text-muted-foreground">Gérez vos factures clients et suivez les paiements.</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par numéro ou client..." className="pl-10" />
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-muted/20">
                <TableHead className="pl-6 font-bold uppercase text-[11px] tracking-wider">N° Facture</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Client</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Statut</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Date</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider text-right">Total TTC</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider text-right pr-6">Reste à payer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Chargement...</TableCell>
                </TableRow>
              ) : invoices?.results?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Aucune facture trouvée.</TableCell>
                </TableRow>
              ) : invoices?.results?.map((invoice: Invoice) => (
                <TableRow key={invoice.id} className="group border-muted/20 hover:bg-muted/10 transition-colors cursor-pointer">
                  <TableCell className="pl-6 font-mono text-xs font-bold text-primary">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-foreground">{invoice.client_name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`gap-1 font-bold text-[10px] uppercase ${
                      invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                      invoice.status === 'partial' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-rose-500/10 text-rose-500'
                    }`} variant="outline">
                      {invoice.status === 'paid' ? <CheckCircle2 className="h-3 w-3" /> :
                       invoice.status === 'partial' ? <Clock className="h-3 w-3" /> :
                       <AlertCircle className="h-3 w-3" />}
                      {invoice.status === 'paid' ? 'Payée' : invoice.status === 'partial' ? 'Partiel' : 'Impayée'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(invoice.date_issued).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right font-black">
                    {formatCurrency(invoice.total_amount)}
                  </TableCell>
                  <TableCell className="text-right pr-6 font-bold text-rose-500">
                    {formatCurrency(invoice.balance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
