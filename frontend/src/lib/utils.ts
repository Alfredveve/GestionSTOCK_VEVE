import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: string | number) => {
  return new Intl.NumberFormat('fr-GN', {
    maximumFractionDigits: 0
  }).format(Number(amount)) + ' GNF';
};
