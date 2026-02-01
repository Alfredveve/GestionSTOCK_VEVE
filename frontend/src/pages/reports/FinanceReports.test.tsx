import { screen, waitFor } from '@testing-library/react';
import { render } from '@/tests/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { FinanceReports } from './FinanceReports';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import React from 'react';

// Mock useQuery
vi.mock('@tanstack/react-query', async () => {
    const actual = await vi.importActual('@tanstack/react-query');
    return {
        ...actual,
        useQuery: vi.fn(),
    };
});

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
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 } as React.CSSProperties} data-testid="recharts-container">{children}</div>
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

const mockDiscountAnalytics = {
    gross_revenue: 2000000,
    net_revenue: 1800000,
    total_discounts: 200000,
    discount_rate: 10,
    invoice_count: 50,
    order_count: 45
};

const emptyStats = {
  monthly_revenue: 0,
  monthly_expenses: 0,
  net_profit: 0,
  monthly_history: [],
  recent_activities: [],
};

const mockUseQuery = useQuery as Mock;

describe('FinanceReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    mockUseQuery.mockReturnValue({
      isLoading: true,
      data: undefined
    } as unknown as UseQueryResult<unknown>);
    const { container } = render(<FinanceReports />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders KPI cards correctly', async () => {
    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
        if (Array.isArray(queryKey) && queryKey.includes('dashboard-stats')) {
            return { data: mockStats, isLoading: false } as unknown as UseQueryResult<unknown>;
        }
        return { data: mockDiscountAnalytics, isLoading: false } as unknown as UseQueryResult<unknown>;
    });
    
    render(<FinanceReports />);

    await waitFor(() => {
        expect(screen.getByText('Finance & Paiements')).toBeInTheDocument();
    });

    expect(screen.getByText('Revenu Total')).toBeInTheDocument();
    expect(screen.getAllByText(`MOCK_${mockStats.monthly_revenue}_GNF`).length).toBeGreaterThan(0);
  });

  it('calculates average daily revenue correctly', async () => {
    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
        if (Array.isArray(queryKey) && queryKey.includes('dashboard-stats')) {
            return { data: mockStats, isLoading: false } as unknown as UseQueryResult<unknown>;
        }
        return { data: mockDiscountAnalytics, isLoading: false } as unknown as UseQueryResult<unknown>;
    });
    
    render(<FinanceReports />);
    
    await waitFor(() => screen.getByText('Moyenne Quotidienne'));
    expect(screen.getByText('Moyenne Quotidienne')).toBeInTheDocument();
    expect(screen.getAllByText((content) => content.includes('MOCK_') && content.includes('_GNF')).length).toBeGreaterThan(0);
  });

  it('renders recent transactions table', async () => {
    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
        if (Array.isArray(queryKey) && queryKey.includes('dashboard-stats')) {
            return { data: mockStats, isLoading: false } as unknown as UseQueryResult<unknown>;
        }
        return { data: mockDiscountAnalytics, isLoading: false } as unknown as UseQueryResult<unknown>;
    });
    
    render(<FinanceReports />);

    await screen.findAllByText((content) => content.includes('Rapport de Transactions'));
    expect(screen.getByText('Rapport de Transactions')).toBeInTheDocument();
    expect(screen.getAllByText(/MOCK_.*_GNF/).length).toBeGreaterThan(0);
  });

  it('should handle empty data gracefully', async () => {
    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
        if (Array.isArray(queryKey) && queryKey.includes('dashboard-stats')) {
            return { data: emptyStats, isLoading: false } as unknown as UseQueryResult<unknown>;
        }
        return { data: mockDiscountAnalytics, isLoading: false } as unknown as UseQueryResult<unknown>;
    });
    
    render(<FinanceReports />);

    await waitFor(() => {
        expect(screen.getByText('Finance & Paiements')).toBeInTheDocument();
    });

    expect(screen.getAllByText('MOCK_0_GNF').length).toBeGreaterThan(0);
  });

  it('renders discount analytics section', async () => {
    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
        if (Array.isArray(queryKey) && queryKey.includes('dashboard-stats')) {
            return { data: mockStats, isLoading: false } as unknown as UseQueryResult<unknown>;
        }
        return { data: mockDiscountAnalytics, isLoading: false } as unknown as UseQueryResult<unknown>;
    });
    
    render(<FinanceReports />);
  
    await waitFor(() => {
        expect(screen.getByText('Flux de Trésorerie Mensuel')).toBeInTheDocument();
    });
    
    const charts = screen.getAllByTestId('recharts-container');
    expect(charts.length).toBeGreaterThan(0);
  });
});
