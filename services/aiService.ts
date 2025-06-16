import { AIModelConfig } from './dataService';
import { 
  InvestmentAdvice, 
  StockSymbol, 
  UserHoldings, 
  StockDetails,
  GeminiApiResponse,
  RecommendedStock 
} from '../types';

/**
 * 統一的 AI 服務介面
 */
export interface AIService {
  generateInvestmentAdvice(
    userMaxMonthlyInvestment: number,
    userPortfolioSymbols: StockSymbol[],
    userHoldings: UserHoldings,
    allStocksData: Record<StockSymbol, Partial<Omit<StockDetails, 'symbol'>>>
  ): Promise<InvestmentAdvice>;
}

/**
 * OpenRouter API 服務 (支援 DeepSeek, Mistral, Gemini, Phi)
 */
export class OpenRouterAIService implements AIService {
  constructor(private config: AIModelConfig) {}

  async generateInvestmentAdvice(
    userMaxMonthlyInvestment: number,
    userPortfolioSymbols: StockSymbol[],
    userHoldings: UserHoldings,
    allStocksData: Record<StockSymbol, Partial<Omit<StockDetails, 'symbol'>>>
  ): Promise<InvestmentAdvice> {
    const prompt = this.constructPrompt(
      userMaxMonthlyInvestment,
      userPortfolioSymbols,
      userHoldings,
      allStocksData
    );

    // 實現重試機制來處理速率限制
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 ${this.config.name} - 嘗試 ${attempt}/${maxRetries}`);

        const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 4000
          })
        });

        if (!response.ok) {
          const errorText = await response.text();

          // 處理速率限制錯誤
          if (response.status === 429) {
            const waitTime = attempt * 5000; // 5秒, 10秒, 15秒
            console.log(`⏳ ${this.config.name} 遇到速率限制，等待 ${waitTime/1000} 秒後重試...`);

            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
          }

          throw new Error(`API 請求失敗: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error('AI 回應內容為空');
        }

        // 解析 JSON 回應
        let geminiResponse: GeminiApiResponse;
        try {
          // 移除可能的 markdown 代碼塊標記
          const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
          geminiResponse = JSON.parse(cleanContent);
        } catch (parseError) {
          console.error('JSON 解析錯誤:', parseError);
          throw new Error('AI 回應格式無效，無法解析建議');
        }

        console.log(`✅ ${this.config.name} 成功生成建議`);
        return this.transformToInvestmentAdvice(
          geminiResponse,
          userMaxMonthlyInvestment,
          userHoldings,
          allStocksData
        );

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('未知錯誤');
        console.error(`❌ ${this.config.name} 嘗試 ${attempt} 失敗:`, lastError.message);

        // 如果不是速率限制錯誤，直接拋出
        if (!lastError.message.includes('429') && !lastError.message.includes('速率限制')) {
          break;
        }

