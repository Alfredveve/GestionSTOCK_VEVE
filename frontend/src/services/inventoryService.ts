import api from './api';
import type { 
  Product, 
  Category, 
  StockMovement, 
  PaginatedResponse,
  DashboardStats,
  Inventory,
  GlobalStockStats,
  CommonQueryParams
} from '@/types';

export interface UserAccount {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

const inventoryService = {
  // --- Products ---
  getProducts: async (params?: CommonQueryParams): Promise<PaginatedResponse<Product>> => {
    const response = await api.get('products/', { params });
    return response.data;
  },
  
  getProduct: async (id: number): Promise<Product> => {
    const response = await api.get(`products/${id}/`);
    return response.data;
  },

  createProduct: async (data: Partial<Product>): Promise<Product> => {
    const response = await api.post('products/', data);
    return response.data;
  },

  updateProduct: async (id: number, data: Partial<Product>): Promise<Product> => {
    const response = await api.put(`products/${id}/`, data);
    return response.data;
  },

  deleteProduct: async (id: number): Promise<void> => {
    await api.delete(`products/${id}/`);
  },

  // --- Categories ---
  getCategories: async (): Promise<PaginatedResponse<Category>> => {
    const response = await api.get('categories/');
    return response.data;
  },

  createCategory: async (data: Partial<Category>): Promise<Category> => {
    const response = await api.post('categories/', data);
    return response.data;
  },

  updateCategory: async (id: number, data: Partial<Category>): Promise<Category> => {
    const response = await api.put(`categories/${id}/`, data);
    return response.data;
  },

  deleteCategory: async (id: number): Promise<void> => {
    await api.delete(`categories/${id}/`);
  },

  // --- Inventory & Stock ---
  getInventoryByPOS: async (params?: CommonQueryParams): Promise<PaginatedResponse<Inventory>> => {
    const response = await api.get('inventory/', { params });
    return response.data;
  },
  
  async getWarehouseStock(productId: number): Promise<{ warehouse_stock: number }> {
    const response = await api.get(`products/${productId}/stock/`);
    return response.data;
  },

  async getStockMovements(params?: CommonQueryParams): Promise<PaginatedResponse<StockMovement>> {
    const response = await api.get('movements/', { params });
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

  async getGlobalStockStats(): Promise<GlobalStockStats> {
    const response = await api.get('products/global_stock_stats/');
    return response.data;
  },

  // --- Dashboard & Stats ---
  async getStats(params?: { start_date?: string; end_date?: string }): Promise<DashboardStats> {
    const response = await api.get('dashboard/', { params });
    return response.data;
  },

  // --- Users ---
  async getUsers(): Promise<UserAccount[]> {
    const response = await api.get('users/');
    return Array.isArray(response.data) ? response.data : (response.data.results || []);
  },

  async getMe(): Promise<UserAccount> {
    const response = await api.get('users/me/');
    return response.data;
  },

  // --- Exports & Imports ---
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

  async importProducts(file: File): Promise<{ success: boolean; created: number; updated: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('products/import_products/', formData);
    return response.data;
  },
};

export default inventoryService;
