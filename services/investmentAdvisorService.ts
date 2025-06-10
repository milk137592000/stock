import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { InvestmentAdvice, RecommendedStock, StockSymbol, UserHoldings, StockDetails, GeminiApiResponse, GeminiBudgetSummary, AIModelConfig } from '../types';
import { MIN_INVESTMENT_AMOUNT, AI_MODELS, AIModelType } from '../constants'; // MAX_INVESTMENT_AMOUNT is used in App.tsx for validation before call

// Helper to get stock details, ensuring it always returns a valid structure from the provided map.
const getStockDetailsSafe = (symbol: StockSymbol, allStocksData: Record<StockSymbol, Partial<Omit<StockDetails, 'symbol'>>>): StockDetails => {
  const details = allStocksData[symbol];
  // Ensure essential fields (name, category) are present, fallback if not.
  const name = details?.name || `未知股票 (${symbol})`;
  const category = details?.category || '未知分類';
  const currentPrice = details?.currentPrice || 0;

  // If category is not one of the predefined, cast to '未知分類'
  const validCategories: StockDetails['category'][] = ['TW ETF', 'TW Stock', 'US Stock', 'Bond ETF', '未知分類'];
  const validatedCategory = validCategories.includes(category as StockDetails['category']) ? category as StockDetails['category'] : '未知分類';

  return {
    symbol,
    name,
    category: validatedCategory,
    currentPrice
  };
};

