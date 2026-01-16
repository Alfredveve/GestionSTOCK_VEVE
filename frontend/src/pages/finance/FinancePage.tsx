import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Plus
} from 'lucide-react';
import inventoryService from '@/services/inventoryService';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { useState } from 'react';
import { ExpenseForm } from '@/components/finance/ExpenseForm';

export function FinancePage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { data: expenses, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => inventoryService.getExpenses(),
  });

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'GNF',
      maximumFractionDigits: 0
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Finance</h2>
          <p className="text-muted-foreground">Suivez vos revenus, dépenses et rentabilité en temps réel.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-primary/20 hover:bg-primary/5">Exporer Rapport</Button>
          <Button onClick={() => setIsFormOpen(true)} className="shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle Dépense
          </Button>
        </div>
      </div>

      <ExpenseForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-linear-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 shadow-xl shadow-emerald-500/5">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-1">Revenus (Ce mois)</p>
                <h3 className="text-3xl font-black">24.500.000 <span className="text-sm font-normal text-muted-foreground">GNF</span></h3>
              </div>
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-600">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-600 font-bold">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +12.5% par rapport au mois dernier
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20 shadow-xl shadow-rose-500/5">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-1">Dépenses (Ce mois)</p>
                <h3 className="text-3xl font-black">4.200.000 <span className="text-sm font-normal text-muted-foreground">GNF</span></h3>
              </div>
              <div className="p-2 bg-rose-500/20 rounded-lg text-rose-600">
                <TrendingDown className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-rose-600 font-bold">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              -5.2% par rapport au mois dernier
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-primary/10 to-primary/5 border-primary/20 shadow-xl shadow-primary/5">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-primary mb-1">Profit Net Estimé</p>
                <h3 className="text-3xl font-black">20.300.000 <span className="text-sm font-normal text-muted-foreground">GNF</span></h3>
              </div>
              <div className="p-2 bg-primary/20 rounded-lg text-primary">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-primary font-bold">
              Stable
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-2xl bg-card/40 backdrop-blur-md overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <CardTitle className="text-xl font-black flex items-center">
            <Calendar className="mr-3 h-5 w-5 text-primary" />
            Dépenses Récentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/10 border-muted/30">
                <TableHead className="py-4 pl-6 font-bold uppercase text-[10px] tracking-widest">Référence</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Catégorie</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Description</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Montant</TableHead>
                <TableHead className="pr-6 font-bold uppercase text-[10px] tracking-widest">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingExpenses ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                    Chargement des transactions...
                  </TableCell>
                </TableRow>
              ) : expenses?.results?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                    Aucune dépense enregistrée.
                  </TableCell>
                </TableRow>
              ) : expenses?.results?.map((expense: { id: number, reference: string, category_name: string, amount: string, date: string, description: string }) => (
                <TableRow key={expense.id} className="group border-muted/20 hover:bg-muted/10 transition-colors">
                  <TableCell className="pl-6 font-mono text-[10px] text-muted-foreground">
                    {expense.reference}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 text-[10px] font-bold uppercase tracking-wider">
                      {expense.category_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-black text-rose-500">
                    -{formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground italic">
                    {new Date(expense.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground opacity-70">
                    {expense.description || '-'}
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
