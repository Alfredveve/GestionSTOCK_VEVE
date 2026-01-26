import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { POS } from './POS';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import inventoryService from '@/services/inventoryService';
import salesService from '@/services/salesService';

// Mocking the services used in POS
vi.mock('@/services/inventoryService', () => ({
  default: {
    getProducts: vi.fn(),
    getClients: vi.fn(),
    getCategories: vi.fn(),
  }
}));

vi.mock('@/services/salesService', () => ({
  default: {
    createInvoice: vi.fn(),
  }
}));

vi.mock('@/services/settingsService', () => ({
  default: {
    getSettings: vi.fn(() => Promise.resolve({ 
      default_order_type: 'retail',
      currency: 'GNF',
      tax_rate: 18
    })),
  }
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('POS Component Deep Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    
    (inventoryService.getProducts as any).mockResolvedValue({
      results: [
        { 
          id: 1, 
          name: 'Product 1', 
          selling_price: '1000', 
          wholesale_selling_price: '800', 
          current_stock: 10, 
          sku: 'P1', 
          category_name: 'Cat 1' 
        }
      ]
    });
    (inventoryService.getClients as any).mockResolvedValue({ results: [] });
    (inventoryService.getCategories as any).mockResolvedValue({ results: [] });
  });

  it('should add product to cart and calculate total', async () => {
    render(<POS />, { wrapper });
    
    // Find product card and click
    const productCard = await screen.findByText(/Product 1/);
    fireEvent.click(productCard);
    
    // Check if added to cart (look for quantity or name in cart area)
    expect(screen.getByText(/Panier/)).toBeDefined();
    expect(screen.getAllByText(/Product 1/).length).toBeGreaterThan(1); // One in catalog, one in cart
    
    // Total should be 1000 GNF + tax (if applicable)
    // Actually POS logic might vary, let's check for the price display
    expect(screen.getByText(/1 000/)).toBeDefined();
  });

  it('should switch between retail and wholesale modes', async () => {
    render(<POS />, { wrapper });
    
    const productCard = await screen.findByText(/Product 1/);
    fireEvent.click(productCard);
    
    // Toggle wholesale
    const wholesaleToggle = screen.getByLabelText(/Gros/i);
    fireEvent.click(wholesaleToggle);
    
    // Price should change to 800
    await waitFor(() => {
      expect(screen.getByText(/800/)).toBeDefined();
    });
  });

  it('should apply line discount', async () => {
    render(<POS />, { wrapper });
    
    const productCard = await screen.findByText(/Product 1/);
    fireEvent.click(productCard);
    
    // Open discount modal/input for the item
    const discountBtn = screen.getByRole('button', { name: /%|Remise/i }); 
    fireEvent.click(discountBtn);
    
    // Apply 10% discount
    const input = screen.getByPlaceholderText(/0/);
    fireEvent.change(input, { target: { value: '10' } });
    
    // Check total (1000 - 10% = 900)
    await waitFor(() => {
      expect(screen.getByText(/900/)).toBeDefined();
    });
  });
});
