import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { formatCurrency } from '@/lib/utils';
import type { OrderItem as InvoiceItem } from '@/services/salesService';

interface InvoiceItemsTableProps {
    items: InvoiceItem[];
}

export function InvoiceItemsTable({ items }: InvoiceItemsTableProps) {
    return (
        <div className="bg-card rounded-2xl shadow-xs border border-muted/20 overflow-hidden">
            <div className="p-6 border-b border-muted/20">
                <h3 className="text-lg font-black tracking-tight">Articles</h3>
            </div>
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow>
                        <TableHead className="pl-6 text-[10px] uppercase font-bold tracking-wider">Produit</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-wider text-center">Qté</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-wider text-right">P.U</TableHead>
                        <TableHead className="pr-6 text-[10px] uppercase font-bold tracking-wider text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items && items.length > 0 ? (
                        items.map((item) => (
                            <TableRow key={item.id} className="hover:bg-muted/10 transition-colors">
                                <TableCell className="pl-6 py-4">
                                    <div className="font-bold text-foreground text-sm">
                                        {item.product_name}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-mono">
                                        {item.product_sku}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center font-medium">
                                    {item.quantity}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {formatCurrency(Number(item.unit_price))}
                                </TableCell>
                                <TableCell className="pr-6 text-right font-bold">
                                    {formatCurrency(Number(item.total_price))}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                Aucun article trouvé
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
