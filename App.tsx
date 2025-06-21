
import React, { useState, useCallback, useEffect } from 'react';
import { InvestmentControls } from './components/InvestmentControls';
import { RecommendationDisplay } from './components/RecommendationDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { AIModelSelector } from './components/AIModelSelector';
import { StockDataUpdater } from './components/StockDataUpdater';
import { UpdateNotification } from './components/UpdateNotification';
import { WarehouseFileManager } from './components/WarehouseFileManager';
import { SchedulerManager } from './components/SchedulerManager';
import { GoogleSheetsSync } from './components/GoogleSheetsSync';
import { getInvestmentAdvice } from './services/investmentAdvisorService';
import { loadHoldingsFromWarehouse, loadDetailedHoldingsFromWarehouse, loadAIModelsFromConfig, AIModelConfig } from './services/dataService';
import { StockCrawlerService, extractSymbolsFromHoldings, autoUpdateWarehouseContent } from './services/stockCrawlerService';
import { WarehouseApiService, isAutoUpdateSupported } from './services/warehouseApiService';
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

  // 新增：warehouse 文件管理器狀態
  const [warehouseManager, setWarehouseManager] = useState<{
    show: boolean;
    content: string;
  }>({
    show: false,
    content: ''
  });

  // 新增：自動更新支援狀態
  const [autoUpdateSupported, setAutoUpdateSupported] = useState<boolean>(false);

  // 初始化資料載入
  useEffect(() => {
    const initializeData = async () => {
      setIsLoadingData(true);
      try {
        // 載入詳細持股資料（包含現價信息）
        const detailedHoldings = await loadDetailedHoldingsFromWarehouse();
        if (detailedHoldings.length > 0) {
          // 提取持股數量
          const holdingsData: UserHoldings = {};
          const updatedStocksMap: { [key: string]: StockDetails } = { ...currentAllStocksMap };

          detailedHoldings.forEach(holding => {
            holdingsData[holding.symbol] = holding.shares;

            // 更新股票詳細信息（包含現價）
            updatedStocksMap[holding.symbol] = {
              name: holding.name || holding.symbol,
              category: 'TW Stock', // 預設分類，可以根據需要調整
              currentPrice: holding.currentPrice || 0
            };
          });

          setUserHoldings(holdingsData);
          setCurrentAllStocksMap(updatedStocksMap);
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

        // 檢查自動更新支援
        const autoUpdateAvailable = await isAutoUpdateSupported();
        setAutoUpdateSupported(autoUpdateAvailable);

        if (autoUpdateAvailable) {
          console.log('✅ 自動更新服務可用 - warehouse.md 可以自動更新');
        } else {
          console.log('⚠️ 自動更新服務不可用 - 將使用手動下載方式');
        }

      } catch (error) {
        console.error('初始化資料失敗:', error);
        setError('載入資料失敗，請檢查 warehouse.md 和 api.md 檔案');
      } finally {
        setIsLoadingData(false);
      }
    };

    initializeData();
  }, []);

  // 自動更新股票資料 - 只在首次進入app時執行一次
  useEffect(() => {
    if (!isLoadingData && Object.keys(userHoldings).length > 0 && !isAutoUpdating) {
      // 檢查是否已經在這個會話中執行過自動更新
      const hasAutoUpdatedThisSession = sessionStorage.getItem('hasAutoUpdatedThisSession');

      if (!hasAutoUpdatedThisSession) {
        console.log('🔍 首次進入app，開始檢查 warehouse.md 持股內容...');
        console.log('📊 持股清單:', Object.keys(userHoldings));

        // 只在首次進入時執行完整的股票資料更新
        console.log('🚀 執行完整的股票資料更新（從 Yahoo 股市爬取最新資訊）...');
        const timer = setTimeout(() => {
          autoUpdateStockData();
          // 標記已執行過自動更新
          sessionStorage.setItem('hasAutoUpdatedThisSession', 'true');
        }, 1500);

        return () => clearTimeout(timer);
      } else {
        console.log('📋 本次會話已執行過自動更新，跳過重複更新');
      }
    }
  }, [isLoadingData, userHoldings]);

  const handleHoldingSharesChange = async (symbol: StockSymbol, shares: number) => {
    // 更新本地狀態
    const updatedHoldings = { ...userHoldings, [symbol]: Math.max(0, shares) };
    setUserHoldings(updatedHoldings);

    // 自動更新 warehouse.md 文件
    try {
      console.log(`📊 修改股票 ${symbol} 股數為 ${shares}，自動更新 warehouse.md...`);

      // 生成更新後的 warehouse.md 內容
      const updatedWarehouseContent = await autoUpdateWarehouseContent(updatedHoldings);

      // 如果自動更新服務可用，直接更新文件
      if (autoUpdateSupported) {
        const updateResult = await WarehouseApiService.performAutoUpdate(updatedWarehouseContent);

        if (updateResult.success) {
          // 不顯示通知，避免過於頻繁
          console.log(`✅ 已更新股票 ${symbol} 股數並自動更新 warehouse.md`);
        } else {
          console.warn(`⚠️ 股票股數已更新，但 warehouse.md 更新失敗: ${updateResult.message}`);
        }
      }

    } catch (error) {
      console.error('修改股數時更新 warehouse.md 失敗:', error);
    }
  };

  const handleAddStockToHoldings = async (symbol: StockSymbol, shares: number) => {
    const trimmedSymbol = symbol.trim().toUpperCase();
    if (!trimmedSymbol) return;

    // 更新本地狀態
    const updatedHoldings = {
      ...userHoldings,
      [trimmedSymbol]: (userHoldings[trimmedSymbol] || 0) + Math.max(0, shares)
    };

    setUserHoldings(updatedHoldings);

    // 如果是新股票，添加到股票映射中
    let updatedStocksMap = { ...currentAllStocksMap };
    if (!currentAllStocksMap[trimmedSymbol] && !INITIAL_ALL_STOCKS_MAP[trimmedSymbol]) {
      updatedStocksMap = {
        ...updatedStocksMap,
        [trimmedSymbol]: {
          name: `自訂 (${trimmedSymbol})`,
          category: '未知分類',
          currentPrice: 0,
        }
      };
      setCurrentAllStocksMap(updatedStocksMap);
    }

    // 自動更新 warehouse.md 文件
    try {
      console.log(`📝 新增股票 ${trimmedSymbol}，自動更新 warehouse.md...`);

      // 生成更新後的 warehouse.md 內容
      const updatedWarehouseContent = await autoUpdateWarehouseContent(updatedHoldings);

      // 如果自動更新服務可用，直接更新文件
      if (autoUpdateSupported) {
        const updateResult = await WarehouseApiService.performAutoUpdate(updatedWarehouseContent);

        if (updateResult.success) {
          setNotification({
            show: true,
            message: `✅ 已新增股票 ${trimmedSymbol} (${shares}股) 並自動更新 warehouse.md`,
            type: 'success'
          });
        } else {
          setNotification({
            show: true,
            message: `⚠️ 股票已新增到卡片，但 warehouse.md 更新失敗: ${updateResult.message}`,
            type: 'error'
          });
        }
      } else {
        setNotification({
          show: true,
          message: `✅ 已新增股票 ${trimmedSymbol} (${shares}股)，但自動更新服務未運行`,
          type: 'info'
        });
      }

      // 3秒後自動隱藏通知
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);

    } catch (error) {
      console.error('新增股票時更新 warehouse.md 失敗:', error);
      setNotification({
        show: true,
        message: `✅ 股票已新增到卡片，但 warehouse.md 更新失敗`,
        type: 'error'
      });

      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
    }
  };
  
  const handleRemoveStockFromHoldings = async (symbol: StockSymbol) => {
    // 更新本地狀態
    const updatedHoldings = { ...userHoldings };
    delete updatedHoldings[symbol];
    setUserHoldings(updatedHoldings);

    // 自動更新 warehouse.md 文件
    try {
      console.log(`🗑️ 移除股票 ${symbol}，自動更新 warehouse.md...`);

      // 生成更新後的 warehouse.md 內容
      const updatedWarehouseContent = await autoUpdateWarehouseContent(updatedHoldings);

      // 如果自動更新服務可用，直接更新文件
      if (autoUpdateSupported) {
        const updateResult = await WarehouseApiService.performAutoUpdate(updatedWarehouseContent);

        if (updateResult.success) {
          setNotification({
            show: true,
            message: `✅ 已移除股票 ${symbol} 並自動更新 warehouse.md`,
            type: 'success'
          });
        } else {
          setNotification({
            show: true,
            message: `⚠️ 股票已從卡片移除，但 warehouse.md 更新失敗: ${updateResult.message}`,
            type: 'error'
          });
        }
      } else {
        setNotification({
          show: true,
          message: `✅ 已移除股票 ${symbol}，但自動更新服務未運行`,
          type: 'info'
        });
      }

      // 3秒後自動隱藏通知
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);

    } catch (error) {
      console.error('移除股票時更新 warehouse.md 失敗:', error);
      setNotification({
        show: true,
        message: `✅ 股票已從卡片移除，但 warehouse.md 更新失敗`,
        type: 'error'
      });

      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
    }
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
  const handleWarehouseUpdated = async (newContent: string) => {
    try {
      // 解析新的warehouse內容並更新持股資料
      const lines = newContent.split('\n').filter(line => line.trim());
      const updatedHoldings: UserHoldings = {};
      const updatedStocksMap: { [key: string]: StockDetails } = { ...currentAllStocksMap };

      for (const line of lines) {
        const parts = line.trim().split(/\t/);
        if (parts.length >= 2) {
          const symbol = parts[0] as StockSymbol;
          const shares = parseInt(parts[1], 10);

          if (!isNaN(shares) && shares > 0) {
            updatedHoldings[symbol] = shares;

            // 更新股票詳細信息
            updatedStocksMap[symbol] = {
              name: parts[2] || symbol,
              category: 'TW Stock',
              currentPrice: parts[3] ? parseFloat(parts[3]) : 0
            };
          }
        }
      }

      // 更新狀態
      setUserHoldings(updatedHoldings);
      setCurrentAllStocksMap(updatedStocksMap);

      // 顯示通知
      setNotification({
        show: true,
        message: '✅ 股票資料已完全同步！持股卡片、warehouse.md檔案已全部更新',
        type: 'success'
      });

      // 5秒後自動隱藏通知
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 5000);

    } catch (error) {
      console.error('處理warehouse更新失敗:', error);
      setNotification({
        show: true,
        message: '⚠️ warehouse內容更新失敗，但股票資料已更新到卡片',
        type: 'error'
      });

      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
    }
  };

  // 新增：自動更新股票資料
  const autoUpdateStockData = async () => {
    if (Object.keys(userHoldings).length === 0) {
      console.log('沒有持股資料，跳過自動更新');
      return;
    }

    console.log('開始自動更新股票資料...');
    setIsAutoUpdating(true);

    try {
      // 獲取股票代號
      const symbols = extractSymbolsFromHoldings(userHoldings);
      console.log('需要更新的股票代號:', symbols);

      if (symbols.length > 0) {
        // 爬取股票資訊
        console.log('正在爬取股票資訊...');
        const stockInfos = await StockCrawlerService.fetchMultipleStocks(symbols);
        console.log('爬取結果:', stockInfos);

        // 完全更新股票資料到 currentAllStocksMap（不保留舊資料）
        const updatedStocksMap = { ...currentAllStocksMap };

        stockInfos.forEach(stock => {
          console.log(`🔄 更新 ${stock.symbol} 的最新資料: ${stock.name} - $${stock.currentPrice}`);
          updatedStocksMap[stock.symbol] = {
            name: stock.name,
            category: 'TW Stock', // 預設分類
            currentPrice: stock.currentPrice
          };
        });

        setCurrentAllStocksMap(updatedStocksMap);

        // 生成更新後的 warehouse.md 內容
        console.log('生成更新後的 warehouse.md 內容...');
        const updatedWarehouseContent = await autoUpdateWarehouseContent(userHoldings);

        // 嘗試自動更新 warehouse.md 檔案
        if (autoUpdateSupported) {
          console.log('使用自動更新服務更新 warehouse.md...');
          const updateResult = await WarehouseApiService.performAutoUpdate(updatedWarehouseContent);

          if (updateResult.success) {
            // 自動更新成功
            setNotification({
              show: true,
              message: `🚀 自動更新完成！已更新 ${stockInfos.length} 檔股票資料並自動更新 warehouse.md`,
              type: 'success'
            });

            // 不再自動重新載入頁面，避免無限循環
            console.log('✅ 自動更新完成，warehouse.md 已更新');
          } else {
            // 自動更新失敗，回退到手動方式
            console.warn('自動更新失敗，回退到手動方式:', updateResult.message);
            setWarehouseManager({
              show: true,
              content: updatedWarehouseContent
            });

            setNotification({
              show: true,
              message: `⚠️ ${updateResult.message}，請手動更新 warehouse.md`,
              type: 'error'
            });
          }
        } else {
          // 使用手動方式
          setWarehouseManager({
            show: true,
            content: updatedWarehouseContent
          });

          setNotification({
            show: true,
            message: `🚀 自動更新完成！已更新 ${stockInfos.length} 檔股票資料，請手動更新 warehouse.md 檔案`,
            type: 'success'
          });
        }

        // 10秒後自動隱藏通知
        setTimeout(() => {
          setNotification(prev => ({ ...prev, show: false }));
        }, 10000);
      }
    } catch (error) {
      console.error('自動更新股票資料失敗:', error);

      // 提供更詳細的錯誤信息
      let errorMessage = '自動更新失敗，請稍後手動更新';
      if (error instanceof Error) {
        errorMessage = `自動更新失敗: ${error.message}`;
        console.error('詳細錯誤:', error.stack);
      }

      setNotification({
        show: true,
        message: errorMessage,
        type: 'error'
      });

      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 5000); // 延長顯示時間以便用戶看到詳細錯誤
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

        {/* 新增：AI建議自動排程管理器 */}
        <SchedulerManager />

        {/* 新增：Google Docs 同步 */}
        <GoogleSheetsSync />

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

      {/* 新增：warehouse 文件管理器 */}
      <WarehouseFileManager
        show={warehouseManager.show}
        warehouseContent={warehouseManager.content}
        onClose={() => setWarehouseManager({ show: false, content: '' })}
      />
    </div>
  );
};

export default App;
