import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CartSection } from './CartSection';

vi.mock('@/lib/utils', async () => {
    const actual = await vi.importActual('@/lib/utils');
    return {
        ...actual,
        formatCurrency: (amount: number) => `${amount} GNF`,
    };
});

describe('CartSection Component Tests', () => {
  const mockProps = {
    cart: [
      {
        id: 1,
        name: 'Produit Test',
        selling_price: '1000',
        wholesale_selling_price: '800',
        cartQuantity: 2,
        saleType: 'retail' as const,
        sku: 'TEST-001',
        current_stock: 10,
        category: 1,
      } as any
    ],
    onUpdateQuantity: vi.fn(),
    onRemove: vi.fn(),
    onClear: vi.fn(),
    clients: [{ id: 1, name: 'Client de Passage' }],
    selectedClientId: 1,
    onSelectClient: vi.fn(),
    onCheckout: vi.fn(),
    orderType: 'retail' as const,
    isProcessing: false,
    walkInDetails: { name: 'John Doe', phone: '123' },
    onWalkInChange: vi.fn(),
    isInvoiceMode: false,
    isWalkIn: false,
    onToggleWalkIn: vi.fn(),
    notes: '',
    onNotesChange: vi.fn(),
  };

  it('devrait calculer le sous-total correctement sans taxe', () => {
    render(<CartSection {...mockProps} />);
    
    // 2 * 1000 = 2000
    // Be very specific to avoid matching SVG attributes or other numbers
    const subtotalDisplay = screen.queryAllByText(/2.*000/).find(el => 
        el.parentElement?.textContent?.includes('Sous-total')
    );
    expect(subtotalDisplay).toBeDefined();
  });

  it('devrait appeler onCheckout avec les bons montants', () => {
    render(<CartSection {...mockProps} />);
    
    const checkoutBtn = screen.getByRole('button', { name: /Confirmer la Vente/i });
    fireEvent.click(checkoutBtn);
    
    expect(mockProps.onCheckout).toHaveBeenCalledWith({
      subtotal: 2000,
      discount: 0,
      total: 2000
    });
  });

  it('devrait permettre de changer les détails du client de passage quand isWalkIn est true', () => {
    const walkInProps = { ...mockProps, isWalkIn: true };
    render(<CartSection {...walkInProps} />);
    
    const nameInput = screen.getByPlaceholderText(/Nom du client/i);
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    
    expect(mockProps.onWalkInChange).toHaveBeenCalledWith({
      name: 'Jane Doe',
      phone: '123'
    });
  });

  it('ne devrait pas afficher de taxe', () => {
    render(<CartSection {...mockProps} />);
    expect(screen.queryByText(/TVA|Taxe/i)).toBeNull();
  });

  it('devrait appeler onToggleWalkIn lors du clic sur le bouton Passage', () => {
    render(<CartSection {...mockProps} />);
    const passageBtn = screen.getByRole('button', { name: /Passage/i });
    fireEvent.click(passageBtn);
    expect(mockProps.onToggleWalkIn).toHaveBeenCalledWith(true);
  });
});
