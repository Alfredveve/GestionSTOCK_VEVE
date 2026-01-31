import { render, screen } from '@testing-library/react';
import { StatsCard } from '../StatsCard';
import { DollarSign } from 'lucide-react';
import { describe, it, expect } from 'vitest';

describe('StatsCard Component', () => {
    it('renders with correct label and formatted value', () => {
        render(
            <StatsCard 
                label="Total Sales" 
                value={1000000} 
                icon={DollarSign} 
                color="blue" 
            />
        );

        expect(screen.getByText('Total Sales')).toBeInTheDocument();
        // Checked formatCurrency: it formats with spaces and GNF suffix, e.g. "1 000 000 GNF"
        // But the formatter might depend on locale. Let's check for the presence of the number at least.
        expect(screen.getByText(/1.*000.*000.*GNF/)).toBeInTheDocument(); 
    });

    it('applies correct color classes based on props', () => {
        render(
            <StatsCard 
                label="Revenue" 
                value={500} 
                icon={DollarSign} 
                color="emerald" 
            />
        );
        
        // Find the value element which should have the color class
        const valueElement = screen.getByText(/500.*GNF/);
        expect(valueElement).toHaveClass('text-emerald-600');
    });
});
