
import { StockDetails, StockSymbol, UserHoldings } from './types';

export const DEFAULT_INVESTMENT_AMOUNT = 10000;
export const MIN_INVESTMENT_AMOUNT = 1000;
export const MAX_INVESTMENT_AMOUNT = 20000;

// This list is now derived dynamically in App.tsx from userHoldings state.
// export const EXISTING_HOLDINGS_SYMBOLS: StockSymbol[] = [ ... ];

// Renamed to indicate it's the initial state, App.tsx will manage a dynamic version.
// IMPORTANT: currentPrice values are snapshots for AI calculation and UI display. They are NOT live market prices.
// These prices have been manually updated to reflect more recent plausible values (as of a general recent timeframe).
export const INITIAL_ALL_STOCKS_MAP: Record<StockSymbol, Omit<StockDetails, 'symbol'>> = {
  '006208': { name: '富邦台50', category: 'TW ETF', currentPrice: 100.50 },
  '00646': { name: '元大S&P500', category: 'TW ETF', currentPrice: 60.30 },
  '00919': { name: '群益台灣精選高息', category: 'TW ETF', currentPrice: 27.10 },
  '00878': { name: '國泰永續高股息', category: 'TW ETF', currentPrice: 24.05 },
  '0056': { name: '元大高股息', category: 'TW ETF', currentPrice: 40.20 },
  '00933B': { name: '國泰10Y+金融債', category: 'Bond ETF', currentPrice: 16.80 },
  '0050': { name: '元大台灣50', category: 'TW ETF', currentPrice: 170.50 },
  '2330': { name: '台積電', category: 'TW Stock', currentPrice: 955.00 },
  '00929': { name: '復華台灣科技優息', category: 'TW ETF', currentPrice: 21.15 },
  '00679B': { name: '元大美債20年', category: 'Bond ETF', currentPrice: 29.80 },
  '2603': { name: '長榮', category: 'TW Stock', currentPrice: 210.00 },
  '00940': { name: '元大臺灣價值高息', category: 'TW ETF', currentPrice: 10.25 },
  '00713': { name: '元大台灣高息低波', category: 'TW ETF', currentPrice: 58.50 },
  'AAPL': { name: 'Apple Inc.', category: 'US Stock', currentPrice: 190.00 * 32.5}, // Approx. 190 USD * 32.5 TWD/USD
  'GOOGL': { name: 'Alphabet Inc. (Google)', category: 'US Stock', currentPrice: 175.00 * 32.5}, // Approx. 175 USD * 32.5 TWD/USD
  'MSFT': { name: 'Microsoft Corp.', category: 'US Stock', currentPrice: 430.00 * 32.5}, // Approx. 430 USD * 32.5 TWD/USD
  'AMZN': { name: 'Amazon.com Inc.', category: 'US Stock', currentPrice: 185.00 * 32.5}, // Approx. 185 USD * 32.5 TWD/USD
  '00733': { name: '富邦臺灣中小', category: 'TW ETF', currentPrice: 70.50 },
  '00858': { name: '永豐美國500大', category: 'TW ETF', currentPrice: 30.80 }, // Tracks S&P500, different unit price than 00646
  '00900': { name: '富邦特選高股息30', category: 'TW ETF', currentPrice: 15.20 },
  '00910': { name: '華南永昌台灣未來科技ETF', category: 'TW ETF', currentPrice: 18.30 },
  '00916': { name: '國泰全球品牌50 ETF', category: 'TW ETF', currentPrice: 22.40 },
  '00921': { name: '兆豐台灣產業龍頭存股等權重ETF', category: 'TW ETF', currentPrice: 19.10 },
  '00942B': { name: '台新美A公司債20+', category: 'Bond ETF', currentPrice: 15.50 },
  '00947': { name: '台新臺灣IC設計動能ETF', category: 'TW ETF', currentPrice: 16.10 },
};

// This pool can still be used if desired, but new stocks can also be added manually by the user.
export const NEW_SUGGESTIONS_POOL: StockSymbol[] = [
  '0050', '2330', '00929', '00679B', '2603', '00940', '00713', 'AAPL', 'MSFT',
  '00733', '00858', '00900', '00910', '00916', '00921', '00942B', '00947'
];

export const MONTH_NAMES_FULL = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月"
];

// This will be dynamically loaded from warehouse.md
export const INITIAL_USER_HOLDINGS: UserHoldings = {};
