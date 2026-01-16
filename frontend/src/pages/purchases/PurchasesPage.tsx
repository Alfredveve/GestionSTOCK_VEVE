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
import { Truck, Search, CheckCircle2, Clock } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Receipt } from '@/services/inventoryService';

const formatCurrency = (amount: string | number) => {
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency: 'GNF',
    maximumFractionDigits: 0
  }).format(Number(amount));
};

export function PurchasesPage() {
  const { data: receipts, isLoading } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => inventoryService.getReceipts(),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Achats & Réceptions</h2>
          <p className="text-muted-foreground">Suivez vos approvisionnements et bons de réception fournisseurs.</p>
        </div>
        <Button className="shadow-lg shadow-primary/20 transition-all hover:scale-105">
          <Truck className="mr-2 h-4 w-4" />
          Nouveau Bon
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par numéro ou fournisseur..." className="pl-10" />
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-muted/20">
                <TableHead className="pl-6 font-bold uppercase text-[11px] tracking-wider">N° Bon</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Fournisseur</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Statut</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Date</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider text-right pr-6">Total HT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Chargement...</TableCell>
                </TableRow>
              ) : receipts?.results?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Aucun bon trouvé.</TableCell>
                </TableRow>
              ) : receipts?.results?.map((receipt: Receipt) => (
                <TableRow key={receipt.id} className="group border-muted/20 hover:bg-muted/10 transition-colors">
                  <TableCell className="pl-6 font-mono text-xs font-bold text-primary">
                    {receipt.receipt_number}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-foreground">{receipt.supplier_name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`gap-1 font-bold text-[10px] uppercase ${
                      receipt.status === 'received' ? 'bg-emerald-500/10 text-emerald-500' :
                      'bg-amber-500/10 text-amber-500'
                    }`} variant="outline">
                      {receipt.status === 'received' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {receipt.status === 'received' ? 'Reçu' : 'En attente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(receipt.date_received).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right pr-6 font-black">
                    {formatCurrency(receipt.total_amount)}
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
