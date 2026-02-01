import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Cell,
  Pie
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from '@/lib/utils';

interface DashboardStats {
  monthly_revenue: number;
  monthly_expenses: number;
  net_profit: number;
  monthly_history: Array<{ name: string; revenue: number; expenses?: number; profit?: number }>;
}

interface FinanceOverviewProps {
  stats: DashboardStats | undefined;
}

const COLORS = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'];

export function FinanceOverview({ stats }: FinanceOverviewProps) {
  const chartData = stats?.monthly_history || [];
  
  // Fake data for category breakdown if not provided by API yet
  // Once backend supports this, it should come from stats.stock_distribution_by_category or similar
  const categoryData = [
    { name: 'Fournisseurs', value: 4500000 },
    { name: 'Salaires', value: 2800000 },
    { name: 'Loyer', value: 1500000 },
    { name: 'Logistique', value: 800000 },
    { name: 'Autres', value: 400000 },
  ];

  const totalExpenses = categoryData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <CardTitle className="text-sm font-medium opacity-90 text-white">Profit Net</CardTitle>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Revenue vs Expenses Area Chart */}
        <Card className="lg:col-span-3 border-none shadow-2xl bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-primary" />
              Flux de Trésorerie
            </CardTitle>
            <CardDescription>Comparaison mensuelle des revenus et charges.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
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
                    tick={{fontSize: 10, fill: '#64748b'}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#64748b'}}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip 
                    formatter={(value: number | undefined) => formatCurrency(value || 0)}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      fontSize: '12px'
                    }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Revenus"
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    name="Dépenses"
                    stroke="#f43f5e" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorExpenses)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Category Breakdown */}
        <Card className="lg:col-span-2 border-none shadow-2xl bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center">
              <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
              Répartition des Dépenses
            </CardTitle>
            <CardDescription>Par catégorie principale.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number | undefined) => formatCurrency(value || 0)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] } as React.CSSProperties}
                    ></div>
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-bold">{((item.value / totalExpenses) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
