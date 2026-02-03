import { describe, it, expect } from 'vitest';
import { formatCurrency } from './utils';

describe('formatCurrency', () => {
  it('formats positive numbers correctly', () => {
    expect(formatCurrency(1000)).toBe('1\u202f000 GNF'); // Using narrow non-breaking space if that's what browser uses or just check loose
    // Actually, distinct locales might behave differently in Node vs Browser. 
    // Let's verify what the output typically is or use a regex.
    const result = formatCurrency(1000);
    expect(result).toMatch(/1[\s\u202f]000 GNF/);
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('0 GNF');
  });

  it('formats large numbers correctly', () => {
    expect(formatCurrency(1000000)).toMatch(/1[\s\u202f]000[\s\u202f]000 GNF/);
  });

  it('handles string inputs', () => {
    expect(formatCurrency("500")).toBe('500 GNF');
  });
});
