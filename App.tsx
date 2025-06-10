import React, { useState, useCallback, useEffect } from 'react';
import { InvestmentControls } from './components/InvestmentControls';
import { RecommendationDisplay } from './components/RecommendationDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { getInvestmentAdvice } from './services/investmentAdvisorService';
import { InvestmentAdvice, StockSymbol, UserHoldings, StockDetails } from './types';
import {
  DEFAULT_INVESTMENT_AMOUNT,
  MIN_INVESTMENT_AMOUNT,
  MAX_INVESTMENT_AMOUNT,
  INITIAL_USER_HOLDINGS, // Renamed
  INITIAL_ALL_STOCKS_MAP, // Renamed
  AI_MODELS,
  AIModelType
} from './constants';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PortfolioManagement } from './components/PortfolioManagement'; // New Import

const App: React.FC = () => {
  const [userMaxMonthlyInvestment, setUserMaxMonthlyInvestment] = useState<number>(DEFAULT_INVESTMENT_AMOUNT);
  const [advice, setAdvice] = useState<InvestmentAdvice | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonthName, setCurrentMonthName] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<AIModelType>('GEMINI');

  const [userHoldings, setUserHoldings] = useState<UserHoldings>(INITIAL_USER_HOLDINGS);
  const [currentAllStocksMap, setCurrentAllStocksMap] =
    useState<Record<StockSymbol, Partial<Omit<StockDetails, 'symbol'>>>>(INITIAL_ALL_STOCKS_MAP);

  useEffect(() => {
    const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月",
      "七月", "八月", "九月", "十月", "十一月", "十二月"];
    const currentMonthIndex = new Date().getMonth();
    setCurrentMonthName(monthNames[currentMonthIndex]);
  }, []);

  const handleHoldingSharesChange = (symbol: StockSymbol, shares: number) => {
    setUserHoldings(prev => ({ ...prev, [symbol]: Math.max(0, shares) }));
  };

  const handleAddStockToHoldings = (symbol: StockSymbol, shares: number) => {
    const trimmedSymbol = symbol.trim().toUpperCase();
    if (!trimmedSymbol) return; // Do not add if symbol is empty

    setUserHoldings(prev => ({
      ...prev,
      [trimmedSymbol]: (prev[trimmedSymbol] || 0) + Math.max(0, shares)
    }));

    if (!currentAllStocksMap[trimmedSymbol] && !INITIAL_ALL_STOCKS_MAP[trimmedSymbol]) {
      setCurrentAllStocksMap(prevMap => ({
        ...prevMap,
        [trimmedSymbol]: {
          name: `自訂 (${trimmedSymbol})`,
          category: '未知分類',
          currentPrice: 0,
        }
      }));
    }
  };

  const handleRemoveStockFromHoldings = (symbol: StockSymbol) => {
    setUserHoldings(prev => {
      const newHoldings = { ...prev };
      delete newHoldings[symbol];
      return newHoldings;
    });
    // No need to remove from currentAllStocksMap, it's fine if it stays with placeholder.
  };

  const handleGetAdvice = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAdvice(null);
    try {
      const activeHoldingSymbols = Object.keys(userHoldings)
        .filter(symbol => userHoldings[symbol] !== undefined && userHoldings[symbol]! > 0) as StockSymbol[];

      const mapForAI: Record<StockSymbol, Partial<Omit<StockDetails, 'symbol'>>> = { ...INITIAL_ALL_STOCKS_MAP };

      Object.keys(userHoldings).forEach(symbol => {
        if (!mapForAI[symbol]) {
          mapForAI[symbol] = currentAllStocksMap[symbol] || {
            name: `用戶新增 (${symbol})`,
            category: 'TW Stock',
            currentPrice: 0,
          };
        }
      });

      const newAdvice = await getInvestmentAdvice(
        userMaxMonthlyInvestment,
        activeHoldingSymbols,
        userHoldings,
        mapForAI,
        selectedModel
      );
      setAdvice(newAdvice);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || '無法獲取投資建議，請稍後再試。');
      } else {
        setError('發生未知錯誤，無法獲取投資建議。');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [userMaxMonthlyInvestment, userHoldings, currentAllStocksMap, selectedModel]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-slate-100 flex flex-col items-center p-4 sm:p-6 md:p-8">
      <Header currentMonthName={currentMonthName} />

      <main className="container mx-auto w-full max-w-4xl space-y-8">
        <div className="bg-slate-800 rounded-lg p-4 shadow-lg">
          <label htmlFor="model-select" className="block text-sm font-medium text-slate-300 mb-2">
            選擇 AI 模型
          </label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as AIModelType)}
            className="w-full bg-slate-700 text-slate-100 rounded-md border border-slate-600 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {Object.entries(AI_MODELS).map(([key, model]) => (
              <option key={key} value={key}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        <InvestmentControls
          monthlyInvestment={userMaxMonthlyInvestment}
          onInvestmentChange={setUserMaxMonthlyInvestment}
          onGetAdvice={handleGetAdvice}
          isLoading={isLoading}
          minAmount={MIN_INVESTMENT_AMOUNT}
          maxAmount={MAX_INVESTMENT_AMOUNT}
        />

        <PortfolioManagement
          userHoldings={userHoldings}
          onSharesChange={handleHoldingSharesChange}
          onAddStock={handleAddStockToHoldings}
          onRemoveStock={handleRemoveStockFromHoldings}
          allStocksView={currentAllStocksMap}
        />

        {isLoading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}
        {advice && !isLoading && !error && (
          <RecommendationDisplay advice={advice} />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default App;