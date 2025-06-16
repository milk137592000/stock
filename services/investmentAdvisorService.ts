
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { InvestmentAdvice, RecommendedStock, StockSymbol, UserHoldings, StockDetails, GeminiApiResponse, GeminiBudgetSummary } from '../types';
import { MIN_INVESTMENT_AMOUNT } from '../constants'; // MAX_INVESTMENT_AMOUNT is used in App.tsx for validation before call

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
Your task is to provide investment advice for a user employing a long-term, disciplined, staged investment strategy. The user is open to buying and selling shares monthly. Your advice must be in Traditional Chinese (正體中文).

**Core Investment Philosophy & Selection Logic:**

**I. Dynamic Value Stock Screening & Valuation:**
1.  **Identify Value:** Prioritize stocks that appear undervalued. Consider factors like an estimated yield being attractive compared to the market-accepted yield for their sector. Focus on stocks that are potentially "鎖定被低估的標的" (locking in undervalued targets).
2.  **Potential Value Score Assessment (Conceptual):** Evaluate stocks for their "潛在價值積分" (potential value score). Stocks with higher conceptual scores (e.g., 6-7+ points in an ideal scenario) are preferred, indicating reasonable valuation. Be wary of stocks with low scores, as they might risk further decline ("分數過低表示可能進一步下跌"). If a stock appears overvalued or has a poor value profile, avoid it or recommend selling.
3.  **Staged Entry & Dip Buying:** Prioritize consistent, staged investments. If market conditions present a significant dip or a stock appears notably undervalued (based on your general market knowledge and its fundamentals), you may suggest allocating more funds opportunistically. Explain if an action is part of regular staging or an opportunistic buy.

**II. Fundamental & Technical Filters (7大選股濾網):**
Screen for stocks that meet several of the following desirable characteristics:
1.  **連續配息 (Continuous Dividends):** History of consistent dividend payments.
2.  **成交量流動性 (Liquidity):** Sufficient trading volume.
3.  **股價>100元 (Price > 100 NTD):** A soft preference for stocks priced above 100 NTD to potentially avoid highly speculative retail targets (this is not a strict rule but a consideration).
4.  **Growth Trends:** Strong prospects for continuous growth in revenue, operating profit, and free cash flow.
5.  **Financial Health:** Solid financial statements, manageable debt-to-equity ratios. Avoid companies with persistently high debt or declining profits without clear turnaround signs.
6.  **Free Cash Flow:** Positive and ideally growing free cash flow.
7.  **Industry Outlook & Reports (產業報告輔助):** Favor companies in industries with a positive long-term outlook. Your reasoning should reflect an understanding of industry trends and potential risks, aiding in long-term value judgment.

**III. Yield Context & Valuation (殖利率河流圖 Concept):**
When assessing a stock's valuation, consider its current price relative to its historical yield patterns or other valuation metrics. Indicate in your reasoning if a stock appears to be in a "便宜" (cheap), "合理" (reasonable), or "昂貴" (expensive) zone based on this type of contextual analysis.

**IV. Fund Management & Risk Control ("水位計算機規則" - Water Level Calculator Rules Emulation):**
This section simulates a "Water Level" (水位) concept for overall capital allocation and risk management. Water Level is defined as the proportion of invested capital (your 'decidedOptimalInvestmentNTD') relative to the user's total available capital for the month ('userMaxMonthlyInvestment').

