import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ReTooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import inventoryService from '@/services/inventoryService';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { formatCurrency } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign, Loader2, BarChart3 } from 'lucide-react';

export function ProfitReport() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ['profit-reports'],
    queryFn: () => inventoryService.getProfitReports(),
  });

  // Prepare chart data from reports
  const chartData = (reports?.results || []).slice(0, 6).map(r => ({
    name: `${r.month}/${r.year}`,
    gross: parseFloat(r.gross_profit),
    net: parseFloat(r.net_interest),
    expenses: parseFloat(r.total_expenses)
  })).reverse();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Analytics Card */}
        <Card className="lg:col-span-2 border-none shadow-2xl bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black flex items-center">
              <Calculator className="mr-2 h-5 w-5 text-primary" />
              Analyse Comparative de Rentabilité
            </CardTitle>
            <CardDescription>Vue d'ensemble sur les 6 derniers mois.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 12, fill: '#64748b'}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#64748b'}}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <ReTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" align="right" />
                  <Bar dataKey="gross" name="Profit Brut" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="net" name="Intérêt Net" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Global Summary */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-linear-to-br from-slate-800 to-slate-900 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/10 rounded-2xl">
                   <DollarSign className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs opacity-70 font-bold uppercase tracking-wider">Cumul Annuel (Net)</p>
                  <h3 className="text-2xl font-black">12.450.000 GNF</h3>
                </div>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[72%]"></div>
              </div>
              <p className="text-[10px] mt-2 opacity-60">Objectif annuel : 17.500.000 GNF</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center">
                <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                Dernière Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Mois dernier</span>
                  <span className="font-bold text-emerald-500">+14%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Marge Moyenne</span>
                  <span className="font-bold text-blue-500">32.5%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reports Table */}
      <Card className="border-none shadow-2xl bg-card/40 backdrop-blur-md overflow-hidden">
        <CardHeader className="border-b border-white/10 bg-muted/5 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                Historique des Rapports Mensuels
              </CardTitle>
              <CardDescription className="ml-11">Suivi détaillé de la performance par période.</CardDescription>
            </div>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1">
              Exercice {new Date().getFullYear()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border-t border-white/5">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10 border-white/5 hover:bg-muted/20">
                  <TableHead className="py-5 pl-6 font-bold uppercase text-[11px] tracking-widest text-muted-foreground w-[180px]">Période</TableHead>
                  <TableHead className="font-bold uppercase text-[11px] tracking-widest text-muted-foreground">Ventes Brutes</TableHead>
                  <TableHead className="font-bold uppercase text-[11px] tracking-widest text-muted-foreground">COGS (Achats)</TableHead>
                  <TableHead className="font-bold uppercase text-[11px] tracking-widest text-muted-foreground">Charges</TableHead>
                  <TableHead className="font-bold uppercase text-[11px] tracking-widest text-muted-foreground">Profit Brut</TableHead>
                  <TableHead className="pr-6 font-bold uppercase text-[11px] tracking-widest text-right text-muted-foreground">Intérêt Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                   <TableRow>
                     <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
                          <span className="text-sm font-medium animate-pulse">Calcul des rapports en cours...</span>
                        </div>
                     </TableCell>
                   </TableRow>
                ) : reports?.results?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                       <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/60">
                         <BarChart3 className="h-8 w-8 mb-2" />
                         <span className="text-sm font-medium">Aucune donnée financière disponible pour le moment.</span>
                       </div>
                    </TableCell>
                  </TableRow>
                ) : reports?.results?.map((r) => (
                  <TableRow key={r.id} className="group border-white/5 hover:bg-white/5 transition-all duration-200">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                        <span className="font-bold text-sm text-foreground/90 capitalize">
                          {new Date(r.year, r.month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground/70 group-hover:text-foreground transition-colors">{formatCurrency(r.total_sales_brut)}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground/70 group-hover:text-foreground transition-colors">{formatCurrency(r.total_cost_of_goods)}</TableCell>
                    <TableCell className="text-sm font-medium text-rose-500">-{formatCurrency(r.total_expenses)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors font-bold">
                        {formatCurrency(r.gross_profit)}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <span className="text-emerald-500 dark:text-emerald-400 font-black text-base shadow-sm">
                        {formatCurrency(r.net_interest)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
