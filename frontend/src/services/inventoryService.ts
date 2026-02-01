import api from './api';
import type { 
  Product, 
  Category, 
  Supplier, 
  PointOfSale, 
  Invoice, 
  Quote, 
  Receipt, 
  Client, 
  Expense, 
  ExpenseCategory, 
  MonthlyProfitReport, 
  StockMovement, 
  PaginatedResponse,
  Payment,
  DashboardStats,
  ReceiptCreatePayload,
  Inventory,
  GlobalStockStats
} from '@/types';

export interface UserAccount {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

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

export interface PaymentCreatePayload {
  invoice: number;
  amount: number;
  payment_method: string;
  notes?: string;
}

export interface SupplierCreatePayload {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface ClientCreatePayload {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
}

export interface ExpenseCreatePayload {
  category: number;
  amount: number;
  point_of_sale?: number;
  date: string;
  description: string;
  reference?: string;
}

export interface CommonQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  product?: number | string;
  // Dynamic filters
  [key: string]: string | number | undefined; 
}

const inventoryService = {
  getProducts: async (params?: CommonQueryParams): Promise<PaginatedResponse<Product>> => {
    const response = await api.get('products/', { params });
    return response.data;
  },
  
  getInventoryByPOS: async (params?: CommonQueryParams): Promise<PaginatedResponse<Inventory>> => {
    const response = await api.get('inventory/', { params });
    return response.data;
  },
  
  getProduct: async (id: number): Promise<Product> => {
    const response = await api.get(`products/${id}/`);
    return response.data;
  },
  
  getCategories: async (): Promise<PaginatedResponse<Category>> => {
    const response = await api.get('categories/');
    return response.data;
  },
  
  async getSuppliers(params?: CommonQueryParams): Promise<PaginatedResponse<Supplier>> {
    const response = await api.get('suppliers/', { params });
    return response.data;
  },

  async getClients(params?: CommonQueryParams): Promise<PaginatedResponse<Client>> {
    const response = await api.get('clients/', { params });
    return response.data;
  },

  async getExpenses(params?: CommonQueryParams): Promise<PaginatedResponse<Expense>> {
    const response = await api.get('expenses/', { params });
    return response.data;
  },

  async getStats(params?: { start_date?: string; end_date?: string }): Promise<DashboardStats> {
    const response = await api.get('dashboard/', { params });
    return response.data;
  },

  async getWarehouseStock(productId: number): Promise<{ warehouse_stock: number }> {
    const response = await api.get(`products/${productId}/stock/`);
    return response.data;
  },

  async getInvoices(params?: CommonQueryParams): Promise<PaginatedResponse<Invoice>> {
    const response = await api.get('invoices/', { params });
    return response.data;
  },

  async getInvoice(id: number | string): Promise<Invoice> {
    const response = await api.get(`invoices/${id}/`);
    return response.data;
  },

  async deleteInvoice(id: number): Promise<void> {
    await api.delete(`invoices/${id}/`);
  },

  async getReceipts(params?: CommonQueryParams): Promise<PaginatedResponse<Receipt>> {
    const response = await api.get('receipts/', { params });
    return response.data;
  },

  async getReceipt(id: number): Promise<Receipt> {
    const response = await api.get(`receipts/${id}/`);
    return response.data;
  },

  async createReceipt(data: ReceiptCreatePayload): Promise<Receipt> {
    const response = await api.post('receipts/', data);
    return response.data;
  },

  async updateReceipt(id: number, data: Partial<ReceiptCreatePayload>): Promise<Receipt> {
    const response = await api.put(`receipts/${id}/`, data);
    return response.data;
  },

  async deleteReceipt(id: number): Promise<void> {
    await api.delete(`receipts/${id}/`);
  },

  async getPayments(params?: CommonQueryParams): Promise<PaginatedResponse<Payment>> {
    const response = await api.get('payments/', { params });
    return response.data;
  },

  async createPayment(data: PaymentCreatePayload): Promise<Payment> {
    const response = await api.post('payments/', data);
    return response.data;
  },
  async getStockMovements(params?: CommonQueryParams): Promise<PaginatedResponse<StockMovement>> {
    const response = await api.get('movements/', { params });
    return response.data;
  },

  async getQuotes(params?: CommonQueryParams): Promise<PaginatedResponse<Quote>> {
    const response = await api.get('quotes/', { params });
    return response.data;
  },

  async getExpenseCategories(): Promise<PaginatedResponse<ExpenseCategory>> {
    const response = await api.get('expense-categories/');
    return response.data;
  },

  async convertQuoteToInvoice(quoteId: number): Promise<{ message: string; invoice_id: number; invoice_number: string }> {
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

  async createSupplier(data: SupplierCreatePayload): Promise<Supplier> {
    const response = await api.post('suppliers/', data);
    return response.data;
  },

  async createClient(data: ClientCreatePayload): Promise<Client> {
    const response = await api.post('clients/', data);
    return response.data;
  },

  async createExpense(data: ExpenseCreatePayload): Promise<Expense> {
    const response = await api.post('expenses/', data);
    return response.data;
  },

  async getPointsOfSale(params?: CommonQueryParams): Promise<PaginatedResponse<PointOfSale>> {
    const response = await api.get('pos/', { params });
    return response.data;
  },

  async createPointOfSale(data: Partial<PointOfSale>): Promise<PointOfSale> {
    const response = await api.post('pos/', data);
    return response.data;
  },

  async updatePointOfSale(id: number, data: Partial<PointOfSale>): Promise<PointOfSale> {
    const response = await api.put(`pos/${id}/`, data);
    return response.data;
  },

  async getUsers(): Promise<UserAccount[]> {
    const response = await api.get('users/');
    // Handle both direct array and paginated response
    return Array.isArray(response.data) ? response.data : (response.data.results || []);
  },

  async getMe(): Promise<UserAccount> {
    const response = await api.get('users/me/');
    return response.data;
  },

  async deletePointOfSale(id: number): Promise<void> {
    await api.delete(`pos/${id}/`);
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

  async createExpenseCategory(data: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    const response = await api.post('expense-categories/', data);
    return response.data;
  },

  async updateExpenseCategory(id: number, data: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    const response = await api.put(`expense-categories/${id}/`, data);
    return response.data;
  },

  async deleteExpenseCategory(id: number): Promise<void> {
    await api.delete(`expense-categories/${id}/`);
  },

  async getProfitReports(params?: CommonQueryParams): Promise<PaginatedResponse<MonthlyProfitReport>> {
    const response = await api.get('profit-reports/', { params });
    return response.data;
  },

  async createStockMovement(data: { 
    product: number; 
    quantity: number; 
    movement_type: string; 
    from_point_of_sale: number;
    to_point_of_sale?: number;
    reference?: string; 
    notes?: string;
    created_at?: string;
  }): Promise<StockMovement> {
    const response = await api.post('movements/', data);
    return response.data;
  },

  async exportProductsExcel(): Promise<void> {
    const response = await api.get('products/export_excel/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Produits_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async exportProductsPdf(): Promise<void> {
    const response = await api.get('products/export_pdf/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Produits_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async exportInvoicesExcel(): Promise<void> {
    const response = await api.get('invoices/export_excel/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Factures_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async exportInvoicesPdf(): Promise<void> {
    const response = await api.get('invoices/export_pdf/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Factures_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async exportInvoicePdf(id: number, invoiceNumber: string = ''): Promise<void> {
    const response = await api.get(`invoices/${id}/download_pdf/`, { 
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = invoiceNumber ? `Facture_${invoiceNumber}.pdf` : `Facture_${id}.pdf`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async exportReceiptsExcel(): Promise<void> {
    const response = await api.get('receipts/export_excel/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Achats_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async exportReceiptsPdf(): Promise<void> {
    const response = await api.get('receipts/export_pdf/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Achats_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async exportExpensesExcel(): Promise<void> {
    const response = await api.get('expenses/export_excel/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Depenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async exportExpensesPdf(): Promise<void> {
    const response = await api.get('expenses/export_pdf/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Depenses_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async exportQuotesExcel(): Promise<void> {
    const response = await api.get('quotes/export_excel/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Devis_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async exportQuotesPdf(): Promise<void> {
    const response = await api.get('quotes/export_pdf/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Devis_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async importProducts(file: File): Promise<{ message: string; importedCount: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('products/import_products/', formData);
    return response.data;
  },

  async getQuote(id: number | string): Promise<Quote> {
    const response = await api.get(`quotes/${id}/`);
    return response.data;
  },

  async exportQuotePdf(id: number, quoteNumber: string = ''): Promise<void> {
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

  async createQuote(data: QuoteCreatePayload): Promise<Quote> {
    const response = await api.post('quotes/', data);
    return response.data;
  },

  async updateQuote(id: number | string, data: Partial<QuoteCreatePayload>): Promise<Quote> {
    const response = await api.put(`quotes/${id}/`, data);
    return response.data;
  },

  async deleteQuote(id: number): Promise<void> {
    await api.delete(`quotes/${id}/`);
  },

  async exportInventoryByPOSExcel(): Promise<void> {
    const response = await api.get('inventory/export_excel/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Stock_par_POS_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async exportInventoryByPOSPdf(): Promise<void> {
    const response = await api.get('inventory/export_pdf/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Stock_par_POS_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async getGlobalStockStats(): Promise<GlobalStockStats> {
    const response = await api.get('products/global_stock_stats/');
    return response.data;
  },
};

export default inventoryService;