        // 如果是最後一次嘗試，跳出循環
        if (attempt === maxRetries) {
          break;
        }
      }
    }

    // 所有重試都失敗了
    console.error(`❌ ${this.config.name} 所有重試都失敗`);
    if (lastError) {
      throw new Error(`${this.config.name} 服務錯誤: ${lastError.message}`);
    }
    throw new Error(`${this.config.name} 服務發生未知錯誤`);
  }

  private constructPrompt(
    userMaxMonthlyInvestment: number,
    userPortfolioSymbols: StockSymbol[],
    userHoldings: UserHoldings,
    allStocksData: Record<StockSymbol, Partial<Omit<StockDetails, 'symbol'>>>
  ): string {
    const userHoldingsForContext = JSON.stringify(
      Object.entries(userHoldings)
        .filter(([_, shares]) => shares !== undefined && shares > 0)
        .map(([symbol, shares]) => ({ symbol, shares })),
      null, 2
    );

    const allKnownStocksForContext = JSON.stringify(
      Object.entries(allStocksData).map(([symbol, details]) => ({
        symbol,
        name: details.name || symbol,
        currentPrice: details.currentPrice || 0,
        category: details.category || "Unknown"
      })), null, 2
    );

    return `
你是一位專業的台灣股市投資分析師。
你的任務是為採用長期、紀律性、分階段投資策略的用戶提供投資建議。用戶願意每月買賣股票。你的建議必須使用正體中文。

**核心投資理念與選股邏輯:**
1. **長期價值投資**: 專注於具有長期成長潛力的優質股票和ETF
2. **分散風險**: 在不同類別間分散投資（台股ETF、美股ETF、債券ETF等）
3. **定期定額**: 採用紀律性的定期投資策略
4. **5000法則**: 每檔股票的投資金額盡量接近5000元的倍數
5. **水位概念**: 根據市場風險評估調整投資比例

**用戶資訊:**
- 每月最大投資意願: ${userMaxMonthlyInvestment} NTD
- 目前持股: ${userHoldingsForContext}
- 可選股票清單: ${allKnownStocksForContext}

**AI回應指示:**
1. **分析與決策**: 分析當前台灣市場狀況，提供"marketOutlook"（正體中文，包含週期/風險評估和潛在市場轉折時機）
2. **最佳投資金額**: 決定"decidedOptimalInvestmentNTD"，這是你後續建議的關鍵
3. **管理現有持股**: 對每個持股提供'BUY'、'SELL'或'HOLD'建議
4. **新股建議**: 推薦新的投資標的
5. **預算摘要**: 提供詳細的資金配置摘要

請嚴格按照以下JSON格式回應，不要在JSON前後包含任何其他文字:

\`\`\`json
{
  "marketOutlook": "你對當前台灣市場展望的分析，正體中文",
  "managedRecommendations": [
    {
      "symbol": "股票代號",
      "action": "BUY/SELL/HOLD",
      "shares": "買賣股數，HOLD為0",
      "reasoning": "建議理由，正體中文"
    }
  ],
  "newStockSuggestions": [
    {
      "symbol": "新推薦股票代號", 
      "shares": "建議購買股數",
      "reasoning": "推薦理由，正體中文"
    }
  ],
  "budgetSummary": {
    "userProvidedMonthlyCapacityNTD": ${userMaxMonthlyInvestment},
    "decidedOptimalInvestmentNTD": "AI決定的最佳投資金額",
    "totalSpentOnBuysNTD": "購買總金額",
    "totalGainedFromSellsNTD": "賣出總金額", 
    "netInvestmentNTD": "淨投資金額",
    "remainingUnallocatedNTD": "剩餘未配置金額"
  }
}
\`\`\``;
  }

  private transformToInvestmentAdvice(
    geminiResponse: GeminiApiResponse,
    userMaxMonthlyInvestment: number,
    userHoldings: UserHoldings,
    allStocksData: Record<StockSymbol, Partial<Omit<StockDetails, 'symbol'>>>
  ): InvestmentAdvice {
    // 轉換現有持股建議
    const existingHoldingsRecommendations: RecommendedStock[] = 
      geminiResponse.managedRecommendations?.map(rec => {
        const stockDetails = allStocksData[rec.symbol];
        const currentPrice = stockDetails?.currentPrice || 0;
        const allocatedAmount = rec.action === 'HOLD' ? 0 : rec.shares * currentPrice;

        return {
          symbol: rec.symbol,
          name: stockDetails?.name || rec.symbol,
          category: stockDetails?.category || 'TW Stock',
          currentPrice,
          allocatedAmount,
          recommendedShares: rec.shares,
          action: rec.action,
          reasoning: rec.reasoning,
          currentHoldingShares: userHoldings[rec.symbol] || 0
        };
      }) || [];

    // 轉換新股建議
    const newSuggestions: RecommendedStock[] = 
      geminiResponse.newStockSuggestions?.map(rec => {
        const stockDetails = allStocksData[rec.symbol];
        const currentPrice = stockDetails?.currentPrice || 0;
        const allocatedAmount = rec.shares * currentPrice;

        return {
          symbol: rec.symbol,
          name: stockDetails?.name || rec.symbol,
          category: stockDetails?.category || 'TW Stock',
          currentPrice,
          allocatedAmount,
          recommendedShares: rec.shares,
          action: 'BUY',
          reasoning: rec.reasoning,
          currentHoldingShares: 0
        };
      }) || [];

    const date = new Date();
    const currentMonth = date.getMonth() + 1;
    const decidedOptimalInvestment = typeof geminiResponse.budgetSummary?.decidedOptimalInvestmentNTD === 'number' 
                                   ? geminiResponse.budgetSummary.decidedOptimalInvestmentNTD 
                                   : 0;

    return {
      currentMonth,
      userMaxMonthlyInvestment,
      decidedOptimalInvestmentNTD: decidedOptimalInvestment,
      existingHoldingsRecommendations,
      newSuggestions,
      marketOutlook: geminiResponse.marketOutlook || "AI未提供市場展望。",
      budgetSummary: geminiResponse.budgetSummary,
    };
  }
}

/**
 * 建立 AI 服務實例
 */
export const createAIService = (config: AIModelConfig): AIService => {
  return new OpenRouterAIService(config);
};
