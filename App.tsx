
import React, { useState, useCallback, useEffect } from 'react';
import { InvestmentControls } from './components/InvestmentControls';
import { RecommendationDisplay } from './components/RecommendationDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { AIModelSelector } from './components/AIModelSelector';
import { getInvestmentAdvice } from './services/investmentAdvisorService';
import { loadHoldingsFromWarehouse, loadAIModelsFromConfig, AIModelConfig } from './services/dataService';
import { createAIService } from './services/aiService';
import { InvestmentAdvice, StockSymbol, UserHoldings, StockDetails } from './types';
import {
  DEFAULT_INVESTMENT_AMOUNT,
  MIN_INVESTMENT_AMOUNT,
  MAX_INVESTMENT_AMOUNT,
  INITIAL_USER_HOLDINGS,
  INITIAL_ALL_STOCKS_MAP
} from './constants';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PortfolioManagement } from './components/PortfolioManagement';

const App: React.FC = () => {
  const [userMaxMonthlyInvestment, setUserMaxMonthlyInvestment] = useState<number>(DEFAULT_INVESTMENT_AMOUNT);
  const [advice, setAdvice] = useState<InvestmentAdvice | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonthName, setCurrentMonthName] = useState<string>('');

  const [userHoldings, setUserHoldings] = useState<UserHoldings>(INITIAL_USER_HOLDINGS);
  const [currentAllStocksMap, setCurrentAllStocksMap] =
    useState<Record<StockSymbol, Partial<Omit<StockDetails, 'symbol'>>>>(INITIAL_ALL_STOCKS_MAP);

  // 新增 AI 模型相關狀態
  const [availableModels, setAvailableModels] = useState<AIModelConfig[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModelConfig | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // 初始化資料載入
  useEffect(() => {
    const initializeData = async () => {
      setIsLoadingData(true);
      try {
        // 載入持股資料
        const holdingsData = await loadHoldingsFromWarehouse();
        if (Object.keys(holdingsData).length > 0) {
          setUserHoldings(holdingsData);
        }

        // 載入 AI 模型配置
        const modelsData = await loadAIModelsFromConfig();
        setAvailableModels(modelsData);

        // 預設選擇第一個可用的模型
        if (modelsData.length > 0) {
          setSelectedModel(modelsData[0]);
        }

        // 設定當前月份名稱
        const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月",
                            "七月", "八月", "九月", "十月", "十一月", "十二月"];
        const currentMonthIndex = new Date().getMonth();
        setCurrentMonthName(monthNames[currentMonthIndex]);

      } catch (error) {
        console.error('初始化資料失敗:', error);
        setError('載入資料失敗，請檢查 warehouse.md 和 api.md 檔案');
      } finally {
        setIsLoadingData(false);
      }
    };

    initializeData();
  }, []);

  const handleHoldingSharesChange = (symbol: StockSymbol, shares: number) => {
    setUserHoldings(prev => ({ ...prev, [symbol]: Math.max(0, shares) }));
  };

  const handleAddStockToHoldings = (symbol: StockSymbol, shares: number) => {
    const trimmedSymbol = symbol.trim().toUpperCase();
    if (!trimmedSymbol) return; 

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
  };

  const handleGetAdvice = useCallback(async () => {
    if (!selectedModel) {
      setError('請先選擇一個 AI 模型');
      return;
    }

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

      // 使用選擇的 AI 模型
      const aiService = createAIService(selectedModel);
      const newAdvice = await aiService.generateInvestmentAdvice(
        userMaxMonthlyInvestment,
        activeHoldingSymbols,
        userHoldings,
        mapForAI
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


  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-slate-100 flex flex-col items-center justify-center p-4">
        <LoadingSpinner />
        <p className="mt-4 text-slate-300">載入資料中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-slate-100 flex flex-col items-center p-4 sm:p-6 md:p-8">
      <Header currentMonthName={currentMonthName} />

      <main className="container mx-auto w-full max-w-4xl space-y-8">
        {/* AI 模型選擇器 */}
        <AIModelSelector
          models={availableModels}
          selectedModel={selectedModel}
          onModelSelect={setSelectedModel}
          isLoading={isLoading}
        />

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
          existingHoldingsRecommendations={advice?.existingHoldingsRecommendations}
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
