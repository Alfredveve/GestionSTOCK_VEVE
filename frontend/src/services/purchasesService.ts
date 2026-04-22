import api from './api';
import type { 
  Supplier, 
  Receipt, 
  ReceiptCreatePayload,
  PaginatedResponse,
  CommonQueryParams
} from '@/types';

export interface SupplierCreatePayload {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
}

const purchasesService = {
  // --- Suppliers ---
  getSuppliers: async (params?: CommonQueryParams): Promise<PaginatedResponse<Supplier>> => {
    const response = await api.get('suppliers/', { params });
    return response.data;
  },

  createSupplier: async (data: SupplierCreatePayload): Promise<Supplier> => {
    const response = await api.post('suppliers/', data);
    return response.data;
  },

  // --- Receipts (Purchases) ---
  getReceipts: async (params?: CommonQueryParams): Promise<PaginatedResponse<Receipt>> => {
    const response = await api.get('receipts/', { params });
    return response.data;
  },

  getReceipt: async (id: number): Promise<Receipt> => {
    const response = await api.get(`receipts/${id}/`);
    return response.data;
  },

  createReceipt: async (data: ReceiptCreatePayload): Promise<Receipt> => {
    const response = await api.post('receipts/', data);
    return response.data;
  },

  updateReceipt: async (id: number, data: Partial<ReceiptCreatePayload>): Promise<Receipt> => {
    const response = await api.put(`receipts/${id}/`, data);
    return response.data;
  },

  deleteReceipt: async (id: number): Promise<void> => {
    await api.delete(`receipts/${id}/`);
  },

  // --- Exports ---
  exportReceiptsExcel: async (): Promise<void> => {
    const response = await api.get('receipts/export_excel/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Achats_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportReceiptsPdf: async (): Promise<void> => {
    const response = await api.get('receipts/export_pdf/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Achats_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};

export default purchasesService;