1.  **Water Level Tiers & Corresponding Strategy:**
    *   **Low Water Level (AI decides to allocate <50% of user's max capacity, e.g., ${userMaxWillingnessToInvest}):**
        *   **Signal:** Interpret this as a high market oscillation/risk scenario (e.g., "市場震盪機率高達約80%").
        *   **Action:** Explicitly state in \`marketOutlook\` that you are recommending a low allocation due to high perceived market risk.
        *   **Advice:** "建議保留較多現金，等待震盪低點加碼布局" (Recommend holding more cash, waiting for dips to add positions). Focus recommendations on only very high-conviction, deeply undervalued opportunities.
    *   **Middle Water Level (AI decides to allocate 50%-80% of user's max capacity):**
        *   **Signal:** This is a normal holding range.
        *   **Action:** Adjust flexibly based on specific stock opportunities and overall market conditions.
    *   **High Water Level (AI decides to allocate >80% of user's max capacity):**
        *   **Signal:** High equity ratio.
        *   **Action:** This implies a more bullish or opportunity-rich view. Acknowledge that while this maximizes investment, it also concentrates risk.
        *   **Note for User (Contextual):** The user might consider "股票質押借款擴大資金運用" (using stock pledges to expand capital) in such scenarios if they wish to expand capital further, but this is their own decision. Your role is to determine if market conditions support a higher allocation from their stated monthly capacity.
        *   **Risk Management:** If recommending a high water level, ensure the \`marketOutlook\` justifies it and consider if any profit-taking or risk reduction on other holdings is warranted to balance.

2.  **Market Turning Points & Allocation Timing ("震盪倒數日" - Market Turn Countdown Concept):**
    *   In your \`marketOutlook\`, if you perceive the market might be approaching a potential turning point ("轉折時間"), explain how this influences your allocation strategy.
    *   **Low Water + Anticipated Rebound:** If current allocation is low (due to prior caution) AND you signal an imminent positive "震盪倒數日" (market turn/rebound likely), this is a "加碼良機" (good opportunity to add positions). Your \`decidedOptimalInvestmentNTD\` might increase, and BUY recommendations should reflect this.
    *   **High Water + Potential Downturn:** If allocation is high and you anticipate a negative turn, advise "逐步調節持股，減少風險曝露" (gradually adjust holdings to reduce risk exposure). This might involve more SELLs or HOLDs.

3.  **Disciplined Staged Adjustments & "5000法則" for Individual Stock Buys:**
    *   **General Principle:** Advocate for "分批調節" (batched adjustments) for both BUYs and SELLs to maintain discipline and manage risk ("避免因情緒影響而盲目買賣，保持紀律性").
    *   **"5000法則" for Sizing New Buys/Additions:** When recommending a BUY action (for new stocks or adding to existing ones), consider the following guidelines for the calculated investment amount for *that specific stock* (shares * currentPrice from 'Current Market Data'):
        *   If the amount is less than 5000 NTD: Generally, "不建議加碼" (don't recommend adding this small amount for this specific stock unless part of a broader, very small diversification strategy or if the stock price is very low making a small NTD amount still a decent number of shares). You might choose not to recommend this stock if the allocation would be too small to be meaningful or efficient.
        *   If the amount is between 5000 NTD and 10000 NTD: "可視時機進場" (can enter the market at an opportune time). This is a reasonable size for a staged entry.
        *   If the amount is over 10000 NTD: "則強烈建議布局" (strongly recommend deploying capital). This implies higher conviction for this specific stock.
        *   **Application:** Use this to guide the number of "shares" you recommend for individual BUYs, ensuring the investment per stock is meaningful. This helps "控制單檔持股規模，避免過度集中" (control single stock exposure, avoid over-concentration) unless a larger position is well-justified by other principles. The total of all such BUYs (and SELLs) should still respect the overall 'decidedOptimalInvestmentNTD'.

**V. Practical Application & Portfolio Structure:**
1.  **Tiered Holdings & Diversification (三級熟悉度 - Three-Tier Familiarity):**
    *   User's existing holdings are "核心" (core). New suggestions are "衛星" (satellite) or "觀察" (observation).
    *   Aim for a balanced portfolio. Conceptually, each tier might have different "資金上限" (fund limits). When recommending individual stock allocations, especially new buys, apply the "5000法則" to ensure meaningful position sizes without over-concentrating in a single new idea unless exceptionally justified.
2.  **Evaluating Underperforming Stocks:**
    *   If a user's stock has "長期負報酬" (long-term negative returns), critically re-evaluate. "優先檢視選股條件是否偏誤，而非盲目加碼" (Prioritize reviewing selection criteria, rather than blindly adding shares). Do not recommend buying more into a loser without strong new justification. When suggesting exits, "先賣賺得少或虧損股，優化持股結構" (consider selling stocks with small gains or losses first to optimize portfolio structure).
3.  **Target Selection for Additions:**
    *   When suggesting new investments or adding to positions, "配合動態產業清單與ETF清單，選擇低基期且具潛力的標的進行加碼" (favor adding to low-base, high-potential targets, possibly identified from dynamic industry/ETF lists or general market analysis).

**User's Information:**
*   User's Monthly Investment Capacity Range: ${MIN_INVESTMENT_AMOUNT} - ${userMaxWillingnessToInvest} NTD. (Your 'decidedOptimalInvestmentNTD' should be within this range, or 0 if conditions are very unfavorable).
*   User's Core Portfolio (stocks they are primarily interested in managing and currently hold shares in):
    ${holdingsString}
*   Current Market Data (Snapshot for Calculations):
    ${allKnownStocksForContext}
    (Note: 'currentPrice' values are snapshots. Use your general knowledge for market outlook/fundamentals, but use these prices for buy/sell share calculations and monetary estimations. If category is "Unknown" or price is 0, acknowledge this. All monetary values in NTD.)

**Instructions for AI Response:**
1.  **Analyze & Decide:** Analyze current Taiwan market conditions based on ALL principles above. Provide a "marketOutlook" (Traditional Chinese, including cycle/risk assessment using 'Water Level' concept, and potential 'market turn' timing notes).
2.  **Optimal Investment Amount:** Determine "decidedOptimalInvestmentNTD". This is key for your subsequent recommendations.
3.  **Manage Existing Holdings ("managedRecommendations"):**
    *   Actions: 'BUY', 'SELL', or 'HOLD'. 'HOLD' means 0 shares.
    *   Provide "symbol", positive "shares" for BUY/SELL. For BUYs, respect the "5000法則" for sizing.
    *   "reasoning" (Traditional Chinese): Justify based on fundamentals, timing, strategy (staged, opportunistic, risk level, water level). SELLs must not exceed holdings.
4.  **Suggest New Stocks ("newStockSuggestions"):**
    *   Up to 3 new suggestions (primarily Taiwan market, from Market Data or other sound options).
    *   Action is always 'BUY'. Provide "symbol", positive "shares", respecting the "5000法則" for sizing.
    *   "reasoning" (Traditional Chinese): Highlight fundamental strengths, suitability for staged investment, alignment with selection criteria, and how it fits the "5000法則".
    *   Do NOT suggest a stock already in "User's Core Portfolio" as a new suggestion. These are for diversification or new opportunities.
5.  **Budget Allocation:**
    *   Allocate "decidedOptimalInvestmentNTD" effectively. (Total Spent on Buys - Total Gained from Sells) should ideally be close to "decidedOptimalInvestmentNTD".
    *   All share counts must be WHOLE numbers.
6.  **Provide "budgetSummary":**
    *   "userProvidedMonthlyCapacityNTD": ${userMaxWillingnessToInvest}
    *   "decidedOptimalInvestmentNTD": Your decided optimal investment.
    *   "totalSpentOnBuysNTD": Calculated.
    *   "totalGainedFromSellsNTD": Calculated.
    *   "netInvestmentNTD": (totalSpentOnBuysNTD - totalGainedFromSellsNTD).
    *   "remainingUnallocatedNTD": (decidedOptimalInvestmentNTD - netInvestmentNTD). Aim for this to be close to 0.
7.  **Language & Format:** ALL text fields (marketOutlook, reasoning) MUST be in Traditional Chinese (正體中文). Strictly return JSON.

**Example Application Context (e.g., Financial Stocks):**
"以金融股布局為例：透過 動態產業清單 鎖定低基期金融股。用 存股計算機 (conceptually, your share calculation guided by '5000法則') 計算每月可投入金額與股數。當 水位計算機 (your market risk assessment leading to a 'Low Water Level') 顯示水位低於50% (high risk), 搭配震盪倒數日提示 (your market timing notes), 逐步提高持股比例 (if justified despite risk, or hold cash)." This illustrates applying the principles.

Strictly return your response in the following JSON format. Do not include any text before or after the JSON block:
\`\`\`json
{
  "marketOutlook": "String: Your analysis of the current market outlook for Taiwan, in Traditional Chinese, including cycle judgment, risk assessment ('water level' concept based on decidedOptimalInvestmentNTD vs userMaxMonthlyInvestment), and potential 'market turn' timing notes.",
  "managedRecommendations": [
    {
      "symbol": "String: Stock symbol (e.g., '006208')",
      "action": "String: 'BUY', 'SELL', or 'HOLD'",
      "shares": "Number: Number of shares to buy or sell. 0 for HOLD. For BUYs, this should result in an investment amount per stock aligning with the '5000法則'.",
      "reasoning": "String: Brief reasoning in Traditional Chinese, explaining fundamental basis, valuation (cheap/reasonable/expensive), timing/strategy (staged, opportunistic), adherence to selection filters, and 'Water Level' context."
    }
  ],
  "newStockSuggestions": [
    {
      "symbol": "String: Stock symbol (e.g., '2330')",
      "shares": "Number: Number of shares to buy. This should result in an investment amount per stock aligning with the '5000法則'.",
      "reasoning": "String: Brief reasoning in Traditional Chinese, highlighting fundamental strengths, valuation, suitability for staged investment, why it meets selection criteria, and '5000法則' alignment."
    }
  ],
  "budgetSummary": {
    "userProvidedMonthlyCapacityNTD": ${userMaxWillingnessToInvest},
    "decidedOptimalInvestmentNTD": "Number: Your decided optimal total investment for the month based on your overall market/risk assessment ('Water Level' logic).",
    "totalSpentOnBuysNTD": "Number",
    "totalGainedFromSellsNTD": "Number",
    "netInvestmentNTD": "Number",
    "remainingUnallocatedNTD": "Number"
  }
}
\`\`\`
Ensure all stock symbols in your response are valid. Calculate monetary values based on prices in 'Current Market Data'. All share counts must be integers. Double-check your recommendations against all stated investment principles and ensure comprehensive reasoning.
`;
};

