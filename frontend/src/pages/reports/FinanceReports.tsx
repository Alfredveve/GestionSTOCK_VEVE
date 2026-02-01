import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  CreditCard
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from '@tanstack/react-query';
import dashboardService from '@/services/dashboardService';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HistoryItem {
  name: string;
  revenue: number;
  expenses?: number;
  profit?: number;
}

interface ActivityItem {
  id: number;
  type: string;
  description: string;
  date: string;
  amount: number;
  reference: string;
}

// Discount Analytics Components
function DiscountAnalyticsSection() {
  const { data: discountData, isLoading } = useQuery({
    queryKey: ['discount-analytics'],
    queryFn: () => dashboardService.getDiscountAnalytics(),
  });

  if (isLoading || !discountData) {
    return <div className="text-center text-muted-foreground">Chargement...</div>;
  }

  const grossRevenue = Number(discountData.gross_revenue) || 0;
  const netRevenue = Number(discountData.net_revenue) || 0;
  const totalDiscounts = Number(discountData.total_discounts) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">CA Brut</div>
          <div className="text-2xl font-black text-blue-600">{formatCurrency(grossRevenue)}</div>
          <div className="text-xs text-muted-foreground">Avant remises</div>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Remises</div>
          <div className="text-2xl font-black text-rose-600">-{formatCurrency(totalDiscounts)}</div>
          <div className="text-xs text-muted-foreground">Total accordé</div>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">CA Net</div>
          <div className="text-2xl font-black text-emerald-600">{formatCurrency(netRevenue)}</div>
          <div className="text-xs text-muted-foreground">Après remises</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Impact des remises</span>
          <span className="font-bold text-rose-600">
            {grossRevenue > 0 ? ((totalDiscounts / grossRevenue) * 100).toFixed(2) : 0}%
          </span>
        </div>
        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-linear-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500" 
            style={{ width: `${grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0}%` } as React.CSSProperties}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

function DiscountRateCard() {
  const { data: discountData, isLoading } = useQuery({
    queryKey: ['discount-analytics'],
    queryFn: () => dashboardService.getDiscountAnalytics(),
  });

  if (isLoading || !discountData) {
    return <div className="text-center text-muted-foreground">Chargement...</div>;
  }

  const discountRate = Number(discountData.discount_rate) || 0;
  const invoiceCount = Number(discountData.invoice_count) || 0;
  const orderCount = Number(discountData.order_count) || 0;

  return (
    <div className="space-y-4">
      <div className="text-4xl font-black">{discountRate.toFixed(2)}%</div>
      <p className="text-xs opacity-80 mt-1">Du chiffre d'affaires brut</p>
      
      <div className="pt-4 border-t border-white/20">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{invoiceCount}</div>
            <div className="text-xs opacity-80">Factures</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{orderCount}</div>
            <div className="text-xs opacity-80">Commandes</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinanceReports() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
  });

  const chartData = (stats?.monthly_history || []) as HistoryItem[];
  const recentActivities = (stats?.recent_activities || []) as ActivityItem[];

  const averageRevenue = chartData.length > 0 
    ? chartData.reduce((acc: number, curr: HistoryItem) => acc + (curr.revenue || 0), 0) / chartData.length 
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-linear-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Finance & Paiements
          </h2>
          <p className="text-muted-foreground">Analyse détaillée de la santé financière et des flux de trésorerie.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="shadow-sm">
            <Calendar className="mr-2 h-4 w-4" />
            Période: 30 jours
          </Button>
          <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Download className="mr-2 h-4 w-4" />
            Exporter Rapport
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl bg-linear-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90 text-white">Revenu Total</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{formatCurrency(stats?.monthly_revenue || 0)}</div>
            <p className="text-xs opacity-80 mt-1 flex items-center">
              <ArrowUpRight className="h-3 w-3 mr-1" /> +12.5% vs mois dernier
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-linear-to-br from-rose-500 to-rose-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90 text-white">Dépenses Totales</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingDown className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{formatCurrency(stats?.monthly_expenses || 0)}</div>
            <p className="text-xs opacity-80 mt-1 flex items-center">
              <ArrowDownRight className="h-3 w-3 mr-1" /> -4.2% vs mois dernier
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90 text-white">Bénéfice Net</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <Wallet className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{formatCurrency(stats?.net_profit || 0)}</div>
            <div className="mt-2 h-1 w-full bg-white/20 rounded-full overflow-hidden">
               <div className="h-full bg-white w-[65%]"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Moyenne Quotidienne</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(averageRevenue / 30)}</div>
            <p className="text-xs text-muted-foreground mt-1">Estimé sur 30 jours</p>
          </CardContent>
        </Card>
      </div>

      {/* Discount Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-xl bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Analyse des Remises</CardTitle>
            <CardDescription>CA Brut vs CA Net - Impact des remises commerciales</CardDescription>
          </CardHeader>
          <CardContent>
            <DiscountAnalyticsSection />
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-linear-to-br from-amber-500 to-amber-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90 text-white">Taux de Remise Moyen</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingDown className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <DiscountRateCard />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue vs Expenses Area Chart */}
        <Card className="lg:col-span-2 border-none shadow-2xl bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Flux de Trésorerie Mensuel</CardTitle>
            <CardDescription>Comparaison entre les revenus et les charges opérationnelles.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 12, fill: '#64748b'}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 12, fill: '#64748b'}}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip 
                    formatter={(value: number | undefined) => formatCurrency(value || 0)}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                      padding: '12px'
                    }}
                  />
                  <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Revenus"
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    name="Dépenses"
                    stroke="#f43f5e" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorExpenses)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods / Profit Summary Card */}
        <Card className="border-none shadow-2xl bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Performance Financière</CardTitle>
            <CardDescription>Ratios et indicateurs clés.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Marge Bénéficiaire</span>
                <span className="font-bold text-primary">
                  {stats?.monthly_revenue ? ((stats.net_profit / stats.monthly_revenue) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full" 
                  style={{ width: `${stats?.monthly_revenue ? (stats.net_profit / stats.monthly_revenue) * 100 : 0}%` } as React.CSSProperties}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <Receipt className="h-5 w-5 text-blue-500 mb-2" />
                <div className="text-lg font-bold">248</div>
                <div className="text-xs text-muted-foreground">Factures émises</div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                <CreditCard className="h-5 w-5 text-emerald-500 mb-2" />
                <div className="text-lg font-bold">182</div>
                <div className="text-xs text-muted-foreground">Paiements validés</div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Flux récents</h4>
              {recentActivities.slice(0, 3).map((activity: ActivityItem) => (
                <div key={activity.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${activity.type === 'Vente' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {activity.type === 'Vente' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{activity.description}</div>
                      <div className="text-[10px] text-muted-foreground">{format(new Date(activity.date), 'dd MMM yyyy', { locale: fr })}</div>
                    </div>
                  </div>
                  <div className={`text-sm font-black ${activity.type === 'Vente' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {activity.type === 'Vente' ? '+' : '-'}{formatCurrency(activity.amount)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions Table */}
        <Card className="lg:col-span-3 border-none shadow-2xl bg-card/40 backdrop-blur-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Rapport de Transactions</CardTitle>
              <CardDescription>Liste exhaustive des derniers mouvements financiers.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-primary font-bold">Voir tout</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Référence</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Catégorie</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest">Montant</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentActivities.slice(0, 6).map((item: ActivityItem) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.reference}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">{format(new Date(item.date), 'dd MMMM yyyy', { locale: fr })}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          item.type === 'Vente' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right text-sm font-black ${item.type === 'Vente' ? 'text-emerald-500' : 'text-rose-500'}`}>
                         {item.type === 'Vente' ? '+' : '-'}{formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-500">
                          Confirmé
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
