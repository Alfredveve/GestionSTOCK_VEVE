import { screen, waitFor } from '@testing-library/react';
import { render } from '@/tests/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { AdvancedAnalytics } from './AdvancedAnalytics';
import dashboardService from '@/services/dashboardService';

// Mock the service
vi.mock('@/services/dashboardService', () => ({
  default: {
    getStats: vi.fn(),
  },
}));

// Mock Recharts components to avoid issues in jsdom
vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: any }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});

const mockStats = {
  total_stock_value: 5000000,
  low_stock_count: 12,
  today_orders: 45,
  total_products_count: 156,
  stock_distribution_by_category: [
    { name: 'Électronique', value: 2000000 },
    { name: 'Accessoires', value: 500000 },
  ],
  top_selling_products: [
    { name: 'Smartphone X', value: 800000, quantity: 20 },
  ],
  stock_movement_evolution: [
    { name: 'Jan', entries: 50, exits: 30 },
  ],
  low_stock_products: [
    { id: 1, name: 'Produit Rare', quantity: 2, threshold: 5, image: null },
  ],
};

describe('AdvancedAnalytics', () => {
  it('should render KPI cards with data', async () => {
    (dashboardService.getStats as any).mockResolvedValue(mockStats);
    render(<AdvancedAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Analyses Avancées')).toBeDefined();
    });

    expect(screen.getByText(/5\s?000\s?000/)).toBeDefined(); // Total Stock Value
    expect(screen.getByText('12')).toBeDefined(); // Low Stock Count
    expect(screen.getByText('45')).toBeDefined(); // Today Orders
  });

  it('should render the low stock watchlist', async () => {
    (dashboardService.getStats as any).mockResolvedValue(mockStats);
    render(<AdvancedAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Produit Rare')).toBeDefined();
      expect(screen.getByText('2 restants')).toBeDefined();
    });
  });

  it('should render category distribution data', async () => {
    (dashboardService.getStats as any).mockResolvedValue(mockStats);
    render(<AdvancedAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Électronique')).toBeDefined();
      expect(screen.getByText(/2\s?000\s?000/)).toBeDefined();
    });
  });
});