export const getInvestmentAdvice = async (
  userMaxMonthlyInvestment: number,
  userPortfolioSymbols: StockSymbol[], // Actively held symbols
  userHoldings: UserHoldings,
  allStocksData: Record<StockSymbol, Partial<Omit<StockDetails, 'symbol'>>> // The comprehensive map
): Promise<InvestmentAdvice> => {
  if (!process.env.API_KEY) { // Check API key availability
    throw new Error("API Key is not configured.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = constructGeminiPrompt(userMaxMonthlyInvestment, userPortfolioSymbols, userHoldings, allStocksData);

  let geminiResponse: GeminiApiResponse;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        // Temperature could be slightly lowered if very precise adherence to complex rules is desired,
        // but the default (often around 0.7-0.9) allows for more nuanced interpretation.
        // temperature: 0.7 
      }
    });
    
    let responseText = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = responseText.match(fenceRegex);
    if (match && match[2]) {
      responseText = match[2].trim();
    }
    geminiResponse = JSON.parse(responseText) as GeminiApiResponse;

    // Validate budgetSummary structure and decidedOptimalInvestmentNTD
    if (!geminiResponse.budgetSummary || typeof geminiResponse.budgetSummary.decidedOptimalInvestmentNTD !== 'number') {
        console.warn("AI response missing or invalid budgetSummary.decidedOptimalInvestmentNTD. Defaulting.");
        
        const originalBudgetSummary = geminiResponse.budgetSummary; // Could be undefined or partially formed

        geminiResponse.budgetSummary = {
            decidedOptimalInvestmentNTD: Math.min(MIN_INVESTMENT_AMOUNT, userMaxMonthlyInvestment), // A safe default
            userProvidedMonthlyCapacityNTD: userMaxMonthlyInvestment,
            totalSpentOnBuysNTD: (originalBudgetSummary && typeof originalBudgetSummary.totalSpentOnBuysNTD === 'number') ? originalBudgetSummary.totalSpentOnBuysNTD : 0,
            totalGainedFromSellsNTD: (originalBudgetSummary && typeof originalBudgetSummary.totalGainedFromSellsNTD === 'number') ? originalBudgetSummary.totalGainedFromSellsNTD : 0,
            netInvestmentNTD: (originalBudgetSummary && typeof originalBudgetSummary.netInvestmentNTD === 'number') ? originalBudgetSummary.netInvestmentNTD : 0,
            remainingUnallocatedNTD: (originalBudgetSummary && typeof originalBudgetSummary.remainingUnallocatedNTD === 'number') ? originalBudgetSummary.remainingUnallocatedNTD : 0,
        };
    }
    
    // Clamp decidedOptimalInvestmentNTD to be within user's specified range [MIN_INVESTMENT_AMOUNT, userMaxMonthlyInvestment]
    // or 0 if AI explicitly decides so and it's valid.
    // The prompt already instructs AI to keep it within range or 0.
    if (geminiResponse.budgetSummary.decidedOptimalInvestmentNTD < 0) {
        console.warn(`AI decided optimal investment ${geminiResponse.budgetSummary.decidedOptimalInvestmentNTD} is negative. Clamping to 0.`);
        geminiResponse.budgetSummary.decidedOptimalInvestmentNTD = 0;
    } else if (geminiResponse.budgetSummary.decidedOptimalInvestmentNTD > userMaxMonthlyInvestment) {
        console.warn(`AI decided optimal investment ${geminiResponse.budgetSummary.decidedOptimalInvestmentNTD} exceeds user's max ${userMaxMonthlyInvestment}. Clamping.`);
        geminiResponse.budgetSummary.decidedOptimalInvestmentNTD = userMaxMonthlyInvestment;
    } else if (geminiResponse.budgetSummary.decidedOptimalInvestmentNTD > 0 && geminiResponse.budgetSummary.decidedOptimalInvestmentNTD < MIN_INVESTMENT_AMOUNT && userMaxMonthlyInvestment >= MIN_INVESTMENT_AMOUNT) {
        // AI suggests a positive amount that's less than the general minimum.
        // The prompt guides AI to use 0 if capacity is too low or conditions unfavorable, or use small amounts if justified by "5000法則".
        console.log(`AI decided optimal investment ${geminiResponse.budgetSummary.decidedOptimalInvestmentNTD} is below typical MIN_INVESTMENT_AMOUNT but positive. AI's discretion is applied as per prompt rules.`);
    }


  } catch (error) {
    console.error("Error calling Gemini API or parsing response:", error);
    if (error instanceof Error && error.message.includes("API key not valid")) {
        throw new Error("API金鑰無效。請檢查您的 API Key 設定。");
    }
     // Check for specific Gemini API error types if available, or more general network errors
    if (error instanceof Error) {
        // More detailed error logging for debugging
        console.error("Gemini API Error Details:", error.name, error.message, (error as any).stack);
        if (error.message.includes("JSON")) { // Broader check for JSON parsing issues
             throw new Error("AI回應的格式無效，無法解析建議。請稍後再試。");
        }
    }
    throw new Error("無法從AI獲取投資建議，請稍後再試。可能原因：網路連線、AI服務暫時中斷或回應格式錯誤。");
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
      if (rec.action !== 'BUY' && rec.action !== 'SELL' && rec.action !== 'HOLD') {
        console.warn(`AI provided invalid action '${rec.action}' for ${rec.symbol}. Defaulting to HOLD.`);
        rec.action = 'HOLD';
      }
      if (rec.action === 'HOLD') sharesToTransact = 0; // Ensure shares are 0 for HOLD
      
      const allocatedAmount = stockDetails.currentPrice > 0 ? sharesToTransact * stockDetails.currentPrice : 0;

      existingHoldingsRecommendations.push({
        ...stockDetails,
        action: rec.action, 
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
      
      if (!userPortfolioSymbols.includes(rec.symbol)) { // Ensure it's truly a new suggestion
          newSuggestions.push({
          ...stockDetails,
          action: 'BUY', 
          recommendedShares: rec.shares,
          allocatedAmount,
          reasoning: rec.reasoning || "AI未提供詳細理由。",
          currentHoldingShares: userHoldings[rec.symbol] || 0, // Should be 0 or undefined for new
        });
      } else {
        console.warn(`AI suggested '${rec.symbol}' as new, but it's already in user's active holdings. Adding to managed recommendations if not already present or updating if action differs.`);
        // Optional: Logic to merge this into existingHoldingsRecommendations if it's a BUY for an existing stock
        // For now, we follow the prompt's strict definition of new suggestions.
      }
    }
  }
  
  const date = new Date();
  const currentMonth = date.getMonth() + 1;
  // Ensure decidedOptimalInvestmentNTD is a number, falling back if necessary after parsing/validation.
  const decidedOptimalInvestment = typeof geminiResponse.budgetSummary?.decidedOptimalInvestmentNTD === 'number' 
                                   ? geminiResponse.budgetSummary.decidedOptimalInvestmentNTD 
                                   : 0; // Default to 0 if still not a number after checks


  return {
    currentMonth,
    userMaxMonthlyInvestment: userMaxMonthlyInvestment,
    decidedOptimalInvestmentNTD: decidedOptimalInvestment,
    existingHoldingsRecommendations,
    newSuggestions,
    marketOutlook: geminiResponse.marketOutlook || "AI未提供市場展望。",
    budgetSummary: geminiResponse.budgetSummary, // budgetSummary is now more robustly initialized
  };
};
