import api from './api';

export interface DashboardStats {
  today_sales: number;
  today_orders: number;
  low_stock_count: number;
  monthly_revenue: number;
}

const dashboardService = {
  getStats: async () => {
    const response = await api.get('dashboard/');
    return response.data;
  },

  getMonthlyReport: async () => {
    const response = await api.get('monthly-profit/');
    return response.data;
  }
};

export default dashboardService;
