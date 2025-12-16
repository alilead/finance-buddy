// Currency conversion service using exchange rates API
// Falls back to static rates if API is unavailable

interface ExchangeRates {
  [key: string]: number; // Rate to CHF
}

// Static fallback rates (updated periodically)
const FALLBACK_RATES: ExchangeRates = {
  CHF: 1,
  EUR: 0.95,
  USD: 0.91,
  GBP: 1.15,
  JPY: 0.0064,
  CAD: 0.67,
  AUD: 0.60,
  SEK: 0.085,
  NOK: 0.083,
  DKK: 0.13,
  PLN: 0.23,
  CZK: 0.041,
  HUF: 0.0026,
  RON: 0.20,
  BGN: 0.51,
  HRK: 0.13,
  TRY: 0.027,
  RUB: 0.0098,
  CNY: 0.13,
  HKD: 0.12,
  SGD: 0.68,
  NZD: 0.56,
  ZAR: 0.049,
  BRL: 0.18,
  MXN: 0.046,
  ARS: 0.00091,
  KRW: 0.00067,
  INR: 0.011,
  THB: 0.026,
  MYR: 0.21,
  IDR: 0.000059,
  PHP: 0.016,
  VND: 0.000037,
};

// Cache for exchange rates
let ratesCache: ExchangeRates | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 3600000; // 1 hour

/**
 * Fetch live exchange rates from exchangerate-api.com (free tier)
 */
async function fetchExchangeRates(): Promise<ExchangeRates | null> {
  try {
    // Using exchangerate-api.com free tier (no API key needed for CHF base)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/CHF');
    
    if (!response.ok) {
      console.log('Exchange rate API unavailable, using fallback rates');
      return null;
    }

    const data = await response.json();
    const rates: ExchangeRates = { CHF: 1 };

    // Convert from CHF base to rates that convert TO CHF
    Object.entries(data.rates).forEach(([currency, rate]) => {
      rates[currency] = 1 / (rate as number);
    });

    return rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return null;
  }
}

/**
 * Get exchange rates (cached or fetched)
 */
async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  
  // Return cached rates if still valid
  if (ratesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return ratesCache;
  }

  // Try to fetch new rates
  const rates = await fetchExchangeRates();
  if (rates) {
    ratesCache = rates;
    cacheTimestamp = now;
    return rates;
  }

  // Fallback to static rates
  return FALLBACK_RATES;
}

/**
 * Convert amount from source currency to CHF
 */
export async function convertToCHF(
  amount: number | null,
  fromCurrency: string | null
): Promise<number | null> {
  if (amount === null || fromCurrency === null) {
    return null;
  }

  const currency = fromCurrency.toUpperCase();
  
  // If already CHF, return as is
  if (currency === 'CHF') {
    return Math.round(amount * 100) / 100;
  }

  try {
    const rates = await getExchangeRates();
    const rate = rates[currency];

    if (!rate) {
      console.warn(`Unknown currency: ${currency}, using 1:1 conversion`);
      return Math.round(amount * 100) / 100;
    }

    const converted = amount / rate;
    return Math.round(converted * 100) / 100;
  } catch (error) {
    console.error('Error converting currency:', error);
    // Fallback: try to use fallback rates
    const rate = FALLBACK_RATES[currency];
    if (rate) {
      return Math.round((amount / rate) * 100) / 100;
    }
    return amount; // Return original if conversion fails
  }
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number | null,
  fromCurrency: string | null,
  toCurrency: string = 'CHF'
): Promise<number | null> {
  if (amount === null || fromCurrency === null) {
    return null;
  }

  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return Math.round(amount * 100) / 100;
  }

  // Convert to CHF first, then to target currency
  const inCHF = await convertToCHF(amount, fromCurrency);
  if (inCHF === null) return null;

  if (toCurrency.toUpperCase() === 'CHF') {
    return inCHF;
  }

  try {
    const rates = await getExchangeRates();
    const targetRate = rates[toCurrency.toUpperCase()];
    
    if (!targetRate) {
      return inCHF; // Return CHF value if target currency not found
    }

    return Math.round((inCHF * targetRate) * 100) / 100;
  } catch (error) {
    console.error('Error converting currency:', error);
    return inCHF;
  }
}

/**
 * Get current exchange rate for a currency pair
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string = 'CHF'
): Promise<number | null> {
  try {
    const rates = await getExchangeRates();
    const fromRate = rates[fromCurrency.toUpperCase()];
    const toRate = rates[toCurrency.toUpperCase()];

    if (!fromRate || !toRate) {
      return null;
    }

    // Convert from -> CHF -> to
    return toRate / fromRate;
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    return null;
  }
}