const constructGeminiPrompt = (
  userMaxWillingnessToInvest: number,
  userPortfolioSymbols: StockSymbol[], // Actively held symbols
  userHoldings: UserHoldings,
  allStocksData: Record<StockSymbol, Partial<Omit<StockDetails, 'symbol'>>> // The comprehensive map for context
): string => {
  const holdingsString = JSON.stringify(
    userPortfolioSymbols.map(symbol => {
      const stockInfo = allStocksData[symbol] || {}; // Use data from the passed map
      return {
        symbol,
        name: stockInfo.name || symbol,
        sharesHeld: userHoldings[symbol] || 0,
        currentPrice: stockInfo.currentPrice || 0, // This is a snapshot price
        category: stockInfo.category || "Unknown"
      };
    }), null, 2
  );

  const allKnownStocksForContext = JSON.stringify(
    Object.entries(allStocksData).map(([symbol, details]) => ({ // Iterate the passed map
      symbol,
      name: details.name || symbol,
      currentPrice: details.currentPrice || 0, // This is a snapshot price
      category: details.category || "Unknown"
    })), null, 2
  );

  return `
You are a professional Taiwanese stock market investment analyst.
Your task is to provide investment advice for a user with a long-term holding strategy, but who is open to buying and selling shares monthly.

User's Monthly Investment Capacity Range: ${MIN_INVESTMENT_AMOUNT} - ${userMaxWillingnessToInvest} NTD.

User's Core Portfolio (stocks they are primarily interested in managing and currently hold shares in):
${holdingsString}

Current Market Data:
${allKnownStocksForContext}
Please note: The 'currentPrice' values provided in the 'Current Market Data' are snapshots for calculation purposes and may not reflect real-time market prices. Use your general knowledge for overall market outlook, but you MUST use these provided prices for any buy/sell share calculations and monetary value estimations. If a category is "Unknown" or price is 0 (especially for user-added stocks or specific ETFs provided as 0), acknowledge this limitation in your reasoning if relevant, or use general knowledge if appropriate, but prioritize provided data for calculations. All monetary values should be in NTD.

Instructions:
1.  Analyze the current market conditions for Taiwan.
2.  Provide a "marketOutlook" string in Traditional Chinese (正體中文).
3.  Decide the "decidedOptimalInvestmentNTD": This is the optimal total NTD amount you recommend the user invest this month. This amount MUST be within the user's capacity range (${MIN_INVESTMENT_AMOUNT} - ${userMaxWillingnessToInvest} NTD). If the user's capacity is too low for meaningful actions, you can set this to 0.
4.  Based on YOUR "decidedOptimalInvestmentNTD", recommend actions for the user's core portfolio ("managedRecommendations"). Actions can be 'BUY', 'SELL', or 'HOLD'.
    *   For 'BUY' or 'SELL', specify the "symbol" and the positive number of "shares" to transact.
    *   For 'HOLD', "shares" should be 0.
    *   Provide concise "reasoning" for each recommendation.
    *   Ensure SELL recommendations do not exceed current holdings (as listed in User's Core Portfolio).
5.  Suggest up to 3 "newStockSuggestions" (from the Taiwan market, ideally from the provided Market Data list but you can suggest others if strongly justified, even if they are not in the user's current holdings). These should always be 'BUY' actions.
    *   Specify "symbol", positive number of "shares" to buy, and "reasoning".
    *   These new suggestions should also fit the long-term strategy and be funded from your "decidedOptimalInvestmentNTD".
    *   Do not suggest a stock that is already in "User's Core Portfolio" as a new suggestion.
6.  Allocate your "decidedOptimalInvestmentNTD" as effectively as possible. The goal is for (Total Spent on Buys - Total Gained from Sells) to be close to your "decidedOptimalInvestmentNTD". All share counts must be whole numbers.
7.  Provide a "budgetSummary" detailing the allocation:
    *   "userProvidedMonthlyCapacityNTD": ${userMaxWillingnessToInvest} (This is the max of the user's stated range)
    *   "decidedOptimalInvestmentNTD": The optimal investment amount you decided for this month (must be the same as point 3).
    *   "totalSpentOnBuysNTD": Calculated total cost of all BUY shares (from both managed and new).
    *   "totalGainedFromSellsNTD": Calculated total proceeds from all SELL shares (from managed).
    *   "netInvestmentNTD": (totalSpentOnBuysNTD - totalGainedFromSellsNTD). This should ideally be close to "decidedOptimalInvestmentNTD".
    *   "remainingUnallocatedNTD": (decidedOptimalInvestmentNTD - netInvestmentNTD). Aim for this to be as close to 0 as possible.
8.  All "reasoning" fields (for both managedRecommendations and newStockSuggestions) MUST be written in Traditional Chinese (正體中文).
9.  The "marketOutlook" field MUST be written in Traditional Chinese (正體中文).

Strictly return your response in the following JSON format. Do not include any text before or after the JSON block:
\`\`\`json
{
  "marketOutlook": "String: Your analysis of the current market outlook for Taiwan, in Traditional Chinese.",
  "managedRecommendations": [
    {
      "symbol": "String: Stock symbol (e.g., '006208')",
      "action": "String: 'BUY', 'SELL', or 'HOLD'",
      "shares": "Number: Number of shares to buy or sell. 0 for HOLD.",
      "reasoning": "String: Brief reasoning in Traditional Chinese."
    }
  ],
  "newStockSuggestions": [
    {
      "symbol": "String: Stock symbol (e.g., '2330')",
      "shares": "Number: Number of shares to buy.",
      "reasoning": "String: Brief reasoning in Traditional Chinese."
    }
  ],
  "budgetSummary": {
    "userProvidedMonthlyCapacityNTD": ${userMaxWillingnessToInvest},
    "decidedOptimalInvestmentNTD": "Number: Your decided optimal total investment for the month",
    "totalSpentOnBuysNTD": "Number",
    "totalGainedFromSellsNTD": "Number",
    "netInvestmentNTD": "Number",
    "remainingUnallocatedNTD": "Number"
  }
}
\`\`\`
Ensure all stock symbols provided in your response are valid symbols ideally present in the 'Current Market Data' list. If you suggest a symbol not in 'Current Market Data', ensure it is a valid publicly traded stock. Calculate monetary values based on the prices in 'Current Market Data' if available; otherwise, you may need to state if price is assumed or unknown for user-added stocks. All share counts must be integers.
`;
};

