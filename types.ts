import { AIModelType } from './constants';

export type StockSymbol = string; // Changed to string to allow arbitrary user-added symbols

export interface StockDetails {
  symbol: StockSymbol;
  name: string;
  category: 'TW ETF' | 'TW Stock' | 'US Stock' | 'Bond ETF' | '未知分類'; // Added '未知分類'
  currentPrice: number; // Added current price
}

export interface RecommendedStock extends StockDetails {
  allocatedAmount: number; // The NTD amount for BUY (cost) or SELL (proceeds). 0 for HOLD.
  recommendedShares: number; // Number of shares to buy/sell. Positive for buy/sell quantity.
  action: 'BUY' | 'HOLD' | 'SELL'; // Action to take
  reasoning: string;
  currentHoldingShares?: number; // Current shares held by the user
}

export interface InvestmentAdvice {
  currentMonth: number; // 1-12
  userMaxMonthlyInvestment: number; // User's stated maximum willingness to invest
  decidedOptimalInvestmentNTD: number; // The actual investment amount AI decided for the month
  existingHoldingsRecommendations: RecommendedStock[];
  newSuggestions: RecommendedStock[];
  marketOutlook: string; // Brief outlook based on the month/AI
  budgetSummary?: GeminiBudgetSummary; // Optional summary from AI
}

export enum MarketSentiment { // This might be deprecated if AI provides full outlook
  BULLISH = '樂觀',
  NEUTRAL = '中性',
  CAUTIOUS = '謹慎',
}

// UserHoldings will use string keys because StockSymbol is now string
export type UserHoldings = {
  [key in StockSymbol]?: number;
};

// Types for parsing Gemini API Response
interface GeminiManagedRec {
  symbol: StockSymbol; // Will be string
  action: 'BUY' | 'SELL' | 'HOLD';
  shares: number;
  reasoning: string;
}

interface GeminiNewSuggestionRec {
  symbol: StockSymbol; // Will be string
  shares: number; // Assumed action is 'BUY'
  reasoning: string;
}

export interface GeminiBudgetSummary {
  userProvidedMonthlyCapacityNTD: number; // User's max capacity (e.g., 1000-20000 range max)
  decidedOptimalInvestmentNTD: number; // The amount AI decided to invest this month
  totalSpentOnBuysNTD: number;
  totalGainedFromSellsNTD: number;
  netInvestmentNTD: number;
  remainingUnallocatedNTD: number; // Relative to decidedOptimalInvestmentNTD
}

export interface GeminiApiResponse {
  marketOutlook: string;
  managedRecommendations: GeminiManagedRec[];
  newStockSuggestions: GeminiNewSuggestionRec[];
  budgetSummary: GeminiBudgetSummary;
}

export interface AIModelConfig {
  name: string;
  model: string;
  baseUrl: string;
  apiKey: string;
}