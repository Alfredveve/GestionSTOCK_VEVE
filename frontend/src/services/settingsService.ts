import api from './api';

export interface Settings {
  id?: number;
  company_name: string;
  company_logo?: string;
  language: 'fr' | 'en';
  currency: 'GNF' | 'USD' | 'EUR';
  tax_rate: string | number;
  default_order_type: 'retail' | 'wholesale';
  email_notifications: boolean;
  daily_reports: boolean;
  new_customer_notifications: boolean;
  smart_rounding: boolean;
}

const settingsService = {
  getSettings: async (): Promise<Settings> => {
    const response = await api.get('settings/current/');
    return response.data;
  },

  updateSettings: async (data: Partial<Settings>): Promise<Settings> => {
    const response = await api.patch('settings/current/', data);
    return response.data;
  },
};

export default settingsService;
