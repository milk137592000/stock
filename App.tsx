
import React, { useState, useCallback, useEffect } from 'react';
import { InvestmentControls } from './components/InvestmentControls';
import { RecommendationDisplay } from './components/RecommendationDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { AIModelSelector } from './components/AIModelSelector';
import { StockDataUpdater } from './components/StockDataUpdater';
import { UpdateNotification } from './components/UpdateNotification';
import { getInvestmentAdvice } from './services/investmentAdvisorService';
import { loadHoldingsFromWarehouse, loadAIModelsFromConfig, AIModelConfig } from './services/dataService';
import { StockCrawlerService, extractSymbolsFromHoldings } from './services/stockCrawlerService';
import { createAIService } from './services/aiService';
import { InvestmentAdvice, StockSymbol, UserHoldings, StockDetails, StockRealTimeInfo } from './types';
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

  // 新增：通知狀態
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });

  // 新增：自動更新狀態
  const [isAutoUpdating, setIsAutoUpdating] = useState<boolean>(false);

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

  // 自動更新股票資料 - 在持股資料載入完成後執行
  useEffect(() => {
    if (!isLoadingData && Object.keys(userHoldings).length > 0 && !isAutoUpdating) {
      // 延遲1.5秒後自動更新，讓用戶看到載入完成
      const timer = setTimeout(() => {
        autoUpdateStockData();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isLoadingData, userHoldings]);

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

  // 新增：處理股票資料更新
  const handleStockDataUpdated = (updatedData: StockRealTimeInfo[]) => {
    // 更新股票資料到 currentAllStocksMap
    const updatedStocksMap = { ...currentAllStocksMap };

    updatedData.forEach(stock => {
      updatedStocksMap[stock.symbol] = {
        name: stock.name,
        category: 'TW Stock', // 預設分類
        currentPrice: stock.currentPrice
      };
    });

    setCurrentAllStocksMap(updatedStocksMap);

    // 顯示成功通知
    setNotification({
      show: true,
      message: `成功更新 ${updatedData.length} 檔股票資料`,
      type: 'success'
    });

    // 3秒後自動隱藏通知
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // 新增：關閉通知
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  // 新增：處理warehouse內容更新
  const handleWarehouseUpdated = (newContent: string) => {
    // 這裡可以選擇是否要立即更新持股資料
    // 目前先顯示通知，讓用戶知道資料已更新
    setNotification({
      show: true,
      message: '股票資料已更新到持股卡片，warehouse.md檔案已下載',
      type: 'info'
    });

    // 3秒後自動隱藏通知
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // 新增：自動更新股票資料
  const autoUpdateStockData = async () => {
    if (Object.keys(userHoldings).length === 0) {
      return;
    }

    setIsAutoUpdating(true);

    try {
      // 獲取股票代號
      const symbols = extractSymbolsFromHoldings(userHoldings);

      if (symbols.length > 0) {
        // 爬取股票資訊
        const stockInfos = await StockCrawlerService.fetchMultipleStocks(symbols);

        // 更新股票資料到 currentAllStocksMap
        const updatedStocksMap = { ...currentAllStocksMap };

        stockInfos.forEach(stock => {
          updatedStocksMap[stock.symbol] = {
            name: stock.name,
            category: 'TW Stock', // 預設分類
            currentPrice: stock.currentPrice
          };
        });

        setCurrentAllStocksMap(updatedStocksMap);

        // 顯示自動更新成功通知
        setNotification({
          show: true,
          message: `🚀 自動更新完成！已更新 ${stockInfos.length} 檔股票資料`,
          type: 'success'
        });

        // 5秒後自動隱藏通知
        setTimeout(() => {
          setNotification(prev => ({ ...prev, show: false }));
        }, 5000);
      }
    } catch (error) {
      console.error('自動更新股票資料失敗:', error);
      setNotification({
        show: true,
        message: '自動更新失敗，請稍後手動更新',
        type: 'error'
      });

      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
    } finally {
      setIsAutoUpdating(false);
    }
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
        <p className="mt-2 text-slate-400 text-sm">載入完成後將自動更新股票資料</p>
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

        {/* 新增：股票資料更新器 */}
        <StockDataUpdater
          userHoldings={userHoldings}
          onDataUpdated={handleStockDataUpdated}
          onWarehouseUpdated={handleWarehouseUpdated}
          isAutoUpdating={isAutoUpdating}
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

      {/* 新增：更新通知 */}
      <UpdateNotification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={handleCloseNotification}
      />
    </div>
  );
};

export default App;
