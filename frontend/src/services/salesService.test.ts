import { describe, it, expect, vi, beforeEach } from 'vitest';
import salesService from './salesService';
import api from './api';

// Mock the api instance
vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('salesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should call api.post with correct data', async () => {
      const mockOrder = {
        client: 1,
        invoice_type: 'retail' as const,
        items: [{ product: 1, quantity: 2, unit_price: '1000' }],
        payment_method: 'cash'
      };
      
      const mockResponse = { id: 123, ...mockOrder };
      (api.post as any).mockResolvedValue({ data: mockResponse });

      const result = await salesService.createOrder(mockOrder);

      expect(api.post).toHaveBeenCalledWith('invoices/', mockOrder);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getOrders', () => {
    it('should fetch orders with params', async () => {
      const mockOrders = { results: [] };
      (api.get as any).mockResolvedValue({ data: mockOrders });

      const params = { page: 1 };
      const result = await salesService.getOrders(params);

      expect(api.get).toHaveBeenCalledWith('sales/', { params });
      expect(result).toEqual(mockOrders);
    });
  });
});
