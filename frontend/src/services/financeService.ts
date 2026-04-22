import api from './api';
import type { 
  Invoice, 
  Expense, 
  ExpenseCategory, 
  MonthlyProfitReport, 
  PaginatedResponse,
  Payment,
  CommonQueryParams
} from '@/types';

export interface PaymentCreatePayload {
  invoice: number;
  amount: number;
  payment_method: string;
  notes?: string;
}

export interface ExpenseCreatePayload {
  category: number;
  amount: number;
  point_of_sale?: number;
  date: string;
  description: string;
  reference?: string;
}

const financeService = {
  // --- Invoices ---
  getInvoices: async (params?: CommonQueryParams): Promise<PaginatedResponse<Invoice>> => {
    const response = await api.get('invoices/', { params });
    return response.data;
  },

  getInvoice: async (id: number | string): Promise<Invoice> => {
    const response = await api.get(`invoices/${id}/`);
    return response.data;
  },

  deleteInvoice: async (id: number): Promise<void> => {
    await api.delete(`invoices/${id}/`);
  },

  // --- Expenses ---
  getExpenses: async (params?: CommonQueryParams): Promise<PaginatedResponse<Expense>> => {
    const response = await api.get('expenses/', { params });
    return response.data;
  },

  createExpense: async (data: ExpenseCreatePayload): Promise<Expense> => {
    const response = await api.post('expenses/', data);
    return response.data;
  },

  getExpenseCategories: async (): Promise<PaginatedResponse<ExpenseCategory>> => {
    const response = await api.get('expense-categories/');
    return response.data;
  },

  createExpenseCategory: async (data: Partial<ExpenseCategory>): Promise<ExpenseCategory> => {
    const response = await api.post('expense-categories/', data);
    return response.data;
  },

  updateExpenseCategory: async (id: number, data: Partial<ExpenseCategory>): Promise<ExpenseCategory> => {
    const response = await api.put(`expense-categories/${id}/`, data);
    return response.data;
  },

  deleteExpenseCategory: async (id: number): Promise<void> => {
    await api.delete(`expense-categories/${id}/`);
  },

  // --- Payments ---
  getPayments: async (params?: CommonQueryParams): Promise<PaginatedResponse<Payment>> => {
    const response = await api.get('payments/', { params });
    return response.data;
  },

  createPayment: async (data: PaymentCreatePayload): Promise<Payment> => {
    const response = await api.post('payments/', data);
    return response.data;
  },

  // --- Reports ---
  getProfitReports: async (params?: CommonQueryParams): Promise<PaginatedResponse<MonthlyProfitReport>> => {
    const response = await api.get('profit-reports/', { params });
    return response.data;
  },

  // --- Exports ---
  exportInvoicesExcel: async (): Promise<void> => {
    const response = await api.get('invoices/export_excel/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Factures_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportInvoicesPdf: async (): Promise<void> => {
    const response = await api.get('invoices/export_pdf/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Factures_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportInvoicePdf: async (id: number, invoiceNumber: string = ''): Promise<void> => {
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

  exportExpensesExcel: async (): Promise<void> => {
    const response = await api.get('expenses/export_excel/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Depenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportExpensesPdf: async (): Promise<void> => {
    const response = await api.get('expenses/export_pdf/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Depenses_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};

export default financeService;
