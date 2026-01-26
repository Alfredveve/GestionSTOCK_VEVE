import { describe, it, expect, vi, beforeEach } from 'vitest';
import inventoryService from '../inventoryService';
import api from '../api';

// Mock the api module
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('inventoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should call api.get with correct url and params', async () => {
      const mockResult = { data: { results: [], count: 0 } };
      (api.get as any).mockResolvedValue(mockResult);

      const params = { search: 'test', page: 1 };
      const result = await inventoryService.getProducts(params);

      expect(api.get).toHaveBeenCalledWith('products/', { params });
      expect(result).toEqual(mockResult.data);
    });
  });

  describe('getStockMovements', () => {
    it('should call api.get with movement_type filter', async () => {
      const mockResult = { data: { results: [], count: 0 } };
      (api.get as any).mockResolvedValue(mockResult);

      const params = { movement_type: 'entry' };
      await inventoryService.getStockMovements(params);

      expect(api.get).toHaveBeenCalledWith('movements/', { params });
    });

    it('should call api.get with product filter (new feature)', async () => {
        const mockResult = { data: { results: [], count: 0 } };
        (api.get as any).mockResolvedValue(mockResult);
  
        const params = { product: 123 };
        await inventoryService.getStockMovements(params);
  
        expect(api.get).toHaveBeenCalledWith('movements/', { params });
      });
  });

  describe('createStockMovement', () => {
    it('should call api.post with correct data', async () => {
      const mockResult = { data: { id: 1, product: 1, quantity: 10, movement_type: 'entry' } };
      (api.post as any).mockResolvedValue(mockResult);

      const payload = {
        product: 1,
        quantity: 10,
        movement_type: 'entry',
        from_point_of_sale: 1,
      };
      const result = await inventoryService.createStockMovement(payload);

      expect(api.post).toHaveBeenCalledWith('movements/', payload);
      expect(result).toEqual(mockResult.data);
    });
  });

  describe('getInventoryByPOS', () => {
    it('should fetch inventory for specific point of sale', async () => {
      const mockResult = { data: { results: [], count: 0 } };
      (api.get as any).mockResolvedValue(mockResult);

      const params = { point_of_sale: 1 };
      await inventoryService.getInventoryByPOS(params);

      expect(api.get).toHaveBeenCalledWith('inventory/', { params });
    });
  });
});
