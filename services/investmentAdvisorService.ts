
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { InvestmentAdvice, RecommendedStock, StockSymbol, UserHoldings, StockDetails, GeminiApiResponse } from '../types';
import { ALL_STOCKS_MAP, MIN_INVESTMENT_AMOUNT, MAX_INVESTMENT_AMOUNT } from '../constants';

// Helper to get stock details, ensuring it always returns a valid structure.
const getStockDetailsSafe = (symbol: StockSymbol): StockDetails => {
  const details = ALL_STOCKS_MAP[symbol];
  if (!details) {
    console.warn(`Stock details not found for symbol: ${symbol}. Using fallback.`);
    return { symbol, name: `未知股票 (${symbol})`, category: 'TW Stock', currentPrice: 0 };
  }
  return { symbol, ...details };
};

const constructGeminiPrompt = (
  userMaxWillingnessToInvest: number, // This is the max of the user's range (e.g., 20000)
  userPortfolioSymbols: StockSymbol[],
  userHoldings: UserHoldings
): string => {
  const holdingsString = JSON.stringify(
    userPortfolioSymbols.map(symbol => ({
      symbol,
      name: ALL_STOCKS_MAP[symbol]?.name || symbol,
      sharesHeld: userHoldings[symbol] || 0,
      currentPrice: ALL_STOCKS_MAP[symbol]?.currentPrice || 0,
      category: ALL_STOCKS_MAP[symbol]?.category || "Unknown"
    })), null, 2
  );

  const allKnownStocksForContext = JSON.stringify(
    Object.entries(ALL_STOCKS_MAP).map(([symbol, details]) => ({
      symbol,
      name: details.name,
      currentPrice: details.currentPrice,
      category: details.category
    })), null, 2
  );

  return `
You are a professional Taiwanese stock market investment analyst.
Your task is to provide investment advice for a user with a long-term holding strategy, but who is open to buying and selling shares monthly.

User's Monthly Investment Capacity Range: ${MIN_INVESTMENT_AMOUNT} - ${userMaxWillingnessToInvest} NTD.

User's Core Portfolio (stocks they are primarily interested in managing):
${holdingsString}

Current Market Data (use these prices and categories for your calculations; all monetary values should be in NTD):
${allKnownStocksForContext}

Instructions:
1.  Analyze the current market conditions for Taiwan.
2.  Provide a "marketOutlook" string in Traditional Chinese (正體中文).
3.  Decide the "decidedOptimalInvestmentNTD": This is the optimal total NTD amount you recommend the user invest this month. This amount MUST be within the user's capacity range (${MIN_INVESTMENT_AMOUNT} - ${userMaxWillingnessToInvest} NTD).
4.  Based on YOUR "decidedOptimalInvestmentNTD", recommend actions for the user's core portfolio ("managedRecommendations"). Actions can be 'BUY', 'SELL', or 'HOLD'.
    *   For 'BUY' or 'SELL', specify the "symbol" and the positive number of "shares" to transact.
    *   For 'HOLD', "shares" should be 0.
    *   Provide concise "reasoning" for each recommendation.
    *   Ensure SELL recommendations do not exceed current holdings.
5.  Suggest up to 3 "newStockSuggestions" (from the Taiwan market, ideally from the provided Market Data list but you can suggest others if strongly justified). These should always be 'BUY' actions.
    *   Specify "symbol", positive number of "shares" to buy, and "reasoning".
    *   These new suggestions should also fit the long-term strategy and be funded from your "decidedOptimalInvestmentNTD".
6.  Allocate your "decidedOptimalInvestmentNTD" as effectively as possible. The goal is for (Total Spent on Buys - Total Gained from Sells) to be close to your "decidedOptimalInvestmentNTD".
7.  Provide a "budgetSummary" detailing the allocation:
    *   "userProvidedMonthlyCapacityNTD": ${userMaxWillingnessToInvest} (This is the max of the user's stated range)
    *   "decidedOptimalInvestmentNTD": The optimal investment amount you decided for this month (must be the same as point 3).
    *   "totalSpentOnBuysNTD": Calculated total cost of all BUY shares.
    *   "totalGainedFromSellsNTD": Calculated total proceeds from all SELL shares.
    *   "netInvestmentNTD": (totalSpentOnBuysNTD - totalGainedFromSellsNTD). This should ideally be close to "decidedOptimalInvestmentNTD".
    *   "remainingUnallocatedNTD": (decidedOptimalInvestmentNTD - netInvestmentNTD). Aim for this to be as close to 0 as possible. All share counts must be whole numbers.
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
Ensure all stock symbols provided in your response are valid symbols present in the 'Current Market Data' list. Calculate monetary values based on the prices in 'Current Market Data'. All share counts must be integers.
`;
};

