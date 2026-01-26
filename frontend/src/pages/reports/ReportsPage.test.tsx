import { screen, waitFor } from '@testing-library/react';
import { render } from '@/tests/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportsPage } from './ReportsPage';
import dashboardService from '@/services/dashboardService';

// Mock the service
vi.mock('@/services/dashboardService', () => ({
  default: {
    getStats: vi.fn(),
  },
}));

// Mock utils
vi.mock('@/lib/utils', async () => {
    const actual = await vi.importActual('@/lib/utils');
    return {
        ...actual,
        formatCurrency: (amount: number) => `MOCK_${amount}_GNF`,
    };
});

// Mock Recharts ResponsiveContainer
vi.mock('recharts', async () => {
    const original = await vi.importActual('recharts');
    return {
      ...original,
      // We render a simple div with data-testid to verify presence
      ResponsiveContainer: ({ children }: { children: any }) => (
        <div style={{ width: 800, height: 400 }} data-testid="recharts-container">{children}</div>
      ),
    };
});

const mockStats = {
  monthly_revenue: 2500000,
  monthly_history: [
    { name: 'Jan', revenue: 150000, expenses: 50000, profit: 100000 },
    { name: 'Feb', revenue: 160000, expenses: 60000, profit: 100000 },
  ],
  stock_distribution_by_category: [
    { name: 'Electronics', value: 5000000 },
    { name: 'Clothing', value: 3000000 },
  ],
  top_selling_products: [
    { name: 'Laptop', value: 1200000 },
    { name: 'Phone', value: 800000 },
  ]
};

const emptyStats = {
  monthly_revenue: 0,
  monthly_history: [],
  stock_distribution_by_category: [],
  top_selling_products: []
};

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title and description', () => {
    (dashboardService.getStats as any).mockResolvedValue(mockStats);
    render(<ReportsPage />);
    
    expect(screen.getByText('Rapports & Analyses')).toBeInTheDocument();
    expect(screen.getByText('Visualisez les performances de votre entreprise.')).toBeInTheDocument();
  });

  it('should render action buttons', () => {
    (dashboardService.getStats as any).mockResolvedValue(mockStats);
    render(<ReportsPage />);
    
    expect(screen.getByText('Derniers 30 jours')).toBeInTheDocument();
    expect(screen.getByText('Exporter PDF')).toBeInTheDocument();
  });

  it('should render summary cards with data', async () => {
    (dashboardService.getStats as any).mockResolvedValue(mockStats);
    render(<ReportsPage />);

    await waitFor(() => {
        expect(screen.getByText(`MOCK_${mockStats.monthly_revenue}_GNF`)).toBeInTheDocument();
    });
    expect(screen.getByText('CA Total (30j)')).toBeInTheDocument();
  });

  it('should render charts when data is available', async () => {
    (dashboardService.getStats as any).mockResolvedValue(mockStats);
    render(<ReportsPage />);

    // Titles verify with regex for flexibility
    await screen.findAllByText(/Évolution des Ventes/i);
    expect(screen.getAllByText(/Répartition.*Catégorie/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rentabilité/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Top 5/i).length).toBeGreaterThan(0);

    const charts = screen.getAllByTestId('recharts-container');
    expect(charts.length).toBeGreaterThanOrEqual(4);
  });

  it('should display "Pas de données disponibles" when data is empty', async () => {
    (dashboardService.getStats as any).mockResolvedValue(emptyStats);
    render(<ReportsPage />);

    await waitFor(() => {
        const emptyMessages = screen.getAllByText('Pas de données disponibles');
        expect(emptyMessages.length).toBeGreaterThanOrEqual(4);
    });
  });

  it('should handle loading state gracefully', () => {
    (dashboardService.getStats as any).mockReturnValue(new Promise(() => {}));
    render(<ReportsPage />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });
});
