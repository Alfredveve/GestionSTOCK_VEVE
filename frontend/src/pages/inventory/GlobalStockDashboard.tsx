import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, TrendingUp, AlertTriangle, Store, BarChart3, ArrowUpDown } from 'lucide-react';
import inventoryService from '@/services/inventoryService';
import type { GlobalStockStats } from '@/types';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export function GlobalStockDashboard() {
  const [stats, setStats] = useState<GlobalStockStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await inventoryService.getGlobalStockStats();
      setStats(data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      toast.error('Impossible de charger les statistiques globales');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Aucune donnée disponible</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord Global des Stocks</h1>
          <p className="text-gray-500 mt-1">Vue d'ensemble consolidée de tous les points de vente</p>
        </div>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Actualiser
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-linear-to-br from-indigo-500 to-indigo-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Produits</CardTitle>
            <Package className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.summary.total_products}</div>
            <p className="text-xs opacity-80 mt-1">Produits référencés</p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valeur Totale</CardTitle>
            <TrendingUp className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.summary.total_stock_value)}</div>
            <p className="text-xs opacity-80 mt-1">Valeur du stock global</p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En Stock</CardTitle>
            <Package className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.summary.products_in_stock}</div>
            <p className="text-xs opacity-80 mt-1">Produits disponibles</p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-orange-500 to-orange-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stock Faible</CardTitle>
            <AlertTriangle className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.summary.products_low_stock}</div>
            <p className="text-xs opacity-80 mt-1">Produits à réapprovisionner</p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-red-500 to-red-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rupture</CardTitle>
            <AlertTriangle className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.summary.products_out_of_stock}</div>
            <p className="text-xs opacity-80 mt-1">Produits en rupture</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock by Point of Sale */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-indigo-600" />
              Répartition par Point de Vente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.by_point_of_sale}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="code" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'total_value') return formatCurrency(value);
                    return value;
                  }}
                  labelFormatter={(label) => `Point de vente: ${label}`}
                />
                <Legend />
                <Bar dataKey="total_quantity" fill="#6366f1" name="Quantité totale" />
                <Bar dataKey="product_count" fill="#8b5cf6" name="Nb. produits" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products by Value */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Top 10 Produits par Valeur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {stats.top_products_by_value.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.sku} • {product.total_quantity} unités</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatCurrency(product.stock_value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Point of Sale Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-indigo-600" />
            Détails par Point de Vente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Point de Vente</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Ville</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Nb. Produits</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Quantité Totale</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Valeur Totale</th>
                </tr>
              </thead>
              <tbody>
                {stats.by_point_of_sale.map((pos) => (
                  <tr key={pos.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{pos.name}</td>
                    <td className="py-3 px-4 text-gray-600">{pos.code}</td>
                    <td className="py-3 px-4 text-gray-600">{pos.city}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{pos.product_count}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{pos.total_quantity}</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">
                      {formatCurrency(pos.total_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Imbalanced Products */}
      {stats.imbalanced_products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5 text-orange-600" />
              Produits avec Stock Déséquilibré
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Produits avec une grande différence de stock entre les points de vente
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.imbalanced_products.map((product) => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{product.name}</h4>
                      <p className="text-sm text-gray-500">{product.sku} • Stock total: {product.total_stock} unités</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Écart: <span className="font-bold text-orange-600">{product.variance}</span></p>
                      <p className="text-xs text-gray-500">Max: {product.max_stock} | Min: {product.min_stock}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {product.distribution.map((dist, idx) => (
                      <div key={idx} className="bg-gray-50 p-2 rounded">
                        <p className="text-xs font-medium text-gray-700">{dist.point_of_sale__code}</p>
                        <p className="text-lg font-bold text-indigo-600">{dist.quantity}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alerts */}
      {stats.low_stock_alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Alertes de Stock Faible ({stats.low_stock_alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Produit</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">SKU</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Point de Vente</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Quantité</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Seuil</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.low_stock_alerts.map((alert, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{alert.product_name}</td>
                      <td className="py-3 px-4 text-gray-600">{alert.sku}</td>
                      <td className="py-3 px-4 text-gray-600">{alert.pos_name}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-orange-600">{alert.quantity}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">{alert.reorder_level}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          alert.status === 'low_stock' 
                            ? 'bg-orange-100 text-orange-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {alert.status === 'low_stock' ? 'Stock Faible' : 'Critique'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
