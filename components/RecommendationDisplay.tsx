import React from 'react';
import { InvestmentAdvice } from '../types';
import { StockCard } from './StockCard';
import { MONTH_NAMES_FULL } from '../constants';

interface RecommendationDisplayProps {
  advice: InvestmentAdvice;
}

export const RecommendationDisplay: React.FC<RecommendationDisplayProps> = ({ advice }) => {
  const currentMonthDisplay = MONTH_NAMES_FULL[advice.currentMonth -1];
  return (
    <div className="space-y-8">
      <div className="bg-slate-800 shadow-xl rounded-lg p-6">
        <h2 className="text-2xl font-bold text-sky-400 mb-2">
          {currentMonthDisplay} AI市場展望與策略
        </h2>
        <p className="text-slate-300 italic">{advice.marketOutlook}</p>
        <p className="text-sm text-slate-400 mt-2">
          您的可投資金額上限: {advice.userMaxMonthlyInvestment.toLocaleString()} NTD
        </p>
        <p className="text-md font-semibold text-sky-300 mt-1">
          本月AI建議總投資金額: {advice.decidedOptimalInvestmentNTD.toLocaleString()} NTD
        </p>
        
        {advice.budgetSummary && (
          <div className="mt-4 border-t border-slate-700 pt-4 text-sm text-slate-400 space-y-1">
            <h4 className="font-semibold text-slate-300 mb-1">AI 預算分配摘要 (基於建議總投資額):</h4>
            {advice.budgetSummary.decidedOptimalInvestmentNTD !== advice.decidedOptimalInvestmentNTD && (
                <p className="text-amber-500 text-xs">(注意：AI回傳的建議投資額 {advice.budgetSummary.decidedOptimalInvestmentNTD.toLocaleString()} NTD 與應用程式最終使用的 {advice.decidedOptimalInvestmentNTD.toLocaleString()} NTD 可能因校正而不同)</p>
            )}
            <p>總買入金額: {advice.budgetSummary.totalSpentOnBuysNTD.toLocaleString()} NTD</p>
            <p>總賣出獲利: {advice.budgetSummary.totalGainedFromSellsNTD.toLocaleString()} NTD</p>
            <p>淨投資額: {advice.budgetSummary.netInvestmentNTD.toLocaleString()} NTD</p>
            {advice.budgetSummary.remainingUnallocatedNTD !== 0 && (
                 <p className={advice.budgetSummary.remainingUnallocatedNTD > 0 ? "text-amber-500" : "text-emerald-500"}>
                    未分配/剩餘預算 (相對於AI建議總投資額): {advice.budgetSummary.remainingUnallocatedNTD.toLocaleString()} NTD
                 </p>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-semibold text-emerald-400 mb-4">
          <i className="ph-stack-fill mr-2"></i>核心持股配置建議
        </h3>
        {advice.existingHoldingsRecommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advice.existingHoldingsRecommendations.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
          </div>
        ) : (
          <p className="text-slate-400">本月無核心持股配置建議。</p>
        )}
      </div>

      {advice.newSuggestions.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-amber-400 mb-4">
            <i className="ph-trend-up-fill mr-2"></i>AI潛力標的觀察
          </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {advice.newSuggestions.map((stock) => (
                <StockCard key={stock.symbol} stock={stock} />
              ))}
            </div>
        </div>
      )}
       {advice.newSuggestions.length === 0 && advice.existingHoldingsRecommendations.length > 0 && (
         <p className="text-slate-400 mt-6">本月 AI 未新增潛力標的建議。</p>
       )}
       {advice.newSuggestions.length === 0 && advice.existingHoldingsRecommendations.length === 0 && (
         <p className="text-slate-400 mt-6 text-center py-4">AI 目前無任何標的建議。請調整投資金額上限或稍後再試。</p>
       )}
    </div>
  );
};