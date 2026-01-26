import { screen, waitFor } from '@testing-library/react';
import { render } from '@/tests/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfitReport } from './ProfitReport';
import inventoryService from '@/services/inventoryService';

// Mock the service
vi.mock('@/services/inventoryService', () => ({
  default: {
    getProfitReports: vi.fn(),
  },
}));

// Mock utils
vi.mock('@/lib/utils', async () => {
    const actual = await vi.importActual('@/lib/utils');
    return {
        ...actual,
        formatCurrency: (amount: number | string) => `MOCK_${Number(amount)}_GNF`,
    };
});

// Mock Recharts ResponsiveContainer
vi.mock('recharts', async () => {
    const original = await vi.importActual('recharts');
    return {
      ...original,
      ResponsiveContainer: ({ children }: { children: any }) => (
        <div style={{ width: 800, height: 400 }} data-testid="recharts-container">{children}</div>
      ),
    };
});

const mockReportData = {
    results: [
        { 
            id: 1, 
            month: 1, 
            year: 2024, 
            total_sales_brut: '150000.00', 
            total_cost_of_goods: '90000.00', 
            total_expenses: '20000.00', 
            gross_profit: '60000.00', 
            net_interest: '40000.00' 
        },
        { 
            id: 2, 
            month: 2, 
            year: 2024, 
            total_sales_brut: '200000.00', 
            total_cost_of_goods: '120000.00', 
            total_expenses: '25000.00', 
            gross_profit: '80000.00', 
            net_interest: '55000.00' 
        },
    ]
};

const emptyReportData = {
    results: []
};

describe('ProfitReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    (inventoryService.getProfitReports as any).mockReturnValue(new Promise(() => {}));
    render(<ProfitReport />);
    expect(screen.getByText('Calcul des rapports en cours...')).toBeInTheDocument();
  });

  it('should render analytics card and summary', async () => {
    (inventoryService.getProfitReports as any).mockResolvedValue(mockReportData);
    render(<ProfitReport />);

    await waitFor(() => {
        expect(screen.getByText('Analyse Comparative de Rentabilité')).toBeInTheDocument();
    });
    expect(screen.getByText('Vue d\'ensemble sur les 6 derniers mois.')).toBeInTheDocument();
    
    expect(screen.getByText('Cumul Annuel (Net)')).toBeInTheDocument();
    expect(screen.getByText('Dernière Performance')).toBeInTheDocument();
  });

  it('should verify chart rendering', async () => {
    (inventoryService.getProfitReports as any).mockResolvedValue(mockReportData);
    render(<ProfitReport />);
    await waitFor(() => expect(screen.getByTestId('recharts-container')).toBeInTheDocument());
  });

  it('should render reports table with correct data', async () => {
    (inventoryService.getProfitReports as any).mockResolvedValue(mockReportData);
    render(<ProfitReport />);

    await waitFor(() => {
        expect(screen.getByText('Historique des Rapports Mensuels')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/2024/i).length).toBeGreaterThan(0);

    const netInterest1 = 40000;
    const grossProfit1 = 60000;
    
    // Check if these amounts exist in the document (table cells)
    expect(screen.getAllByText(`MOCK_${netInterest1}_GNF`).length).toBeGreaterThan(0);
    expect(screen.getAllByText(`MOCK_${grossProfit1}_GNF`).length).toBeGreaterThan(0);
  });

  it('should display empty state message when no data', async () => {
    (inventoryService.getProfitReports as any).mockResolvedValue(emptyReportData);
    render(<ProfitReport />);

    await waitFor(() => {
        expect(screen.getByText('Aucune donnée financière disponible pour le moment.')).toBeInTheDocument();
    });
  });
});
