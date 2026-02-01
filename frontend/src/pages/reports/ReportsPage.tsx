import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Download,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from '@tanstack/react-query';
import dashboardService from '@/services/dashboardService';
import { formatCurrency } from '@/lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

interface HistoryItem {
  date: string;
  revenue: number;
  orders: number;
}

export function ReportsPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
  });

  const chartData = stats?.sales_history?.map((item: { date: string; revenue: string | number; orders: number }) => ({
    name: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    revenue: Number(item.revenue),
    orders: item.orders,
    date: item.date
  })) || [];

  const categoryData = stats?.category_stats?.map((item: { category_name: string; total_revenue: string | number }) => ({
    name: item.category_name,
    value: Number(item.total_revenue)
  })) || [];

  const handleExport = (type: 'pdf' | 'excel') => {
    if (type === 'pdf') {
      dashboardService.exportPdf();
    } else {
      dashboardService.exportExcel();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Rapports & Analyses</h1>
          <p className="text-sm text-slate-500 font-medium">Visualisez les performances de votre entreprise</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="rounded-xl font-bold h-10">
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} className="rounded-xl font-bold h-10">
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Chiffre d'Affaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">
              {stats ? formatCurrency(stats.total_revenue) : '...'}
            </div>
            <p className="text-xs text-emerald-500 mt-1 flex items-center">
              <TrendingUp className="mr-1 h-3 w-3" />
              Performances globales
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Volume Mensuel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">
              {stats ? formatCurrency(stats.monthly_revenue) : '...'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center">
              <BarChart3 className="mr-2 h-5 w-5 text-primary" />
              Évolution des Ventes (30 jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
              <>
                <div className="text-xs text-muted-foreground mb-4">
                  {chartData.length} jours de données | 
                  Total: {formatCurrency(chartData.reduce((sum: number, item: HistoryItem) => sum + (item.revenue || 0), 0))}
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.15} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: 'hsl(var(--muted-foreground))'}} height={50} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: 'hsl(var(--muted-foreground))'}} width={60} />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(Number(value || 0))}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée disponible</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center">
              <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
              Ventes par Catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" animationBegin={0} animationDuration={800}>
                      {categoryData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(Number(value || 0))}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">Aucune donnée disponible</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-primary" />
              Tendances de Commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.15} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: 'hsl(var(--muted-foreground))'}} height={50} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: 'hsl(var(--muted-foreground))'}} width={60} />
                  <Tooltip 
                    formatter={(value: any) => [`${value} commandes`, 'Commandes']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-primary" />
              Flux de Trésorerie estimé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.15} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: 'hsl(var(--muted-foreground))'}} height={50} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: 'hsl(var(--muted-foreground))'}} width={60} />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value || 0))}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
