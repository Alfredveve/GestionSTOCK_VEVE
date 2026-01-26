import api from './api';

export interface OrderItem {
  id?: number;
  product: number;
  product_name?: string;
  quantity: number;
  unit_price: string;
  total_price?: string;
  is_wholesale?: boolean;
}

export interface Order {
  id?: number;
  client: number;
  invoice_type: 'retail' | 'wholesale';
  payment_method?: string;
  amount_paid?: number;
  items: OrderItem[];
  total_amount?: string;
  point_of_sale?: number;
  date_issued?: string;
  date_due?: string;
  date_created?: string;
  status?: string;
  created_at?: string;
  apply_tax?: boolean;
  client_name?: string;
  order_number?: string;
}

const salesService = {
  getOrders: async (params?: Record<string, string | number | boolean | undefined>) => {
    const response = await api.get('orders/', { params });
    return response.data;
  },

  getOrder: async (id: number) => {
    const response = await api.get(`orders/${id}/`);
    return response.data;
  },

  createOrder: async (data: Order) => {
    const response = await api.post('orders/', data);
    return response.data;
  },

  updateOrder: async (id: number, data: Partial<Order>) => {
    const response = await api.patch(`orders/${id}/`, data);
    return response.data;
  },

  exportOrdersExcel: async () => {
    const response = await api.get('orders/export_excel/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Commandes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportOrdersPdf: async () => {
    const response = await api.get('orders/export_pdf/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Commandes_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportOrderPdf: async (id: number, orderNumber: string = '') => {
    const response = await api.get(`orders/${id}/download_pdf/`, { 
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = orderNumber ? `Commande_${orderNumber}.pdf` : `Commande_${id}.pdf`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default salesService;
