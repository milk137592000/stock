import { InvestmentAdvice, StockSymbol, UserHoldings, GeminiApiResponse, RecommendedStock } from '../types';
import { ALL_STOCKS_MAP, MIN_INVESTMENT_AMOUNT, MAX_INVESTMENT_AMOUNT } from '../constants';

export type AIModel = 'deepseek' | 'mistral' | 'gemini';

interface AIModelConfig {
    model: string;
    baseUrl: string;
    apiKey: string;
    isGemini?: boolean;
}

const MODEL_CONFIGS: Record<AIModel, AIModelConfig> = {
    deepseek: {
        model: "deepseek/deepseek-r1-0528:free",
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: "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"
    },
    mistral: {
        model: "mistralai/devstral-small:free",
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: "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"
    },
    gemini: {
        model: "gemini-2.0-flash",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/models",
        apiKey: "AIzaSyAnMkrPPgmUSjmyD-2xZ6HRWEmIjQVd4vo",
        isGemini: true
    }
};

const constructPrompt = (
    userMaxWillingnessToInvest: number,
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
    *   "userProvidedMonthlyCapacityNTD": ${userMaxWillingnessToInvest}
    *   "decidedOptimalInvestmentNTD": The optimal investment amount you decided for this month
    *   "totalSpentOnBuysNTD": Calculated total cost of all BUY shares
    *   "totalGainedFromSellsNTD": Calculated total proceeds from all SELL shares
    *   "netInvestmentNTD": (totalSpentOnBuysNTD - totalGainedFromSellsNTD)
    *   "remainingUnallocatedNTD": (decidedOptimalInvestmentNTD - netInvestmentNTD)
8.  All "reasoning" fields MUST be written in Traditional Chinese (正體中文).
9.  The "marketOutlook" field MUST be written in Traditional Chinese (正體中文).

Return your response in the following JSON format:
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
}`;
};

export const getInvestmentAdvice = async (
    userMaxMonthlyInvestment: number,
    userPortfolioSymbols: StockSymbol[],
    userHoldings: UserHoldings,
    selectedModel: AIModel = 'deepseek'
): Promise<InvestmentAdvice> => {
    const config = MODEL_CONFIGS[selectedModel];
    const prompt = constructPrompt(userMaxMonthlyInvestment, userPortfolioSymbols, userHoldings);

    try {
        let response;
        if (config.isGemini) {
            response = await fetch(`${config.baseUrl}/${config.model}:generateContent?key=${config.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ]
                })
            });
        } else {
            response = await fetch(`${config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                    'HTTP-Referer': 'http://localhost:5173',
                    'X-Title': 'Smart Investment Advisor'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    response_format: { type: "json_object" }
                })
            });
        }

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        let responseText;
        if (config.isGemini) {
            responseText = data.candidates[0].content.parts[0].text;
        } else {
            responseText = data.choices[0].message.content;
        }
        const geminiResponse = JSON.parse(responseText) as GeminiApiResponse;

        // Validate that AI decided optimal investment is within user's range
        if (geminiResponse.budgetSummary &&
            (geminiResponse.budgetSummary.decidedOptimalInvestmentNTD < MIN_INVESTMENT_AMOUNT ||
                geminiResponse.budgetSummary.decidedOptimalInvestmentNTD > userMaxMonthlyInvestment)) {
            console.warn(`AI decided optimal investment ${geminiResponse.budgetSummary.decidedOptimalInvestmentNTD} is outside user's range of ${MIN_INVESTMENT_AMOUNT}-${userMaxMonthlyInvestment}. Clamping it.`);
            geminiResponse.budgetSummary.decidedOptimalInvestmentNTD = Math.max(MIN_INVESTMENT_AMOUNT, Math.min(geminiResponse.budgetSummary.decidedOptimalInvestmentNTD, userMaxMonthlyInvestment));
        }

        const existingHoldingsRecommendations = geminiResponse.managedRecommendations.map(rec => {
            const stockDetails = ALL_STOCKS_MAP[rec.symbol];
            const action = rec.action as 'BUY' | 'SELL' | 'HOLD';
            return {
                ...stockDetails,
                symbol: rec.symbol,
                action,
                recommendedShares: rec.shares,
                allocatedAmount: action === 'HOLD' ? 0 : rec.shares * (stockDetails?.currentPrice || 0),
                reasoning: rec.reasoning,
                currentHoldingShares: userHoldings[rec.symbol] || 0,
            } as RecommendedStock;
        });

        const newSuggestions = geminiResponse.newStockSuggestions.map(rec => {
            const stockDetails = ALL_STOCKS_MAP[rec.symbol];
            return {
                ...stockDetails,
                symbol: rec.symbol,
                action: 'BUY' as const,
                recommendedShares: rec.shares,
                allocatedAmount: rec.shares * (stockDetails?.currentPrice || 0),
                reasoning: rec.reasoning,
                currentHoldingShares: userHoldings[rec.symbol] || 0,
            } as RecommendedStock;
        });

        return {
            currentMonth: new Date().getMonth() + 1,
            userMaxMonthlyInvestment,
            decidedOptimalInvestmentNTD: geminiResponse.budgetSummary.decidedOptimalInvestmentNTD,
            existingHoldingsRecommendations,
            newSuggestions,
            marketOutlook: geminiResponse.marketOutlook,
            budgetSummary: geminiResponse.budgetSummary
        };

    } catch (error) {
        console.error("Error calling AI API or parsing response:", error);
        throw new Error("無法從AI獲取投資建議，請稍後再試。可能原因：API金鑰問題、網路連線或AI服務暫時中斷。");
    }
}; 