import { InvestmentAdvice, UserHoldings, StockDetails, StockSymbol } from '../types';
import { loadAIModelsFromConfig, loadDetailedHoldingsFromWarehouse, AIModelConfig } from './dataService';
import { createAIService } from './aiService';
import { AdviceRecordService } from './adviceRecordService';
import { StockCrawlerService, extractSymbolsFromHoldings } from './stockCrawlerService';
import { INITIAL_ALL_STOCKS_MAP } from '../constants';

/**
 * 多AI模型建議生成服務
 */
export class MultiAIAdviceService {
  // 投資金額範圍：1000-20000 NTD，由AI模型根據市場趨勢判斷
  private static readonly MIN_INVESTMENT = 1000;
  private static readonly MAX_INVESTMENT = 20000;

  /**
   * 載入最新的持股資料和股票資訊
   */
  private static async loadLatestData(): Promise<{
    userHoldings: UserHoldings;
    allStocksMap: Record<StockSymbol, Partial<Omit<StockDetails, 'symbol'>>>;
  }> {
    try {
      // 載入詳細持股資料
      const detailedHoldings = await loadDetailedHoldingsFromWarehouse();
      const userHoldings: UserHoldings = {};
      let allStocksMap: Record<StockSymbol, Partial<Omit<StockDetails, 'symbol'>>> = { ...INITIAL_ALL_STOCKS_MAP };

      // 提取持股數量和股票資訊
      detailedHoldings.forEach(holding => {
        userHoldings[holding.symbol] = holding.shares;
        allStocksMap[holding.symbol] = {
          name: holding.name || holding.symbol,
          category: 'TW Stock',
          currentPrice: holding.currentPrice || 0
        };
      });

      // 如果有持股，嘗試更新最新股價
      const symbols = extractSymbolsFromHoldings(userHoldings);
      if (symbols.length > 0) {
        try {
          console.log('🔄 更新最新股價資訊...');
          const stockInfos = await StockCrawlerService.fetchMultipleStocks(symbols);
          
          stockInfos.forEach(stock => {
            allStocksMap[stock.symbol] = {
              name: stock.name,
              category: 'TW Stock',
              currentPrice: stock.currentPrice
            };
          });
          
          console.log(`✅ 已更新 ${stockInfos.length} 檔股票的最新價格`);
        } catch (error) {
          console.warn('更新股價失敗，使用現有價格:', error);
        }
      }

      return { userHoldings, allStocksMap };
    } catch (error) {
      console.error('載入持股資料失敗:', error);
      return { userHoldings: {}, allStocksMap: INITIAL_ALL_STOCKS_MAP };
    }
  }

  /**
   * 使用單一AI模型生成建議
   */
  private static async generateAdviceWithModel(
    model: AIModelConfig,
    userHoldings: UserHoldings,
    allStocksMap: Record<StockSymbol, Partial<Omit<StockDetails, 'symbol'>>>,
    baseInvestment: number = 10000 // 基準投資金額，AI可以調整
  ): Promise<InvestmentAdvice | null> {
    try {
      console.log(`🤖 使用 ${model.name} 生成投資建議...`);
      
      const activeHoldingSymbols = Object.keys(userHoldings)
        .filter(symbol => userHoldings[symbol] > 0) as StockSymbol[];

      // 確保所有持股都在股票映射中
      const mapForAI = { ...allStocksMap };
      Object.keys(userHoldings).forEach(symbol => {
        if (!mapForAI[symbol]) {
          mapForAI[symbol] = {
            name: `用戶新增 (${symbol})`,
            category: 'TW Stock',
            currentPrice: 0,
          };
        }
      });

      const aiService = createAIService(model);

      // 讓AI根據市場趨勢決定投資金額 (1000-20000 NTD)
      const advice = await aiService.generateInvestmentAdvice(
        baseInvestment,
        activeHoldingSymbols,
        userHoldings,
        mapForAI
      );

      // 確保投資金額在合理範圍內
      if (advice && advice.decidedOptimalInvestmentNTD) {
        advice.decidedOptimalInvestmentNTD = Math.max(
          this.MIN_INVESTMENT,
          Math.min(this.MAX_INVESTMENT, advice.decidedOptimalInvestmentNTD)
        );
      }

      console.log(`✅ ${model.name} 建議生成完成`);
      return advice;
    } catch (error) {
      console.error(`❌ ${model.name} 建議生成失敗:`, error);
      return null;
    }
  }

