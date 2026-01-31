import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentDialog } from '../PaymentDialog';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

// Mock dependencies
vi.mock('@/services/inventoryService', () => ({
    default: {
        recordPayment: vi.fn().mockResolvedValue({}),
    },
}));

const invoiceMock = {
    id: 1,
    invoice_number: 'INV-001',
    client_name: 'John Doe',
    date_issued: '2023-01-01',
    due_date: '2023-01-15',
    total_amount: '100000',
    paid_amount: '0',
    balance: '100000',
    status: 'unpaid',
    items: []
};

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

describe('PaymentDialog Component', () => {
    it('renders correctly when open', () => {
        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <PaymentDialog 
                    open={true} 
                    onOpenChange={vi.fn()} 
                    invoice={invoiceMock} 
                    onSuccess={vi.fn()} 
                />
            </QueryClientProvider>
        );

        expect(screen.getByText('Enregistrer un paiement')).toBeInTheDocument();
        expect(screen.getByText(/INV-001/)).toBeInTheDocument();
        expect(screen.getByLabelText('Montant')).toBeInTheDocument();
    });

    it('does not render when invoice is null', () => {
        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <PaymentDialog 
                    open={true} 
                    onOpenChange={vi.fn()} 
                    invoice={null} 
                    onSuccess={vi.fn()} 
                />
            </QueryClientProvider>
        );

        expect(screen.queryByText('Enregistrer un paiement')).not.toBeInTheDocument();
    });
});
