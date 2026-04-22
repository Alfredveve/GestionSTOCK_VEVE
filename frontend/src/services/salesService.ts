import api from './api';
import type { 
  Order, 
  Quote, 
  Client, 
  PointOfSale, 
  PaginatedResponse,
  CommonQueryParams
} from '@/types';

export interface QuoteCreatePayload {
  client: number;
  status: 'draft' | 'sent';
  valid_until: string;
  items: {
    product: number;
    quantity: number;
    unit_price: number;
  }[];
  notes?: string;
}

export interface ClientCreatePayload {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
}

const salesService = {
  // --- Orders ---
  getOrders: async (params?: Record<string, string | number | boolean | undefined>): Promise<PaginatedResponse<Order>> => {
    const response = await api.get('orders/', { params });
    return response.data;
  },

  getOrder: async (id: number): Promise<Order> => {
    const response = await api.get(`orders/${id}/`);
    return response.data;
  },

  createOrder: async (data: Partial<Order>): Promise<Order> => {
    const response = await api.post('orders/', data);
    return response.data;
  },

  updateOrder: async (id: number, data: Partial<Order>): Promise<Order> => {
    const response = await api.patch(`orders/${id}/`, data);
    return response.data;
  },

  addPayment: async (id: number, amount: number, paymentMethod: string): Promise<any> => {
    const response = await api.post(`orders/${id}/add_payment/`, { amount, payment_method: paymentMethod });
    return response.data;
  },

  // --- Quotes ---
  getQuotes: async (params?: CommonQueryParams): Promise<PaginatedResponse<Quote>> => {
    const response = await api.get('quotes/', { params });
    return response.data;
  },

  getQuote: async (id: number | string): Promise<Quote> => {
    const response = await api.get(`quotes/${id}/`);
    return response.data;
  },

  createQuote: async (data: QuoteCreatePayload): Promise<Quote> => {
    const response = await api.post('quotes/', data);
    return response.data;
  },

  updateQuote: async (id: number | string, data: Partial<QuoteCreatePayload>): Promise<Quote> => {
    const response = await api.put(`quotes/${id}/`, data);
    return response.data;
  },

  deleteQuote: async (id: number): Promise<void> => {
    await api.delete(`quotes/${id}/`);
  },

  convertQuoteToInvoice: async (quoteId: number): Promise<{ message: string; invoice_id: number; invoice_number: string }> => {
    const response = await api.post(`quotes/${quoteId}/convert/`);
    return response.data;
  },

  // --- Clients ---
  getClients: async (params?: CommonQueryParams): Promise<PaginatedResponse<Client>> => {
    const response = await api.get('clients/', { params });
    return response.data;
  },

  createClient: async (data: ClientCreatePayload): Promise<Client> => {
    const response = await api.post('clients/', data);
    return response.data;
  },

  // --- Points of Sale ---
  getPointsOfSale: async (params?: CommonQueryParams): Promise<PaginatedResponse<PointOfSale>> => {
    const response = await api.get('pos/', { params });
    return response.data;
  },

  createPointOfSale: async (data: Partial<PointOfSale>): Promise<PointOfSale> => {
    const response = await api.post('pos/', data);
    return response.data;
  },

  updatePointOfSale: async (id: number, data: Partial<PointOfSale>): Promise<PointOfSale> => {
    const response = await api.patch(`pos/${id}/`, data);
    return response.data;
  },

  deletePointOfSale: async (id: number): Promise<void> => {
    await api.delete(`pos/${id}/`);
  },

  // --- Exports ---
  exportOrdersExcel: async (params?: Record<string, string | number | boolean | undefined>): Promise<void> => {
    const response = await api.get('orders/export_excel/', { 
      params,
      responseType: 'blob' 
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Commandes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportOrdersPdf: async (params?: Record<string, string | number | boolean | undefined>): Promise<void> => {
    const response = await api.get('orders/export_pdf/', { 
      params,
      responseType: 'blob' 
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Commandes_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportOrderPdf: async (id: number, orderNumber: string = ''): Promise<void> => {
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

  exportQuotesExcel: async (): Promise<void> => {
    const response = await api.get('quotes/export_excel/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Devis_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportQuotesPdf: async (): Promise<void> => {
    const response = await api.get('quotes/export_pdf/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Devis_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportQuotePdf: async (id: number, quoteNumber: string = ''): Promise<void> => {
    const response = await api.get(`quotes/${id}/download_pdf/`, { 
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = quoteNumber ? `Devis_${quoteNumber}.pdf` : `Devis_${id}.pdf`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default salesService;