export const getInvestmentAdvice = async (
  userMaxMonthlyInvestment: number,
  userPortfolioSymbols: StockSymbol[],
  userHoldings: UserHoldings,
  allStocksData: Record<StockSymbol, Partial<Omit<StockDetails, 'symbol'>>>,
  selectedModel: AIModelType = 'GEMINI'
): Promise<InvestmentAdvice> => {
  const modelConfig = AI_MODELS[selectedModel];

  if (!modelConfig) {
    throw new Error("無效的 AI 模型選擇");
  }

  const prompt = constructGeminiPrompt(userMaxMonthlyInvestment, userPortfolioSymbols, userHoldings, allStocksData);
  let geminiResponse: GeminiApiResponse;

  try {
    switch (selectedModel) {
      case 'GEMINI': {
        const ai = new GoogleGenAI({ apiKey: modelConfig.apiKey });
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: modelConfig.model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
          }
        });

        let responseText = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = responseText.match(fenceRegex);
        if (match && match[2]) {
          responseText = match[2].trim();
        }
        geminiResponse = JSON.parse(responseText) as GeminiApiResponse;
        break;
      }
      case 'DEEPSEEK':
      case 'MISTRAL': {
        const response = await fetch(`${modelConfig.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${modelConfig.apiKey}`,
            'HTTP-Referer': 'https://github.com/your-repo',
            'X-Title': 'Investment Advisor'
          },
          body: JSON.stringify({
            model: modelConfig.model,
            messages: [
              {
                role: "system",
                content: "你是一個專業的台灣股市投資分析師，請以 JSON 格式回應，確保回應格式完全符合要求。"
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 4000,
            response_format: { type: "json_object" }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error('API Error:', errorData);
          throw new Error(`API 請求失敗: ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
        }

        const data = await response.json();
        if (!data.choices?.[0]?.message?.content) {
          throw new Error('API 回應格式不正確');
        }

        try {
          geminiResponse = JSON.parse(data.choices[0].message.content) as GeminiApiResponse;
        } catch (parseError) {
          console.error('Parse Error:', data.choices[0].message.content);
          throw new Error('無法解析 AI 回應');
        }
        break;
      }
      default:
        throw new Error("不支援的 AI 模型");
    }

    // Validate budgetSummary structure and decidedOptimalInvestmentNTD
    if (!geminiResponse.budgetSummary || typeof geminiResponse.budgetSummary.decidedOptimalInvestmentNTD !== 'number') {
      console.warn("AI response missing or invalid budgetSummary.decidedOptimalInvestmentNTD. Defaulting.");
      geminiResponse.budgetSummary = {
        ...(geminiResponse.budgetSummary || {}), // Keep other fields if they exist
        decidedOptimalInvestmentNTD: Math.min(MIN_INVESTMENT_AMOUNT, userMaxMonthlyInvestment), // A safe default
        userProvidedMonthlyCapacityNTD: userMaxMonthlyInvestment,
        totalSpentOnBuysNTD: 0,
        totalGainedFromSellsNTD: 0,
        netInvestmentNTD: 0,
        remainingUnallocatedNTD: 0,
      } as GeminiBudgetSummary;
    }

    if (geminiResponse.budgetSummary.decidedOptimalInvestmentNTD < MIN_INVESTMENT_AMOUNT && userMaxMonthlyInvestment >= MIN_INVESTMENT_AMOUNT) {
      if (geminiResponse.budgetSummary.decidedOptimalInvestmentNTD !== 0) {
        // Potentially clamp, but AI might specifically want a low/zero investment.
        // Current prompt asks AI to stay within range or 0 if capacity is too low.
      }
    }
    if (geminiResponse.budgetSummary.decidedOptimalInvestmentNTD > userMaxMonthlyInvestment) {
      console.warn(`AI decided optimal investment ${geminiResponse.budgetSummary.decidedOptimalInvestmentNTD} exceeds user's max ${userMaxMonthlyInvestment}. Clamping.`);
      geminiResponse.budgetSummary.decidedOptimalInvestmentNTD = userMaxMonthlyInvestment;
    }


  } catch (error) {
    console.error(`Error calling ${modelConfig.name} API:`, error);
    if (error instanceof Error) {
      if (error.message.includes("API key not valid")) {
        throw new Error(`${modelConfig.name} API 金鑰無效。請檢查您的 API Key 設定。`);
      }
      throw new Error(`無法從 ${modelConfig.name} 獲取投資建議：${error.message}`);
    }
    throw new Error(`無法從 ${modelConfig.name} 獲取投資建議，請稍後再試。可能原因：網路連線、AI服務暫時中斷或回應格式錯誤。`);
  }

  const existingHoldingsRecommendations: RecommendedStock[] = [];
  const newSuggestions: RecommendedStock[] = [];

  if (geminiResponse.managedRecommendations) {
    for (const rec of geminiResponse.managedRecommendations) {
      if (!rec.symbol) continue;
      const stockDetails = getStockDetailsSafe(rec.symbol, allStocksData);

      let sharesToTransact = rec.shares || 0;
      if (rec.action === 'SELL' && (userHoldings[rec.symbol] || 0) < sharesToTransact) {
        console.warn(`AI recommended selling ${sharesToTransact} of ${rec.symbol}, but user only holds ${userHoldings[rec.symbol] || 0}. Adjusting to sell available amount.`);
        sharesToTransact = userHoldings[rec.symbol] || 0;
      }

      const allocatedAmount = stockDetails.currentPrice > 0 ? sharesToTransact * stockDetails.currentPrice : 0;

      existingHoldingsRecommendations.push({
        ...stockDetails,
        action: rec.action || 'HOLD',
        recommendedShares: sharesToTransact,
        allocatedAmount: rec.action === 'HOLD' ? 0 : allocatedAmount,
        reasoning: rec.reasoning || "AI未提供詳細理由。",
        currentHoldingShares: userHoldings[rec.symbol] || 0,
      });
    }
  }

  if (geminiResponse.newStockSuggestions) {
    for (const rec of geminiResponse.newStockSuggestions) {
      if (!rec.symbol || rec.shares <= 0) continue;
      const stockDetails = getStockDetailsSafe(rec.symbol, allStocksData);
      const allocatedAmount = stockDetails.currentPrice > 0 ? rec.shares * stockDetails.currentPrice : 0;

      if (!userPortfolioSymbols.includes(rec.symbol)) {
        newSuggestions.push({
          ...stockDetails,
          action: 'BUY',
          recommendedShares: rec.shares,
          allocatedAmount,
          reasoning: rec.reasoning || "AI未提供詳細理由。",
          currentHoldingShares: userHoldings[rec.symbol] || 0,
        });
      } else {
        console.warn(`AI suggested '${rec.symbol}' as new, but it's already in user's active holdings. Skipping as new suggestion.`);
      }
    }
  }

  const date = new Date();
  const currentMonth = date.getMonth() + 1;
  const decidedOptimalInvestment = typeof geminiResponse.budgetSummary?.decidedOptimalInvestmentNTD === 'number'
    ? geminiResponse.budgetSummary.decidedOptimalInvestmentNTD
    : Math.min(userMaxMonthlyInvestment, MIN_INVESTMENT_AMOUNT);


  return {
    currentMonth,
    userMaxMonthlyInvestment: userMaxMonthlyInvestment,
    decidedOptimalInvestmentNTD: decidedOptimalInvestment,
    existingHoldingsRecommendations,
    newSuggestions,
    marketOutlook: geminiResponse.marketOutlook || "AI未提供市場展望。",
    budgetSummary: geminiResponse.budgetSummary,
  };
};