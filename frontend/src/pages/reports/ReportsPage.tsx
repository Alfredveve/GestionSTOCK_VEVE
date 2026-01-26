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
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from '@tanstack/react-query';
import dashboardService from '@/services/dashboardService';
import { formatCurrency } from '@/lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export function ReportsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
  });

  const chartData = stats?.monthly_history || [];
  const categoryData = stats?.stock_distribution_by_category || [];

  console.log('📊 Dashboard Stats:', stats);
  console.log('📈 Chart Data:', chartData);
  console.log('📊 Category Data:', categoryData);

  const handleExport = async (type: 'pdf' | 'excel') => {
    try {
      const data = type === 'pdf' 
        ? await dashboardService.exportPdf() 
        : await dashboardService.exportExcel();
      
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      const extension = type === 'pdf' ? 'pdf' : 'xlsx';
      link.setAttribute('download', `Rapport_Ventes_${new Date().toISOString().split('T')[0]}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error(`Export ${type} failed:`, error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Rapports & Analyses</h2>
          <p className="text-muted-foreground">Visualisez les performances de votre entreprise.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Derniers 30 jours
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleExport('excel')}
          >
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button 
            size="sm"
            onClick={() => handleExport('pdf')}
          >
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-md bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium italic">CA Total (30j)</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">
              {stats ? formatCurrency(stats.monthly_revenue) : '...'}
            </div>
            {/* <p className="text-xs text-muted-foreground mt-1">+20% vs mois dernier</p> */}
          </CardContent>
        </Card>
        {/* Add more summary cards if needed */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
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
                {/* Debug info */}
                <div className="text-xs text-muted-foreground mb-4">
                  {chartData.length} jours de données | 
                  Total: {formatCurrency(chartData.reduce((sum, item) => sum + (item.revenue || 0), 0))}
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.15} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 11, fill: 'hsl(var(--muted-foreground))'}}
                      height={50}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 11, fill: 'hsl(var(--muted-foreground))'}}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                        return value.toString();
                      }}
                      width={60}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'hsl(var(--popover))',
                        color: 'hsl(var(--popover-foreground))'
                      }}
                      cursor={{fill: 'rgba(59, 130, 246, 0.1)', radius: 4}}
                      labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="#3b82f6" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={50}
                      minPointSize={2}
                      name="Ventes"
                      animationDuration={1000}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">Pas de données disponibles</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center">
              <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
              Valeur du Stock par Catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {categoryData.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'hsl(var(--popover))',
                      color: 'hsl(var(--popover-foreground))'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">Pas de données disponibles</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Analyse de Rentabilité (Ventes vs Dépenses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart 
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.15} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 11, fill: 'hsl(var(--muted-foreground))'}}
                  height={50}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 11, fill: 'hsl(var(--muted-foreground))'}}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                    return value.toString();
                  }}
                  width={60}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'hsl(var(--popover))',
                    color: 'hsl(var(--popover-foreground))'
                  }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  iconType="line"
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Ventes" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} 
                  activeDot={{r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}}
                  animationDuration={800}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  name="Dépenses" 
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  dot={{r: 3, fill: '#ef4444', strokeWidth: 2, stroke: '#fff'}} 
                  activeDot={{r: 6, fill: '#ef4444', strokeWidth: 2, stroke: '#fff'}}
                  animationDuration={800}
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  name="Profit" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} 
                  activeDot={{r: 7, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}}
                  animationDuration={800}
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                />
              </LineChart>
            </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">Pas de données disponibles</div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-purple-500" />
              Top 5 Produits les plus vendus (Revenus)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {stats?.top_selling_products?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={stats.top_selling_products} 
                  layout="vertical" 
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="colorTopProducts" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.15} />
                  <XAxis 
                    type="number" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 11, fill: 'hsl(var(--muted-foreground))'}}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                      return value.toString();
                    }}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={200} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 11, fill: 'hsl(var(--muted-foreground))'}}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'hsl(var(--popover))',
                      color: 'hsl(var(--popover-foreground))'
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                    cursor={{fill: 'rgba(139, 92, 246, 0.1)'}}
                  />
                  <Bar 
                    dataKey="value" 
                    name="Revenu Total" 
                    fill="url(#colorTopProducts)" 
                    radius={[0, 8, 8, 0]} 
                    maxBarSize={32}
                    animationDuration={800}
                    animationBegin={0}
                  />
                </BarChart>
              </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">Pas de données disponibles</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
