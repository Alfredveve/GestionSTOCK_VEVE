import { describe, it, expect, vi, beforeEach } from 'vitest';
import inventoryService from './inventoryService';
import api from './api';

// Mock the api instance
vi.mock('./api', () => ({
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
    it('should call api.get with correct endpoint and params', async () => {
      const mockData = { results: [], count: 0 };
      (api.get as any).mockResolvedValue({ data: mockData });

      const params = { search: 'test', page: 2 };
      const result = await inventoryService.getProducts(params);

      expect(api.get).toHaveBeenCalledWith('products/', { params });
      expect(result).toEqual(mockData);
    });
  });

  describe('getProduct', () => {
    it('should fetch a single product by id', async () => {
      const mockProduct = { id: 1, name: 'Product 1' };
      (api.get as any).mockResolvedValue({ data: mockProduct });

      const result = await inventoryService.getProduct(1);

      expect(api.get).toHaveBeenCalledWith('products/1/');
      expect(result).toEqual(mockProduct);
    });
  });

  describe('getCategories', () => {
    it('should fetch all categories', async () => {
      const mockCategories = [{ id: 1, name: 'Cat 1' }];
      (api.get as any).mockResolvedValue({ data: mockCategories });

      const result = await inventoryService.getCategories();

      expect(api.get).toHaveBeenCalledWith('categories/');
      expect(result).toEqual(mockCategories);
    });
  });
  
  describe('getStats', () => {
    it('should fetch dashboard statistics', async () => {
      const mockStats = { today_sales: 1000 };
      (api.get as any).mockResolvedValue({ data: mockStats });

      const result = await inventoryService.getStats();

      expect(api.get).toHaveBeenCalledWith('dashboard/');
      expect(result).toEqual(mockStats);
    });
  });
});
