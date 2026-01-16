import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { POS } from './POS';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mocking the services used in POS
vi.mock('@/services/inventoryService', () => ({
  default: {
    getProducts: vi.fn(() => Promise.resolve({ results: [{ id: 1, name: 'Product 1', selling_price: '1000', wholesale_selling_price: '800', current_stock: 10, sku: 'P1', category_name: 'Cat 1' }] })),
    getClients: vi.fn(() => Promise.resolve({ results: [] })),
  }
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('POS Component', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should render the POS interface', async () => {
    render(<POS />, { wrapper });
    // Check for the search bar which is a key part of the POS
    expect(await screen.findByPlaceholderText(/Rechercher/i)).toBeDefined();
    // Check for the cart section
    expect(screen.getByText(/Panier/i)).toBeDefined();
  });
});
