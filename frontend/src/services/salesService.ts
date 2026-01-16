import api from './api';

export interface OrderItem {
  id?: number;
  product: number;
  product_name?: string;
  quantity: number;
  unit_price: string;
  total_price?: string;
}

export interface Order {
  id?: number;
  client: number;
  order_type: 'retail' | 'wholesale';
  items: OrderItem[];
  total_amount?: string;
  status?: string;
  created_at?: string;
}

const salesService = {
  getOrders: async (params?: Record<string, any>) => {
    const response = await api.get('sales/', { params });
    return response.data;
  },

  getOrder: async (id: number) => {
    const response = await api.get(`sales/${id}/`);
    return response.data;
  },

  createOrder: async (data: Order) => {
    const response = await api.post('sales/', data);
    return response.data;
  },
};

export default salesService;