  /**
   * 生成所有AI模型的建議並記錄
   */
  static async generateAndRecordAllAdvice(): Promise<{
    success: boolean;
    results: Array<{ modelName: string; success: boolean; error?: string }>;
  }> {
    console.log('🚀 開始生成多AI模型投資建議...');
    
    try {
      // 載入AI模型配置
      const models = await loadAIModelsFromConfig();
      if (models.length === 0) {
        throw new Error('沒有找到可用的AI模型配置');
      }

      console.log(`📋 找到 ${models.length} 個AI模型: ${models.map(m => m.name).join(', ')}`);

      // 載入最新資料
      const { userHoldings, allStocksMap } = await this.loadLatestData();
      console.log(`📊 載入持股資料: ${Object.keys(userHoldings).length} 檔股票`);

      const results: Array<{ modelName: string; success: boolean; error?: string }> = [];
      let successCount = 0;

      // 依序處理每個AI模型
      for (const model of models) {
        try {
          // 生成建議 (讓AI自行決定投資金額)
          const advice = await this.generateAdviceWithModel(
            model,
            userHoldings,
            allStocksMap
          );

          if (advice) {
            // 記錄建議
            const recordSuccess = await AdviceRecordService.recordAdvice(model.name, advice);
            
            if (recordSuccess) {
              results.push({ modelName: model.name, success: true });
              successCount++;
            } else {
              results.push({ 
                modelName: model.name, 
                success: false, 
                error: '記錄建議失敗' 
              });
            }
          } else {
            results.push({ 
              modelName: model.name, 
              success: false, 
              error: '建議生成失敗' 
            });
          }

          // 在模型之間添加延遲，避免API限制
          if (models.indexOf(model) < models.length - 1) {
            console.log('⏳ 等待 2 秒後處理下一個模型...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (error) {
          console.error(`處理 ${model.name} 時發生錯誤:`, error);
          results.push({ 
            modelName: model.name, 
            success: false, 
            error: error instanceof Error ? error.message : '未知錯誤' 
          });
        }
      }

      // 清理舊記錄
      try {
        await AdviceRecordService.cleanupOldRecords();
      } catch (error) {
        console.warn('清理舊記錄失敗:', error);
      }

      const overallSuccess = successCount > 0;
      console.log(`🎯 多AI建議生成完成: ${successCount}/${models.length} 成功`);

      return {
        success: overallSuccess,
        results
      };

    } catch (error) {
      console.error('多AI建議生成過程發生錯誤:', error);
      return {
        success: false,
        results: [{ 
          modelName: 'System', 
          success: false, 
          error: error instanceof Error ? error.message : '系統錯誤' 
        }]
      };
    }
  }

  /**
   * 測試單一AI模型
   */
  static async testSingleModel(modelName: string): Promise<boolean> {
    try {
      const models = await loadAIModelsFromConfig();
      const model = models.find(m => m.name === modelName);
      
      if (!model) {
        console.error(`找不到模型: ${modelName}`);
        return false;
      }

      const { userHoldings, allStocksMap } = await this.loadLatestData();
      const advice = await this.generateAdviceWithModel(
        model,
        userHoldings,
        allStocksMap
      );

      if (advice) {
        const success = await AdviceRecordService.recordAdvice(model.name, advice);
        console.log(`${modelName} 測試${success ? '成功' : '失敗'}`);
        return success;
      }

      return false;
    } catch (error) {
      console.error(`測試 ${modelName} 失敗:`, error);
      return false;
    }
  }
}