export const getInvestmentAdvice = async (
  userMaxMonthlyInvestment: number, // Renamed for clarity, represents user's upper limit
  userPortfolioSymbols: StockSymbol[],
  userHoldings: UserHoldings
): Promise<InvestmentAdvice> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = constructGeminiPrompt(userMaxMonthlyInvestment, userPortfolioSymbols, userHoldings);

  let geminiResponse: GeminiApiResponse;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        // Consider enabling thinking for this complex task, unless low latency is paramount
        // thinkingConfig: { thinkingBudget: 0 } // To disable if needed
      }
    });
    
    let responseText = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = responseText.match(fenceRegex);
    if (match && match[2]) {
      responseText = match[2].trim();
    }
    geminiResponse = JSON.parse(responseText) as GeminiApiResponse;

    // Validate that AI decided optimal investment is within user's range
    if (geminiResponse.budgetSummary && 
        (geminiResponse.budgetSummary.decidedOptimalInvestmentNTD < MIN_INVESTMENT_AMOUNT ||
         geminiResponse.budgetSummary.decidedOptimalInvestmentNTD > userMaxMonthlyInvestment)) {
        console.warn(`AI decided optimal investment ${geminiResponse.budgetSummary.decidedOptimalInvestmentNTD} is outside user's range of ${MIN_INVESTMENT_AMOUNT}-${userMaxMonthlyInvestment}. Clamping it.`);
        geminiResponse.budgetSummary.decidedOptimalInvestmentNTD = Math.max(MIN_INVESTMENT_AMOUNT, Math.min(geminiResponse.budgetSummary.decidedOptimalInvestmentNTD, userMaxMonthlyInvestment));
    }


  } catch (error) {
    console.error("Error calling Gemini API or parsing response:", error);
    throw new Error("無法從AI獲取投資建議，請稍後再試。可能原因：API金鑰問題、網路連線或AI服務暫時中斷。");
  }

  const existingHoldingsRecommendations: RecommendedStock[] = [];
  const newSuggestions: RecommendedStock[] = [];

  for (const rec of geminiResponse.managedRecommendations) {
    const stockDetails = getStockDetailsSafe(rec.symbol);
    if (rec.action === 'SELL' && (userHoldings[rec.symbol] || 0) < rec.shares) {
        console.warn(`AI recommended selling ${rec.shares} of ${rec.symbol}, but user only holds ${userHoldings[rec.symbol] || 0}. Adjusting to sell available amount.`);
        rec.shares = userHoldings[rec.symbol] || 0;
    }
    
    const allocatedAmount = stockDetails.currentPrice > 0 ? rec.shares * stockDetails.currentPrice : 0;

    existingHoldingsRecommendations.push({
      ...stockDetails,
      action: rec.action,
      recommendedShares: rec.shares,
      allocatedAmount: rec.action === 'HOLD' ? 0 : allocatedAmount,
      reasoning: rec.reasoning || "AI未提供詳細理由。",
      currentHoldingShares: userHoldings[rec.symbol] || 0,
    });
  }

  for (const rec of geminiResponse.newStockSuggestions) {
    const stockDetails = getStockDetailsSafe(rec.symbol);
    const allocatedAmount = stockDetails.currentPrice > 0 ? rec.shares * stockDetails.currentPrice : 0;
    
    if (!userPortfolioSymbols.includes(rec.symbol) && rec.shares > 0) {
        newSuggestions.push({
        ...stockDetails,
        action: 'BUY',
        recommendedShares: rec.shares,
        allocatedAmount,
        reasoning: rec.reasoning || "AI未提供詳細理由。",
        currentHoldingShares: userHoldings[rec.symbol] || 0, // This will be 0 or undefined for new suggestions
      });
    } else if (rec.shares <=0) {
        console.warn(`AI suggested new stock ${rec.symbol} with ${rec.shares} shares. Skipping as it's not a BUY.`);
    }
  }
  
  const date = new Date();
  const currentMonth = date.getMonth() + 1;
  const decidedOptimalInvestment = geminiResponse.budgetSummary?.decidedOptimalInvestmentNTD || userMaxMonthlyInvestment; // Fallback if not provided, though it should be.

  return {
    currentMonth,
    userMaxMonthlyInvestment: userMaxMonthlyInvestment, // User's original max input
    decidedOptimalInvestmentNTD: decidedOptimalInvestment, // AI's decided budget
    existingHoldingsRecommendations,
    newSuggestions,
    marketOutlook: geminiResponse.marketOutlook || "AI未提供市場展望。",
    budgetSummary: geminiResponse.budgetSummary,
  };
};
