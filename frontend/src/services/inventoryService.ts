import api from './api';

export interface Category {
  id: number;
  name: string;
  description: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: number;
  category_name: string;
  supplier?: number;
  supplier_name: string;
  description?: string;
  buying_price: string;
  selling_price: string;
  wholesale_purchase_price?: string;
  wholesale_selling_price: string;
  current_stock: number;
  reorder_level: number;
  image: string | null;
  units_per_box: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  client: number;
  client_name: string;
  status: 'paid' | 'partial' | 'unpaid';
  total_amount: string;
  balance: string;
  date_issued: string;
}

export interface Quote {
  id: number;
  quote_number: string;
  client: number;
  client_name: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  total_amount: string;
  valid_until: string;
}

export interface Receipt {
  id: number;
  receipt_number: string;
  supplier: number;
  supplier_name: string;
  status: 'pending' | 'received';
  total_amount: string;
  date_received: string;
}

export interface StockMovement {
  id: number;
  product_name: string;
  movement_type: string;
  type_display: string;
  quantity: number;
  reference: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const inventoryService = {
  getProducts: async (params?: { search?: string; category?: string; page?: number }): Promise<any> => {
    const response = await api.get('products/', { params });
    return response.data;
  },
  
  getProduct: async (id: number): Promise<Product> => {
    const response = await api.get(`products/${id}/`);
    return response.data;
  },
  
  getCategories: async (): Promise<any> => {
    const response = await api.get('categories/');
    return response.data;
  },
  
  async getSuppliers(): Promise<any> {
    const response = await api.get('suppliers/');
    return response.data;
  },

  async getClients(): Promise<any> {
    const response = await api.get('clients/');
    return response.data;
  },

  async getExpenses(): Promise<any> {
    const response = await api.get('expenses/');
    return response.data;
  },

  async getStats(): Promise<any> {
    const response = await api.get('dashboard/');
    return response.data;
  },

  async getWarehouseStock(productId: number): Promise<any> {
    const response = await api.get(`products/${productId}/stock/`);
    return response.data;
  },

  async getInvoices(params?: any): Promise<any> {
    const response = await api.get('invoices/', { params });
    return response.data;
  },

  async getReceipts(params?: any): Promise<any> {
    const response = await api.get('receipts/', { params });
    return response.data;
  },

  async getPayments(params?: any): Promise<any> {
    const response = await api.get('payments/', { params });
    return response.data;
  },

  async getStockMovements(params?: any): Promise<any> {
    const response = await api.get('movements/', { params });
    return response.data;
  },

  async getQuotes(params?: any): Promise<any> {
    const response = await api.get('quotes/', { params });
    return response.data;
  },

  async getExpenseCategories(): Promise<any> {
    const response = await api.get('expense-categories/');
    return response.data;
  },

  async convertQuoteToInvoice(quoteId: number): Promise<any> {
    const response = await api.post(`quotes/${quoteId}/convert/`);
    return response.data;
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const response = await api.post('products/', data);
    return response.data;
  },

  async updateProduct(id: number, data: Partial<Product>): Promise<Product> {
    const response = await api.put(`products/${id}/`, data);
    return response.data;
  },

  async deleteProduct(id: number): Promise<void> {
    await api.delete(`products/${id}/`);
  },

  async createSupplier(data: any): Promise<Supplier> {
    const response = await api.post('suppliers/', data);
    return response.data;
  },

  async createClient(data: any): Promise<any> {
    const response = await api.post('clients/', data);
    return response.data;
  },

  async createExpense(data: any): Promise<any> {
    const response = await api.post('expenses/', data);
    return response.data;
  },

  async getPointsOfSale(): Promise<any> {
    const response = await api.get('pos/');
    return response.data;
  },

  async createCategory(data: Partial<Category>): Promise<Category> {
    const response = await api.post('categories/', data);
    return response.data;
  },

  async updateCategory(id: number, data: Partial<Category>): Promise<Category> {
    const response = await api.put(`categories/${id}/`, data);
    return response.data;
  },

  async deleteCategory(id: number): Promise<void> {
    await api.delete(`categories/${id}/`);
  },
};

export default inventoryService;
