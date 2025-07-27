import fetch from 'node-fetch';

/**
 * Currency Converter Service
 * Converts INR to USD in real-time and caches results
 */

interface ExchangeRateResponse {
  success: boolean;
  rates: {
    USD: number;
  };
  timestamp: number;
}

interface CurrencyConversion {
  inrAmount: number;
  usdAmount: number;
  exchangeRate: number;
  lastUpdated: Date;
}

export class CurrencyConverter {
  private static instance: CurrencyConverter;
  private cachedRate: { rate: number; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly FALLBACK_RATE = 0.012; // Fallback rate if API fails (1 INR ≈ $0.012)

  static getInstance(): CurrencyConverter {
    if (!CurrencyConverter.instance) {
      CurrencyConverter.instance = new CurrencyConverter();
    }
    return CurrencyConverter.instance;
  }

  /**
   * Get current USD exchange rate from free API
   */
  private async fetchExchangeRate(): Promise<number> {
    try {
      // Using exchangerate-api.com free tier (1000 requests/month)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: any = await response.json();
      
      if (data.rates && data.rates.USD) {
        console.log(`✓ Exchange rate fetched: 1 INR = $${data.rates.USD}`);
        return data.rates.USD;
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
      console.log(`Using fallback rate: 1 INR = $${this.FALLBACK_RATE}`);
      return this.FALLBACK_RATE;
    }
  }

  /**
   * Get cached or fresh exchange rate
   */
  private async getExchangeRate(): Promise<number> {
    const now = Date.now();
    
    // Check if cached rate is still valid
    if (this.cachedRate && (now - this.cachedRate.timestamp) < this.CACHE_DURATION) {
      console.log(`Using cached exchange rate: 1 INR = $${this.cachedRate.rate}`);
      return this.cachedRate.rate;
    }

    // Fetch fresh rate
    const rate = await this.fetchExchangeRate();
    
    // Cache the new rate
    this.cachedRate = {
      rate,
      timestamp: now
    };

    return rate;
  }

  /**
   * Convert INR amount to USD
   */
  async convertINRtoUSD(inrAmount: number): Promise<CurrencyConversion> {
    const exchangeRate = await this.getExchangeRate();
    const usdAmount = Math.round((inrAmount * exchangeRate) * 100) / 100; // Round to 2 decimal places

    return {
      inrAmount,
      usdAmount,
      exchangeRate,
      lastUpdated: new Date()
    };
  }

  /**
   * Get subscription pricing in both currencies
   */
  async getSubscriptionPricing(): Promise<{
    inr: { amount: number; display: string; currency: string };
    usd: { amount: number; display: string; currency: string };
    exchangeRate: number;
    note: string;
  }> {
    const INR_PRICE = 999; // Updated from ₹1 to ₹999
    const conversion = await this.convertINRtoUSD(INR_PRICE);

    return {
      inr: {
        amount: INR_PRICE,
        display: `₹${INR_PRICE}`,
        currency: 'INR'
      },
      usd: {
        amount: conversion.usdAmount,
        display: `$${conversion.usdAmount}`,
        currency: 'USD'
      },
      exchangeRate: conversion.exchangeRate,
      note: `Exchange rate: 1 INR = $${conversion.exchangeRate} (updated ${conversion.lastUpdated.toLocaleTimeString()})`
    };
  }

  /**
   * Format currency display for users
   */
  formatCurrencyDisplay(inrAmount: number, usdAmount: number): string {
    return `₹${inrAmount} (~$${usdAmount})`;
  }
}

export const currencyConverter = CurrencyConverter.getInstance();