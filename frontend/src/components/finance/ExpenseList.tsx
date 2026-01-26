import { 
  Calendar, 
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  Loader2
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from '@/lib/utils';

interface Expense {
  id: number;
  reference: string;
  category_name: string;
  description: string;
  amount: number;
  date: string;
}

interface PaginatedResponse<T> {
  results: T[];
  count: number;
}

interface ExpenseListProps {
  expenses: PaginatedResponse<Expense> | undefined;
  isLoading: boolean;
  onExportExcel: () => void;
  onExportPdf: () => void;
  isExporting: 'excel' | 'pdf' | null;
}

export function ExpenseList({ 
  expenses, 
  isLoading, 
  onExportExcel, 
  onExportPdf, 
  isExporting 
}: ExpenseListProps) {
  return (
    <Card className="border-none shadow-2xl bg-card/40 backdrop-blur-md overflow-hidden">
      <CardContent className="p-0">
        <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/20 border-b">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher une dépense..." 
              className="pl-9 bg-background border-none shadow-inner"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" size="sm" className="bg-background">
              <Filter className="mr-2 h-4 w-4" />
              Filtrer
            </Button>
            <div className="flex items-center gap-2 pl-2 border-l ml-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onExportExcel}
                disabled={isExporting !== null}
                title="Exporter Excel"
              >
                {isExporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onExportPdf}
                disabled={isExporting !== null}
                title="Exporter PDF"
              >
                {isExporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-rose-600" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-white/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-white/5 hover:bg-muted/20">
                <TableHead className="py-5 pl-6 font-bold uppercase text-[11px] tracking-widest text-muted-foreground">Référence</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-widest text-muted-foreground">Catégorie</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-widest text-muted-foreground">Description</TableHead>
                <TableHead className="font-bold uppercase text-[11px] tracking-widest text-muted-foreground">Montant</TableHead>
                <TableHead className="pr-6 font-bold uppercase text-[11px] tracking-widest text-right text-muted-foreground">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
                      <span className="text-sm font-medium animate-pulse">Chargement des transactions...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : expenses?.results?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/60">
                       <FileText className="h-8 w-8 mb-2" />
                       <span className="text-sm font-medium">Aucune dépense enregistrée pour cette période.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : expenses?.results?.map((expense) => (
                <TableRow key={expense.id} className="group border-white/5 hover:bg-white/5 transition-all duration-200">
                  <TableCell className="pl-6 font-mono text-xs text-muted-foreground font-medium group-hover:text-primary transition-colors">
                    {expense.reference}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-colors text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 shadow-sm shadow-primary/5">
                      {expense.category_name}
                    </Badge>
                  </TableCell>
                   <TableCell className="max-w-[250px] truncate text-sm text-foreground/80 group-hover:text-foreground transition-colors">
                    {expense.description || '-'}
                  </TableCell>
                  <TableCell className="font-black text-rose-500 text-sm tracking-tight">
                    -{formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <span className="flex items-center justify-end gap-2 text-muted-foreground text-xs font-medium bg-muted/20 px-2 py-1 rounded-md w-fit ml-auto group-hover:bg-muted/30 transition-colors">
                      <Calendar className="h-3 w-3" />
                      {new Date(expense.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
