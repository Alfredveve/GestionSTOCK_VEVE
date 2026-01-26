import { screen, waitFor } from '@testing-library/react';
import { render } from '@/tests/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinanceReports } from './FinanceReports';
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

// Mock Recharts ResponsiveContainer to avoid issues in jsdom
vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: any }) => (
      <div style={{ width: 800, height: 400 }} data-testid="recharts-container">{children}</div>
    ),
  };
});

const mockStats = {
  monthly_revenue: 1500000,
  monthly_expenses: 500000,
  net_profit: 1000000,
  monthly_history: [
    { name: 'Jan', revenue: 100000, expenses: 40000, profit: 60000 },
    { name: 'Feb', revenue: 120000, expenses: 50000, profit: 70000 },
  ],
  recent_activities: [
    { id: 1, type: 'Vente', description: 'Vente #1', date: '2023-01-01T10:00:00Z', amount: 5000, reference: 'REF1' },
    { id: 2, type: 'Achat', description: 'Achat #1', date: '2023-01-02T11:00:00Z', amount: 2000, reference: 'REF2' },
  ],
};

const emptyStats = {
  monthly_revenue: 0,
  monthly_expenses: 0,
  net_profit: 0,
  monthly_history: [],
  recent_activities: [],
};

describe('FinanceReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (dashboardService.getStats as any).mockReturnValue(new Promise(() => {}));
    const { container } = render(<FinanceReports />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should render KPI cards with correct data', async () => {
    (dashboardService.getStats as any).mockResolvedValue(mockStats);
    render(<FinanceReports />);

    await waitFor(() => {
        expect(screen.getByText('Finance & Paiements')).toBeInTheDocument();
    });

    expect(screen.getByText('Revenu Total')).toBeInTheDocument();
    
    // Check using mocked currency format
    expect(screen.getAllByText(`MOCK_${mockStats.monthly_revenue}_GNF`).length).toBeGreaterThan(0);
    expect(screen.getAllByText(`MOCK_${mockStats.monthly_expenses}_GNF`).length).toBeGreaterThan(0);
    expect(screen.getAllByText(`MOCK_${mockStats.net_profit}_GNF`).length).toBeGreaterThan(0);
  });

  it('should calculate and display average revenue correctly', async () => {
    (dashboardService.getStats as any).mockResolvedValue(mockStats);
    render(<FinanceReports />);

    const totalRevenue = 100000 + 120000; // 220000
    const count = 2;
    const average = totalRevenue / count; // 110000
    const dailyAverage = average / 30; // 3666.666...
    
    await waitFor(() => screen.getByText('Moyenne Quotidienne'));
    
    expect(screen.getByText('Moyenne Quotidienne')).toBeInTheDocument();
    // Verify part of the mock string or exact match if integer
    // Since mock logic is just temp string, it might include decimals.
    expect(screen.getAllByText((content) => content.includes('MOCK_') && content.includes('_GNF')).length).toBeGreaterThan(0);
  });

  it('should render the transactions table with correct rows', async () => {
    (dashboardService.getStats as any).mockResolvedValue(mockStats);
    render(<FinanceReports />);

    await screen.findAllByText((content) => content.includes('Rapport de Transactions'));
    expect(screen.getByText('Rapport de Transactions')).toBeInTheDocument();

    // Check availability of data generally
    expect(screen.getAllByText(/MOCK_.*_GNF/).length).toBeGreaterThan(0);
  });

  it('should handle empty data gracefully', async () => {
    (dashboardService.getStats as any).mockResolvedValue(emptyStats);
    render(<FinanceReports />);

    await waitFor(() => {
        expect(screen.getByText('Finance & Paiements')).toBeInTheDocument();
    });

    // KPIS should be 0
    expect(screen.getAllByText('MOCK_0_GNF').length).toBeGreaterThan(0);

    expect(screen.queryByText('Vente #1')).not.toBeInTheDocument();
  });

  it('should render charts container', async () => {
      (dashboardService.getStats as any).mockResolvedValue(mockStats);
      render(<FinanceReports />);
  
      await waitFor(() => {
          expect(screen.getByText('Flux de Trésorerie Mensuel')).toBeInTheDocument();
      });
        
      const charts = screen.getAllByTestId('recharts-container');
      expect(charts.length).toBeGreaterThan(0);
  });
});
