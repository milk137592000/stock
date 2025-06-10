import { StockDetails, StockSymbol, UserHoldings } from './types';

export const DEFAULT_INVESTMENT_AMOUNT = 10000;
export const MIN_INVESTMENT_AMOUNT = 1000;
export const MAX_INVESTMENT_AMOUNT = 20000; // Updated

export const EXISTING_HOLDINGS_SYMBOLS: StockSymbol[] = [
  '006208', '00646', '00919', '00878', '0056', '00933B',
  '00713', '00733', '00858', '00900', '00910', '00916', '00921', '00942B', '00947'
];

// Simulated current prices added
export const ALL_STOCKS_MAP: Record<StockSymbol, Omit<StockDetails, 'symbol'>> = {
  '006208': { name: '富邦台50', category: 'TW ETF', currentPrice: 96.50 },
  '00646': { name: '元大S&P500', category: 'TW ETF', currentPrice: 45.20 },
  '00919': { name: '群益台灣精選高息', category: 'TW ETF', currentPrice: 26.80 },
  '00878': { name: '國泰永續高股息', category: 'TW ETF', currentPrice: 23.50 },
  '0056': { name: '元大高股息', category: 'TW ETF', currentPrice: 38.75 },
  '00933B': { name: '國泰10Y+金融債', category: 'Bond ETF', currentPrice: 16.50 },
  '0050': { name: '元大台灣50', category: 'TW ETF', currentPrice: 155.30 },
  '2330': { name: '台積電', category: 'TW Stock', currentPrice: 850.00 },
  '00929': { name: '復華台灣科技優息', category: 'TW ETF', currentPrice: 20.10 },
  '00679B': { name: '元大美債20年', category: 'Bond ETF', currentPrice: 30.50 },
  '2603': { name: '長榮', category: 'TW Stock', currentPrice: 205.00 },
  '00940': { name: '元大臺灣價值高息', category: 'TW ETF', currentPrice: 9.80 },
  '00713': { name: '元大台灣高息低波', category: 'TW ETF', currentPrice: 55.60 },
  '00733': { name: '新光台灣高息低波', category: 'TW ETF', currentPrice: 25.00 },
  '00858': { name: '永豐台灣ESG', category: 'TW ETF', currentPrice: 22.00 },
  '00900': { name: '富邦特選高股息30', category: 'TW ETF', currentPrice: 18.00 },
  '00910': { name: '群益台灣精選高息成長', category: 'TW ETF', currentPrice: 20.00 },
  '00916': { name: '兆豐永續高息等權', category: 'TW ETF', currentPrice: 21.00 },
  '00921': { name: '中信成長高股息', category: 'TW ETF', currentPrice: 19.00 },
  '00942B': { name: '元大ESG債', category: 'Bond ETF', currentPrice: 16.00 },
  '00947': { name: '群益台灣精選高息永續', category: 'TW ETF', currentPrice: 24.00 },
  'AAPL': { name: 'Apple Inc.', category: 'US Stock', currentPrice: 170.00 * 32.5 },
  'GOOGL': { name: 'Alphabet Inc. (Google)', category: 'US Stock', currentPrice: 150.00 * 32.5 },
  'MSFT': { name: 'Microsoft Corp.', category: 'US Stock', currentPrice: 400.00 * 32.5 },
  'AMZN': { name: 'Amazon.com Inc.', category: 'US Stock', currentPrice: 180.00 * 32.5 },
};

export const NEW_SUGGESTIONS_POOL: StockSymbol[] = ['0050', '2330', '00929', '00679B', '2603', '00940', '00713', 'AAPL', 'MSFT'];

export const MONTH_NAMES_FULL = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月"
];

// User's current holdings as provided
export const USER_HOLDINGS: UserHoldings = {
  '006208': 289, // 富邦台50
  '00646': 0,   // 元大S&P500
  '00919': 6057, // 群益台灣精選高息
  '00878': 1572, // 國泰永續高股息
  '0056': 0,    // 元大高股息
  '00933B': 2632, // 國泰10Y+金融債
  '00713': 1133,
  '00733': 68,
  '00858': 600,
  '00900': 2815,
  '00910': 2000,
  '00916': 207,
  '00921': 222,
  '00942B': 552,
  '00947': 1129,
};