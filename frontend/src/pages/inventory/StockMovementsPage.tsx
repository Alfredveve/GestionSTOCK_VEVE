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
import { Search, ArrowUpRight, ArrowDownLeft, MoveHorizontal } from 'lucide-react';
import { Input } from "@/components/ui/input";
import type { StockMovement } from '@/services/inventoryService';

export function StockMovementsPage() {
  const { data: movements, isLoading } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: () => inventoryService.getStockMovements(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-foreground">Mouvements de Stock</h2>
        <p className="text-muted-foreground">Suivez toutes les entrées, sorties et transferts de marchandises.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par référence ou produit..." className="pl-10" />
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-muted/20">
                <TableHead className="pl-6 font-bold uppercase text-[11px] tracking-wider">Date</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Produit</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider">Type</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider text-right">Quantité</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-wider text-right">Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Chargement...</TableCell>
                </TableRow>
              ) : movements?.results?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Aucun mouvement trouvé.</TableCell>
                </TableRow>
              ) : movements?.results?.map((movement: StockMovement) => (
                <TableRow key={movement.id} className="group border-muted/20 hover:bg-muted/10 transition-colors">
                  <TableCell className="pl-6 text-xs text-muted-foreground">
                    {new Date(movement.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-foreground">{movement.product_name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1 font-bold text-[10px] uppercase ${
                      movement.movement_type === 'sale' ? 'text-rose-500 bg-rose-500/5' :
                      movement.movement_type === 'restock' ? 'text-emerald-500 bg-emerald-500/5' :
                      'text-blue-500 bg-blue-500/5'
                    }`}>
                      {movement.movement_type === 'sale' ? <ArrowUpRight className="h-3 w-3" /> : 
                       movement.movement_type === 'restock' ? <ArrowDownLeft className="h-3 w-3" /> : 
                       <MoveHorizontal className="h-3 w-3" />}
                      {movement.type_display}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-black">
                    {movement.quantity}
                  </TableCell>
                  <TableCell className="text-right pr-6 font-mono text-[10px] text-muted-foreground">
                    {movement.reference || '-'}
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
