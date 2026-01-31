import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  AlertTriangle,
  Layers,
  Search,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
  Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import dashboardService from '@/services/dashboardService';
import { formatCurrency } from '@/lib/utils';

interface CategoryData {
  name: string;
  value: number;
  [key: string]: unknown;
}

interface ProductData {
  name: string;
  value: number;
  quantity: number;
}

interface MovementEvolution {
  name: string;
  entries: number;
  exits: number;
}

interface LowStockProduct {
  id: number;
  name: string;
  quantity: number;
  threshold: number;
  image: string | null;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export function AdvancedAnalytics() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
  });

  const categoryData = (stats?.stock_distribution_by_category || []) as CategoryData[];
  const topProducts = (stats?.top_selling_products || []) as ProductData[];
  const movementEvolution = (stats?.stock_movement_evolution || []) as MovementEvolution[];
  // Handle paginated response structure
  const lowStockProductsData = stats?.low_stock_products;
  const lowStockProducts = (Array.isArray(lowStockProductsData) ? lowStockProductsData : lowStockProductsData?.results || []) as LowStockProduct[];

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
          <h2 className="text-3xl font-black tracking-tight bg-linear-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            Analyses Avancées
          </h2>
          <p className="text-muted-foreground">Insights stratégiques sur les stocks et les performances de vente.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <input 
               type="text" 
               placeholder="Rechercher analyse..." 
               className="pl-10 pr-4 py-2 rounded-xl bg-card border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm w-[200px]"
             />
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 rounded-xl">
             Intelligence Artificielle <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Analytics KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-xl bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800">
          <CardContent className="pt-6">
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Valeur Totale du Stock</p>
                   <h3 className="text-3xl font-black mt-1">{formatCurrency(stats?.total_stock_value || 0)}</h3>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                   <Package className="h-7 w-7" />
                </div>
             </div>
             <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary" className="bg-indigo-200 text-indigo-800 dark:bg-indigo-800/40 dark:text-indigo-300">ACTIF</Badge>
                <span className="text-xs text-muted-foreground">{stats?.total_products_count} références au total</span>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800">
          <CardContent className="pt-6">
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Alertes de Rupture</p>
                   <h3 className="text-3xl font-black mt-1 text-rose-600">{stats?.low_stock_count || 0}</h3>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                   <AlertTriangle className="h-7 w-7" />
                </div>
             </div>
             <div className="mt-4 flex items-center gap-2">
                <Badge variant="destructive" className="animate-pulse">CRITIQUE</Badge>
                <span className="text-xs text-muted-foreground">Action requise immédiatement</span>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800">
          <CardContent className="pt-6">
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Volume de Ventes</p>
                   <h3 className="text-3xl font-black mt-1">{stats?.today_orders || 0}</h3>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                   <TrendingUp className="h-7 w-7" />
                </div>
             </div>
             <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
                <ArrowRight className="h-3 w-3" /> Aujourd'hui
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products Chart */}
        <Card className="border-none shadow-2xl bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
               <div className="p-3 bg-purple-100 dark:bg-purple-900/20 text-purple-600 rounded-xl">
                  <BarChart3 className="h-6 w-6" />
               </div>
               <div>
                  <CardTitle className="text-xl font-bold">Performance Produits</CardTitle>
                  <CardDescription>Top 5 des produits par chiffre d'affaires.</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ left: 50 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 12, fontWeight: 600, fill: '#64748b'}} 
                    width={150} 
                  />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value?: unknown) => formatCurrency(Number(value || 0))}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} barSize={28}>
                    {topProducts.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#a78bfa'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stock Movement Evolution */}
        <Card className="border-none shadow-2xl bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
               <div className="p-3 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                  <Layers className="h-6 w-6" />
               </div>
               <div>
                  <CardTitle className="text-xl font-bold">Dynamique des Stocks</CardTitle>
                  <CardDescription>Entrées vs Sorties sur les 30 derniers jours.</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={movementEvolution}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="entries" name="Entrées" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.1} />
                  <Line type="monotone" dataKey="exits" name="Sorties" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stock Distribution by Category */}
        <Card className="border-none shadow-2xl bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Répartition par Catégorie</CardTitle>
            <CardDescription>Valeur financière de l'inventaire par rayon.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-col md:flex-row items-center justify-between gap-8 h-[300px]">
                <div className="w-full md:w-1/2 h-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie
                           data={categoryData}
                           cx="50%"
                           cy="50%"
                           innerRadius={70}
                           outerRadius={100}
                           paddingAngle={8}
                           dataKey="value"
                         >
                           {categoryData.map((_, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Pie>
                         <Tooltip formatter={(value?: unknown) => formatCurrency(Number(value || 0))} />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-3">
                   {categoryData.slice(0, 5).map((category: CategoryData, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <div 
                              className="h-3 w-3 rounded-full bg-(--dot-color)" 
                              style={{ '--dot-color': COLORS[index % COLORS.length] } as React.CSSProperties}
                             />
                            <span className="text-sm font-medium">{category.name}</span>
                         </div>
                         <span className="text-sm font-black">{formatCurrency(category.value)}</span>
                      </div>
                   ))}
                </div>
             </div>
          </CardContent>
        </Card>

        {/* Low Stock Watchlist */}
        <Card className="border-none shadow-2xl bg-card/40 backdrop-blur-sm flex flex-col">
          <CardHeader>
             <div className="flex items-center justify-between">
                <div>
                   <CardTitle className="text-xl font-bold">Watchlist Stock Bas</CardTitle>
                   <CardDescription>Produits nécessitant un réapprovisionnement.</CardDescription>
                </div>
                <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none px-3 py-1">
                  Attention
                </Badge>
             </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
             <div className="space-y-4">
                {lowStockProducts.slice(0, 5).map((product: LowStockProduct) => (
                   <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-all cursor-pointer group">
                      <div className="flex items-center gap-4">
                         <div className="h-10 w-10 shrink-0 rounded-lg bg-white overflow-hidden border border-slate-200 shadow-sm transition-transform group-hover:scale-105">
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-full w-full p-2 text-slate-300" />
                            )}
                         </div>
                         <div>
                            <div className="text-sm font-bold group-hover:text-primary transition-colors">{product.name}</div>
                            <div className="text-xs text-muted-foreground">Seuil: {product.threshold} unités</div>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-sm font-black text-rose-500">{product.quantity} restants</div>
                         <div className="h-1.5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-rose-500" 
                              style={{ width: `${(product.quantity / product.threshold) * 100}%` }}
                            ></div>
                         </div>
                      </div>
                   </div>
                ))}
                {lowStockProducts.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <Package className="h-12 w-12 opacity-20 mb-2" />
                    <p>Tout est en ordre !</p>
                  </div>
                )}
             </div>
          </CardContent>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
             <Button 
               variant="ghost" 
               className="w-full text-primary font-bold group"
               onClick={() => navigate('/products')}
             >
                Consulter tout le stock <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
             </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
