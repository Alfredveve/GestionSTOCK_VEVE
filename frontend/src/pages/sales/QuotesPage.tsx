import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Search, FileDown, Rocket, CheckCircle2, Clock } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Quote } from '@/services/inventoryService';

const formatCurrency = (amount: string | number) => {
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency: 'GNF',
    maximumFractionDigits: 0
  }).format(Number(amount));
};

export function QuotesPage() {
  const queryClient = useQueryClient();
  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => inventoryService.getQuotes(),
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) => inventoryService.convertQuoteToInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Devis</h2>
          <p className="text-muted-foreground">Gérez vos devis clients et convertissez-les en factures.</p>
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
                <TableHead className="pl-6 font-bold uppercase text-[11px] tracking-wider">N° Devis</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Client</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Statut</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Validité</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider text-right">Total TTC</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Chargement...</TableCell>
                </TableRow>
              ) : quotes?.results?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Aucun devis trouvé.</TableCell>
                </TableRow>
              ) : quotes?.results?.map((quote: Quote) => (
                <TableRow key={quote.id} className="group border-muted/20 hover:bg-muted/10 transition-colors">
                  <TableCell className="pl-6 font-mono text-xs font-bold text-primary">
                    {quote.quote_number}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-foreground">{quote.client_name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`gap-1 font-bold text-[10px] uppercase ${
                      quote.status === 'converted' ? 'bg-emerald-500/10 text-emerald-500' :
                      quote.status === 'sent' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-muted text-muted-foreground'
                    }`} variant="outline">
                      {quote.status === 'converted' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {quote.status === 'converted' ? 'Converti' : quote.status === 'sent' ? 'Envoyé' : 'Brouillon'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    Valide au {new Date(quote.valid_until).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right font-black">
                    {formatCurrency(quote.total_amount)}
                  </TableCell>
                  <TableCell className="text-right pr-6 space-x-2">
                    {quote.status !== 'converted' && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={() => convertMutation.mutate(quote.id)}
                        disabled={convertMutation.isPending}
                      >
                        <Rocket className="h-3.5 w-3.5 mr-1" />
                        Facturer
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <FileDown className="h-3.5 w-3.5" />
                    </Button>
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
