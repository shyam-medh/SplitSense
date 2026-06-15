// Currency conversion utilities
// Default exchange rate: 1 USD = 85 INR (configurable)

const EXCHANGE_RATES: Record<string, number> = {
  INR: 1,
  USD: 85,
};

/**
 * Convert an amount from one currency to INR.
 */
export function toINR(amount: number, currency: string): number {
  const rate = EXCHANGE_RATES[currency.toUpperCase()];
  if (!rate) {
    // Unknown currency — treat as INR and log
    return amount;
  }
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Get the exchange rate for a given currency to INR.
 */
export function getExchangeRate(currency: string): number {
  return EXCHANGE_RATES[currency.toUpperCase()] ?? 1;
}

/**
 * Format amount with currency symbol.
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency.toUpperCase() === 'USD' ? 'USD' : 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}
