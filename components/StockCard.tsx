
import React from 'react';
import { RecommendedStock } from '../types';
import { InformationCircleIcon } from './icons/InformationCircleIcon';

interface StockCardProps {
  stock: RecommendedStock;
}

const CATEGORY_COLORS: Record<string, string> = {
  'TW ETF': 'bg-sky-600 text-sky-100',
  'TW Stock': 'bg-emerald-600 text-emerald-100',
  'US Stock': 'bg-indigo-600 text-indigo-100',
  'Bond ETF': 'bg-slate-600 text-slate-100',
  '未知分類': 'bg-gray-500 text-gray-100', // Added for unknown category
};

const getActionTextAndColor = (action: RecommendedStock['action']): { text: string, colorClass: string } => {
  switch (action) {
    case 'BUY': return { text: '建議買入', colorClass: 'text-emerald-400' };
    case 'HOLD': return { text: '建議持有', colorClass: 'text-amber-400' };
    case 'SELL': return { text: '建議賣出', colorClass: 'text-red-400' };
    default: return { text: '操作建議', colorClass: 'text-slate-400' };
  }
}

export const StockCard: React.FC<StockCardProps> = ({ stock }) => {
  const categoryColor = CATEGORY_COLORS[stock.category] || 'bg-gray-500 text-gray-100';
  const { text: actionText, colorClass: actionColor } = getActionTextAndColor(stock.action);
  
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden transform transition-all hover:scale-105 duration-300 flex flex-col justify-between">
      <div>
        <div className={`p-4 ${categoryColor}`}>
          <h4 className="text-lg font-bold">{stock.name} ({stock.symbol})</h4>
          <div className="flex justify-between items-center">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColor} border border-current`}>
              {stock.category}
            </span>
            <span className="text-xs text-white/80">
              參考現價: {stock.currentPrice > 0 ? stock.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'} NTD
            </span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {stock.currentHoldingShares !== undefined && ( 
            <div>
              <p className="text-sm text-slate-400">目前持股:</p>
              <p className="text-md font-semibold text-slate-300">
                {stock.currentHoldingShares.toLocaleString()} 股
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-slate-400">{actionText}:</p>
            <p className={`text-xl font-semibold ${actionColor}`}>
              {stock.recommendedShares > 0 ? `${stock.recommendedShares.toLocaleString()} 股` : (stock.action === 'HOLD' ? '觀望 / 維持倉位' : '無')}
            </p>
            {stock.action === 'BUY' && stock.allocatedAmount > 0 && stock.recommendedShares > 0 && (
                 <p className="text-xs text-slate-500">
                    (預計投入約 {stock.allocatedAmount.toLocaleString()} NTD)
                 </p>
            )}
            {stock.action === 'SELL' && stock.allocatedAmount > 0 && stock.recommendedShares > 0 && (
                 <p className="text-xs text-slate-500">
                    (預計獲得約 {stock.allocatedAmount.toLocaleString()} NTD)
                 </p>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 pt-0">
        <div className="flex items-center text-sm text-slate-400 mb-1">
          <p>參考理由:</p>
          <div className="tooltip ml-1">
            <InformationCircleIcon className="w-4 h-4 text-slate-500 hover:text-sky-400" />
            <span className="tooltiptext">{stock.reasoning}</span>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed h-16 overflow-y-auto pr-1">
            {stock.reasoning}
        </p>
      </div>
    </div>
  );
};