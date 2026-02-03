/**
 * Centralized currency formatter for the application.
 * Ensures consistent display of GNF and other currencies if added.
 */
export const formatCurrency = (value: string | number | undefined | null) => {
    if(value === undefined || value === null) return '0 GNF';

    const num = typeof value === 'string' ? parseFloat(value): value;

    // GNF doesn't typically show decimals.
    // We use fr-GN locale if available, but manual append is safer for broad support.
    return new Intl.NumberFormat('fr-GN', { maximumFractionDigits: 0, useGrouping: true, }).format(num || 0) + ' GNF';
};

/**
 * Alternative formatter if shorter display is needed (e.g. FG instead of GNF)
 */
export const formatCurrencyShort = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value): value;
    return new Intl.NumberFormat('fr-GN', { maximumFractionDigits: 0, }).format(num || 0) + ' FG';
};
