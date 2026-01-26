import { useState } from 'react';
import { 
  TrendingUp, 
  RefreshCw,
  TrendingDown,
  Activity,
  AlertCircle,
  Banknote,
  Boxes,
  Clock
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import dashboardService from '@/services/dashboardService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardStats } from '@/types';

export function Dashboard() {
  const [pLow, setPLow] = useState(1);
  const [pMove, setPMove] = useState(1);
  const [pRet, setPRet] = useState(1);
  const [pDef, setPDef] = useState(1);
  const [pRem, setPRem] = useState(1);

  const { data: stats, isLoading, refetch, isFetching } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', pLow, pMove, pRet, pDef, pRem],
    queryFn: () => dashboardService.getStats({
      p_low: pLow,
      p_move: pMove,
      p_ret: pRet,
      p_def: pDef,
      p_rem: pRem,
    }),
    refetchInterval: 30000,
  });



  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

  const kpis = [
    { 
      title: 'Produits', 
      value: stats?.total_products_count ?? '...', 
      icon: Boxes, 
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      borderColor: 'border-l-4 border-blue-500' // Visual style from screenshot
    },
    { 
      title: 'Valeur Stock', 
      value: stats ? formatCurrency(stats.total_stock_value) : '...', 
      icon: Banknote, 
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
      borderColor: 'border-l-4 border-emerald-500'
    },
    { 
      title: 'Ventes totales', 
      value: stats ? formatCurrency(stats.total_sales_value) : '...', 
      icon: TrendingUp, 
      color: 'text-teal-600',
      bg: 'bg-teal-100',
      borderColor: 'border-l-4 border-teal-500'
    },
    { 
      title: 'Commandes en attente', 
      value: stats?.pending_orders_count ?? '...', 
      icon: Clock, 
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      borderColor: 'border-l-4 border-amber-500'
    },
  ];

  return (
    <div className="space-y-8 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tableau de bord</h2>
          <p className="text-muted-foreground">Vue d'ensemble de votre activité et du stock.</p>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((stat, index) => (
          <Card key={index} className={cn("overflow-hidden shadow-sm hover:shadow-md transition-all", stat.borderColor)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                   <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                   <h3 className="text-2xl font-bold">{stat.value}</h3>
                </div>
                <div className={cn("p-3 rounded-full", stat.bg)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 1: Produits Retournés & Produits Défectueux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produits Retournés */}
        <Card className="shadow-sm border-t-4 border-t-teal-500">
           <CardHeader className="bg-teal-50/50 pb-4">
              <div className="flex items-center gap-2">
                 <RefreshCw className="h-5 w-5 text-teal-600" />
                 <CardTitle className="text-lg text-teal-900">Produits retournés</CardTitle>
              </div>
           </CardHeader>
           <CardContent className="p-0">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Produit</TableHead>
                          <TableHead>Magasin</TableHead>
                          <TableHead className="text-right">Qté</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {stats?.returned_products?.results?.map((item) => (
                          <TableRow key={item.id}>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </TableCell>
                              <TableCell className="font-medium">{item.product}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-none text-[10px]">
                                  {item.pos_name}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-bold">{item.quantity}</TableCell>
                          </TableRow>
                      ))}
                      {!stats?.returned_products?.results?.length && (
                          <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucun retour récent</TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
           </CardContent>
           {stats?.returned_products && stats.returned_products.total_pages > 1 && (
             <div className="p-4 border-t flex items-center justify-between bg-teal-50/20">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={pRet === 1}
                  onClick={() => setPRet(p => p - 1)}
                  className="h-8 px-3 text-xs"
                >
                  Précédent
                </Button>
                <span className="text-xs font-medium">{pRet} / {stats.returned_products.total_pages}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={pRet === stats.returned_products.total_pages}
                  onClick={() => setPRet(p => p + 1)}
                  className="h-8 px-3 text-xs"
                >
                  Suivant
                </Button>
             </div>
           )}
        </Card>

        {/* Produits Défectueux */}
        <Card className="shadow-sm border-t-4 border-t-amber-500">
           <CardHeader className="bg-amber-50/50 pb-4">
              <div className="flex items-center gap-2">
                 <AlertCircle className="h-5 w-5 text-amber-600" />
                 <CardTitle className="text-lg text-amber-900">Produits défectueux</CardTitle>
              </div>
           </CardHeader>
           <CardContent className="p-0">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Produit</TableHead>
                          <TableHead>Magasin</TableHead>
                          <TableHead className="text-right">Qté</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {stats?.defective_products?.results?.map((item) => (
                          <TableRow key={item.id}>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </TableCell>
                              <TableCell className="font-medium">{item.product}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-amber-50 text-amber-600 border-none text-[10px]">
                                  {item.pos_name}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-bold">{item.quantity}</TableCell>
                          </TableRow>
                      ))}
                       {!stats?.defective_products?.results?.length && (
                          <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucun défectueux récent</TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
           </CardContent>
           {stats?.defective_products && stats.defective_products.total_pages > 1 && (
             <div className="p-4 border-t flex items-center justify-between bg-amber-50/20">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={pDef === 1}
                  onClick={() => setPDef(p => p - 1)}
                  className="h-8 px-3 text-xs"
                >
                  Précédent
                </Button>
                <span className="text-xs font-medium">{pDef} / {stats.defective_products.total_pages}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={pDef === stats.defective_products.total_pages}
                  onClick={() => setPDef(p => p + 1)}
                  className="h-8 px-3 text-xs"
                >
                  Suivant
                </Button>
             </div>
           )}
        </Card>
      </div>

      {/* Row 2: Stock Faible & Derniers Mouvements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produits en stock faible */}
        <Card className="shadow-sm border-none">
           <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                 <TrendingDown className="h-5 w-5 text-rose-500" />
                 <CardTitle className="text-lg">Produits en stock faible</CardTitle>
              </div>
              <CardDescription>Produits ayant atteint leur seuil critique</CardDescription>
           </CardHeader>
           <CardContent className="p-0">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Produit</TableHead>
                          <TableHead>Magasin</TableHead>
                          <TableHead className="text-center">Qté</TableHead>
                          <TableHead className="text-center">Seuil</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {stats?.low_stock_products?.results?.map((item) => (
                          <TableRow key={item.id} className="hover:bg-rose-50/50">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-rose-500" />
                                    {item.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-rose-50 text-rose-600 border-none text-[10px]">
                                  {item.pos_name}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center font-bold text-rose-600">{item.quantity}</TableCell>
                              <TableCell className="text-center text-muted-foreground">{item.threshold}</TableCell>
                          </TableRow>
                      ))}
                      {!stats?.low_stock_products?.results?.length && (
                          <TableRow>
                              <TableCell colSpan={4} className="text-center text-emerald-600 py-8 font-medium">Tout est en ordre ! Aucun stock faible.</TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
           </CardContent>
           {stats?.low_stock_products && stats.low_stock_products.total_pages > 1 && (
             <div className="p-4 border-t flex items-center justify-between bg-rose-50/20">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={pLow === 1}
                  onClick={() => setPLow(p => p - 1)}
                  className="h-8 px-3 text-xs"
                >
                  Précédent
                </Button>
                <span className="text-xs font-medium">{pLow} / {stats.low_stock_products.total_pages}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={pLow === stats.low_stock_products.total_pages}
                  onClick={() => setPLow(p => p + 1)}
                  className="h-8 px-3 text-xs"
                >
                  Suivant
                </Button>
             </div>
           )}
        </Card>

        {/* Derniers mouvements de stock */}
        <Card className="shadow-sm border-none">
           <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                 <Activity className="h-5 w-5 text-slate-500" />
                 <CardTitle className="text-lg">Derniers mouvements de stock</CardTitle>
              </div>
              <CardDescription>Historique récent des entrées et sorties</CardDescription>
           </CardHeader>
           <CardContent className="p-0">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Produit</TableHead>
                          <TableHead>Magasin</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Qté</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {stats?.latest_stock_movements?.results?.map((move) => (
                          <TableRow key={move.id}>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(move.date).toLocaleDateString()} {new Date(move.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </TableCell>
                              <TableCell className="font-medium">{move.product}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-none text-[10px] w-fit">
                                    {move.pos_name}
                                  </Badge>
                                  {move.target_pos_name && (
                                    <span className="text-[9px] text-muted-foreground italic">
                                      → {move.target_pos_name}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn(
                                    "text-[10px] font-normal border-0",
                                    move.type === 'Entrée' && "bg-emerald-100 text-emerald-700",
                                    move.type === 'Sortie' && "bg-orange-100 text-orange-700",
                                    move.type === 'Retour' && "bg-blue-100 text-blue-700",
                                    move.type === 'Défectueux' && "bg-red-100 text-red-700",
                                    move.type === 'Transfert' && "bg-indigo-100 text-indigo-700",
                                    move.type === 'Ajustement' && "bg-slate-100 text-slate-700",
                                )}>
                                    {move.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold">{move.quantity}</TableCell>
                          </TableRow>
                      ))}
                      {!stats?.latest_stock_movements?.results?.length && (
                          <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-6">Aucun mouvement récent</TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
           </CardContent>
           {stats?.latest_stock_movements && stats.latest_stock_movements.total_pages > 1 && (
             <div className="p-4 border-t flex items-center justify-between bg-slate-50/30">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={pMove === 1}
                  onClick={() => setPMove(p => p - 1)}
                  className="h-8 px-3 text-xs"
                >
                  Précédent
                </Button>
                <span className="text-xs font-medium">{pMove} / {stats.latest_stock_movements.total_pages}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={pMove === stats.latest_stock_movements.total_pages}
                  onClick={() => setPMove(p => p + 1)}
                  className="h-8 px-3 text-xs"
                >
                  Suivant
                </Button>
             </div>
           )}
        </Card>
      </div>

      {/* Row 2.5: Produits restants */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="shadow-sm border-t-4 border-t-blue-500">
           <CardHeader className="bg-blue-50/50 pb-4">
              <div className="flex items-center gap-2">
                 <Boxes className="h-5 w-5 text-blue-600" />
                 <CardTitle className="text-lg text-blue-900">Produits restants en stock</CardTitle>
              </div>
              <CardDescription>Inventaire actuel par point de vente (Valorisé au prix d'achat)</CardDescription>
           </CardHeader>
           <CardContent className="p-0">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Magasin</TableHead>
                          <TableHead>Produit</TableHead>
                          <TableHead className="text-right">Qté</TableHead>
                          <TableHead className="text-right">Montant (Prix Achat)</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {stats?.remaining_products?.results?.map((item) => (
                          <TableRow key={item.id}>
                              <TableCell>
                                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-none">
                                  {item.pos_name}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{item.product}</TableCell>
                              <TableCell className="text-right font-bold">{item.quantity}</TableCell>
                              <TableCell className="text-right font-mono text-emerald-600">{formatCurrency(item.amount)}</TableCell>
                          </TableRow>
                      ))}
                      {!stats?.remaining_products?.results?.length && (
                          <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucun produit en stock</TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
           </CardContent>
           {stats?.remaining_products && stats.remaining_products.total_pages > 1 && (
             <div className="p-4 border-t flex items-center justify-between bg-blue-50/20">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={pRem === 1}
                  onClick={() => setPRem(p => p - 1)}
                  className="h-8 px-3 text-xs"
                >
                  Précédent
                </Button>
                <span className="text-xs font-medium">{pRem} / {stats.remaining_products.total_pages}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={pRem === stats.remaining_products.total_pages}
                  onClick={() => setPRem(p => p + 1)}
                  className="h-8 px-3 text-xs"
                >
                  Suivant
                </Button>
             </div>
           )}
        </Card>
      </div>

      {/* Row 3: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution des mouvements */}
        <Card className="shadow-sm border-none">
           <CardHeader>
              <CardTitle>Évolution des mouvements de stock</CardTitle>
              <CardDescription>Entrées vs Sorties sur 7 jours</CardDescription>
           </CardHeader>
           <CardContent className="h-[300px] w-full">
               {!isLoading && stats?.stock_movement_evolution && stats.stock_movement_evolution.length > 0 ? (
                  <div className="h-full w-full relative">
                    <ResponsiveContainer width="99%" height="100%">
                      <BarChart data={stats.stock_movement_evolution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          cursor={{ fill: 'transparent' }}
                        />
                        <Legend />
                        <Bar dataKey="entries" name="Entrées (IN)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="exits" name="Sorties (OUT)" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
              ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground bg-slate-50/10 rounded-lg">
                      {isLoading ? <RefreshCw className="h-6 w-6 animate-spin text-slate-300" /> : "Pas assez de données"}
                  </div>
              )}
           </CardContent>
        </Card>

        {/* Répartition par catégorie */}
        <Card className="shadow-sm border-none">
           <CardHeader>
              <CardTitle>Répartition des stocks par catégorie</CardTitle>
              <CardDescription>Valeur du stock</CardDescription>
           </CardHeader>
           <CardContent className="h-[300px] w-full">
               {!isLoading && stats?.stock_distribution_by_category && stats.stock_distribution_by_category.length > 0 ? (
                  <div className="h-full w-full relative">
                    <ResponsiveContainer width="99%" height="100%">
                        <PieChart>
                            <Pie
                                data={stats.stock_distribution_by_category}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {stats.stock_distribution_by_category.map((_: { name: string; value: number }, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value: number | undefined) => (value ? formatCurrency(value) : '')}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                  </div>
              ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground bg-slate-50/10 rounded-lg">
                      {isLoading ? <RefreshCw className="h-6 w-6 animate-spin text-slate-300" /> : "Aucune donnée de stock"}
                  </div>
              )}
           </CardContent>
        </Card>
      </div>

    </div>
  );
}
