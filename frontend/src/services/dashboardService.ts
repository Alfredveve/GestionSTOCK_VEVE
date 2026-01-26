import api from './api';

export interface DashboardStats {
  today_sales: number;
  today_orders: number;
  low_stock_count: number;
  monthly_revenue: number;
  monthly_expenses: number;
  net_profit: number;
  total_sales_value: number;
  total_stock_value: number;
  pending_orders_count: number;
  total_products_count: number;
  
  monthly_history: Array<{ name: string; revenue: number; expenses?: number; profit?: number; month: string }>;
  stock_movement_evolution: Array<{ name: string; entries: number; exits: number }>;
  stock_distribution_by_category: Array<{ name: string; value: number }>;
  
  low_stock_products: {
    results: Array<{
      id: number;
      name: string;
      quantity: number;
      threshold: number;
      pos_name: string;
      image: string | null;
    }>;
    count: number;
    page: number;
    total_pages: number;
  };
  
  latest_stock_movements: {
    results: Array<{
      id: number;
      date: string;
      product: string;
      type: string;
      quantity: number;
      pos_name: string;
      target_pos_name: string | null;
      is_wholesale: boolean;
    }>;
    count: number;
    page: number;
    total_pages: number;
  };
  
  returned_products: {
    results: Array<{
      id: number;
      date: string;
      product: string;
      quantity: number;
      pos_name: string;
    }>;
    count: number;
    page: number;
    total_pages: number;
  };
  
  defective_products: {
    results: Array<{
      id: number;
      date: string;
      product: string;
      quantity: number;
      pos_name: string;
    }>;
    count: number;
    page: number;
    total_pages: number;
  };
  
  remaining_products: {
    results: Array<{
      id: number;
      product: string;
      quantity: number;
      amount: number;
      pos_name: string;
    }>;
    count: number;
    page: number;
    total_pages: number;
  };

  top_selling_products?: Array<{
    name: string;
    value: number;
    quantity: number;
  }>;

  recent_activities: Array<{ 
    id: number; 
    type: string; 
    reference: string; 
    amount: number; 
    date: string; 
    description: string; 
  }>;
}

const dashboardService = {
  getStats: async (params?: { 
    start_date?: string; 
    end_date?: string;
    p_low?: number;
    p_move?: number;
    p_ret?: number;
    p_def?: number;
    p_rem?: number;
  }) => {
    const response = await api.get('dashboard/', { params });
    return response.data;
  },

  getMonthlyReport: async () => {
    const response = await api.get('monthly-profit/');
    return response.data;
  },

  exportPdf: async (params?: { start_date?: string; end_date?: string }) => {
    const response = await api.get('dashboard/export_pdf/', { 
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  exportExcel: async (params?: { start_date?: string; end_date?: string }) => {
    const response = await api.get('dashboard/export_excel/', { 
      params,
      responseType: 'blob'
    });
    return response.data;
  }
};

export default dashboardService;
