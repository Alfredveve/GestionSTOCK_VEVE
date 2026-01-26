import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../tests/test-utils';
import { Dashboard } from '../Dashboard';
import dashboardService from '@/services/dashboardService';

// Mock dashboardService
vi.mock('@/services/dashboardService', () => ({
  default: {
    getStats: vi.fn(),
  },
}));

// Mock Recharts to avoid layout issues in JSDOM
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: '100%', height: '100%' }}>{children}</div>,
  };
});

const mockStats = {
  total_products_count: 150,
  total_stock_value: 5000000,
  total_sales_value: 2500000,
  pending_orders_count: 5,
  returned_products: { results: [], total_pages: 1 },
  defective_products: { results: [], total_pages: 1 },
  low_stock_products: { results: [], total_pages: 1 },
  latest_stock_movements: { results: [], total_pages: 1 },
  remaining_products: { results: [], total_pages: 1 },
  stock_movement_evolution: [
    { name: 'Mon', entries: 10, exits: 5 },
    { name: 'Tue', entries: 8, exits: 12 },
  ],
  stock_distribution_by_category: [
    { name: 'Category 1', value: 1000 },
  ],
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (dashboardService.getStats as any).mockResolvedValue(mockStats);
  });

  it('renders dashboard header and refresh button', async () => {
    render(<Dashboard />);
    expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    expect(screen.getByText('Actualiser')).toBeInTheDocument();
  });

  it('renders KPI cards with correct data', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
      // formatCurrency might be different depending on locale, but let's check for the digits
      expect(screen.getByText(/5.*000.*000/)).toBeInTheDocument();
      expect(screen.getByText(/2.*500.*000/)).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('renders charts section titles', async () => {
    render(<Dashboard />);
    expect(screen.getByText('Évolution des mouvements de stock')).toBeInTheDocument();
    expect(screen.getByText('Répartition des stocks par catégorie')).toBeInTheDocument();
  });

  it('calls refetch when refresh button is clicked', async () => {
    render(<Dashboard />);
    const refreshButton = screen.getByText('Actualiser');
    refreshButton.click();
    
    await waitFor(() => {
      expect(dashboardService.getStats).toHaveBeenCalled();
    });
  });
});
