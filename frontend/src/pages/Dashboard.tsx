import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  AlertTriangle,
  RefreshCw,
  ArrowUpRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import dashboardService from '@/services/dashboardService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Dashboard() {
  const { data: stats, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
  });

  const kpis = [
    { 
      title: 'Ventes du jour', 
      value: stats ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'GNF', maximumFractionDigits: 0 }).format(stats.today_sales) : '...', 
      icon: ShoppingCart, 
      trend: stats?.today_orders > 0 ? '+8%' : '0%', 
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    { 
      title: 'Revenu Mensuel', 
      value: stats ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'GNF', maximumFractionDigits: 0 }).format(stats.monthly_revenue) : '...', 
      icon: TrendingUp, 
      trend: '+12%', 
      color: 'text-emerald-600',
      bg: 'bg-emerald-100'
    },
    { 
      title: 'Stock Faible', 
      value: stats?.low_stock_count ?? '...', 
      icon: AlertTriangle, 
      trend: stats?.low_stock_count > 0 ? 'Action requise' : 'Optimal',
      color: stats?.low_stock_count > 0 ? 'text-amber-600' : 'text-slate-600',
      bg: stats?.low_stock_count > 0 ? 'bg-amber-100' : 'bg-slate-100',
      alert: stats?.low_stock_count > 0
    },
    { 
      title: 'Commandes Aujourd\'hui', 
      value: stats?.today_orders ?? '...', 
      icon: Package, 
      trend: '+2', 
      color: 'text-indigo-600',
      bg: 'bg-indigo-100'
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tableau de bord</h2>
          <p className="text-muted-foreground">Bienvenue, voici un aperçu de votre activité aujourd'hui.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isFetching || isLoading}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", (isFetching || isLoading) && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((stat, index) => (
          <Card key={index} className="overflow-hidden border-none shadow-lg bg-card/50 backdrop-blur-sm hover:translate-y-[-4px] transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={cn("p-3 rounded-xl", stat.bg)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
                {stat.alert ? (
                  <Badge variant="destructive" className="animate-pulse">Alerte</Badge>
                ) : (
                  <div className="flex items-center text-xs font-semibold text-emerald-600">
                    <ArrowUpRight className="h-4 w-4 mr-0.5" />
                    {stat.trend}
                  </div>
                )}
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <h4 className="text-2xl font-bold tracking-tight mt-1">{stat.value}</h4>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
        <Card className="lg:col-span-4 border-none shadow-lg">
          <CardHeader>
            <CardTitle>Performance des Ventes</CardTitle>
            <CardDescription>Évolution des ventes au cours des 7 derniers jours.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center bg-muted/20 rounded-b-xl border border-dashed m-6 mt-0">
             <div className="text-muted-foreground italic">Graphique de performance (À venir)</div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3 border-none shadow-lg">
          <CardHeader>
            <CardTitle>Activités Récentes</CardTitle>
            <CardDescription>Dernières transactions enregistrées.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold leading-none">Vente #2024-00{i}</p>
                    <p className="text-xs text-muted-foreground mt-1">Il y a {i * 15} minutes</p>
                  </div>
                  <div className="text-sm font-bold text-emerald-600">+ {new Intl.NumberFormat('fr-FR').format(i * 25000)} GNF</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
