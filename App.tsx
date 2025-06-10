import React, { useState, useCallback, useEffect } from 'react';
import { InvestmentControls } from './components/InvestmentControls';
import { RecommendationDisplay } from './components/RecommendationDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { getInvestmentAdvice, AIModel } from './services/aiService';
import { InvestmentAdvice, StockSymbol, UserHoldings } from './types';
import {
  EXISTING_HOLDINGS_SYMBOLS,
  DEFAULT_INVESTMENT_AMOUNT,
  MIN_INVESTMENT_AMOUNT,
  MAX_INVESTMENT_AMOUNT,
  USER_HOLDINGS
} from './constants';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

const App: React.FC = () => {
  // monthlyInvestment now represents the user's maximum willingness or upper limit for the month's investment.
  const [userMaxMonthlyInvestment, setUserMaxMonthlyInvestment] = useState<number>(DEFAULT_INVESTMENT_AMOUNT);
  const [advice, setAdvice] = useState<InvestmentAdvice | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonthName, setCurrentMonthName] = useState<string>('');
  const [userHoldings, setUserHoldings] = useState<UserHoldings>(USER_HOLDINGS);
  const [selectedModel, setSelectedModel] = useState<AIModel>('deepseek');

  useEffect(() => {
    const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月",
      "七月", "八月", "九月", "十月", "十一月", "十二月"];
    const currentMonthIndex = new Date().getMonth();
    setCurrentMonthName(monthNames[currentMonthIndex]);
  }, []);

  const handleGetAdvice = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAdvice(null);
    try {
      const newAdvice = await getInvestmentAdvice(
        userMaxMonthlyInvestment,
        EXISTING_HOLDINGS_SYMBOLS as StockSymbol[],
        userHoldings,
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
  }, [userMaxMonthlyInvestment, userHoldings, selectedModel]);

  useEffect(() => {
    // Optional: Automatically fetch advice on initial load or keep it manual via button.
    // handleGetAdvice(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-slate-100 flex flex-col items-center p-4 sm:p-6 md:p-8">
      <Header currentMonthName={currentMonthName} />

      <main className="container mx-auto w-full max-w-4xl space-y-8">
        <div className="flex justify-end mb-4">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as AIModel)}
            className="bg-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="deepseek">DeepSeek AI</option>
            <option value="mistral">Mistral AI</option>
            <option value="gemini">Google Gemma</option>
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