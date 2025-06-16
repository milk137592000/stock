
import React, { useState } from 'react';
import { StockSymbol, UserHoldings, StockDetails, RecommendedStock } from '../types';
import { InformationCircleIcon } from './icons/InformationCircleIcon';

interface PortfolioManagementProps {
  userHoldings: UserHoldings;
  onSharesChange: (symbol: StockSymbol, shares: number) => void;
  onAddStock: (symbol: StockSymbol, shares: number) => void;
  onRemoveStock: (symbol: StockSymbol) => void;
  allStocksView: Record<StockSymbol, Partial<Omit<StockDetails, 'symbol'>>>;
  existingHoldingsRecommendations?: RecommendedStock[];
}

// Helper function (similar to one in StockCard.tsx)
const getActionTextAndColor = (action: RecommendedStock['action']): { text: string, colorClass: string } => {
  switch (action) {
    case 'BUY': return { text: '建議買入', colorClass: 'text-emerald-400' };
    case 'HOLD': return { text: '建議持有', colorClass: 'text-amber-400' };
    case 'SELL': return { text: '建議賣出', colorClass: 'text-red-400' };
    default: return { text: '操作建議', colorClass: 'text-slate-400' };
  }
};

export const PortfolioManagement: React.FC<PortfolioManagementProps> = ({
  userHoldings,
  onSharesChange,
  onAddStock,
  onRemoveStock,
  allStocksView,
  existingHoldingsRecommendations,
}) => {
  const [newSymbol, setNewSymbol] = useState('');
  const [newShares, setNewShares] = useState('');

  const handleAdd = () => {
    const sharesNum = parseInt(newShares, 10);
    const trimmedSymbol = newSymbol.trim().toUpperCase();
    if (trimmedSymbol && !isNaN(sharesNum) && sharesNum >= 0) {
      onAddStock(trimmedSymbol, sharesNum);
      setNewSymbol('');
      setNewShares('');
    } else {
      alert("請輸入有效的股票代號和股數。股數必須為非負整數。");
    }
  };

  const holdingsArray = Object.entries(userHoldings)
    .filter(([, shares]) => shares !== undefined)
    .map(([symbol, shares]) => {
        const stockViewDetails = allStocksView[symbol] || {};
        const currentPrice = stockViewDetails.currentPrice || 0;
        const sharesHeld = shares || 0;
        return {
            symbol: symbol as StockSymbol,
            shares: sharesHeld,
            name: stockViewDetails.name || `自訂 (${symbol})`,
            currentPrice: currentPrice,
            currentValue: sharesHeld * currentPrice,
        };
    })
    .sort((a, b) => a.symbol.localeCompare(b.symbol));

  const totalAssets = holdingsArray.reduce((acc, holding) => acc + holding.currentValue, 0);

  return (
    <div className="bg-slate-800 shadow-xl rounded-lg p-6 space-y-6">
      <h3 className="text-xl font-semibold text-sky-400 mb-4">
        <i className="ph-wallet-fill mr-2"></i>我的持股管理
      </h3>
      
      {holdingsArray.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
          {holdingsArray.map(({ symbol, shares, name, currentPrice, currentValue }) => {
            const recommendation = existingHoldingsRecommendations?.find(r => r.symbol === symbol);
            const actionInfo = recommendation ? getActionTextAndColor(recommendation.action) : null;

            return (
              <div key={symbol} className="bg-slate-700/70 border border-slate-600 rounded-lg shadow-lg p-4 flex flex-col space-y-3 hover:shadow-sky-500/20 transition-shadow duration-300">
                <div>
                  <h4 className="text-lg font-bold text-sky-300 truncate" title={`${name} (${symbol})`}>{symbol}</h4>
                  <p className="text-xs text-slate-400 truncate" title={name}>{name}</p>
                </div>

                <div className="space-y-1 text-sm">
                  <p className="text-slate-400">
                    目前單價: 
                    <span className="text-slate-300 font-medium ml-1">
                      {currentPrice > 0 ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'} NTD
                    </span>
                  </p>
                  <p className="text-slate-400">
                    目前價值: 
                    <span className="text-slate-300 font-medium ml-1">
                       {currentValue > 0 ? currentValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : (currentPrice > 0 ? '0' : 'N/A')} NTD
                    </span>
                  </p>
                </div>
                
                <div className="flex-grow">
                  <label htmlFor={`shares-${symbol}`} className="block text-xs font-medium text-slate-400 mb-1">持有股數</label>
                  <input
                    type="number"
                    id={`shares-${symbol}`}
                    value={shares.toString()}
                    onChange={(e) => onSharesChange(symbol, Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full p-1.5 border border-slate-500 rounded-md bg-slate-600 text-slate-100 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-sm appearance-none text-right"
                    min="0"
                    aria-label={`Shares for ${symbol} (${name})`}
                  />
                </div>

                {recommendation && actionInfo && (
                  <div className="mt-2 pt-2 border-t border-slate-600/50 space-y-1">
                    <p className={`text-sm font-semibold ${actionInfo.colorClass}`}>
                      AI建議: {actionInfo.text}
                      {recommendation.action !== 'HOLD' && recommendation.recommendedShares > 0 && (
                        ` ${recommendation.recommendedShares.toLocaleString()} 股`
                      )}
                    </p>
                    {recommendation.action === 'BUY' && recommendation.allocatedAmount > 0 && recommendation.recommendedShares > 0 && (
                         <p className="text-xs text-slate-500">
                            (預計投入約 {recommendation.allocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} NTD)
                         </p>
                    )}
                    {recommendation.action === 'SELL' && recommendation.allocatedAmount > 0 && recommendation.recommendedShares > 0 && (
                         <p className="text-xs text-slate-500">
                            (預計獲得約 {recommendation.allocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} NTD)
                         </p>
                    )}
                     {(recommendation.reasoning && recommendation.reasoning !== "AI未提供詳細理由。" && recommendation.reasoning.trim() !== "") && (
                        <div className="flex items-center text-xs text-slate-400 mt-1">
                            <span>參考理由:</span>
                            <div className="tooltip ml-1">
                                <InformationCircleIcon className="w-3.5 h-3.5 text-slate-500 hover:text-sky-400 cursor-help" />
                                <span className="tooltiptext !w-64 !max-w-xs !text-xs !text-left !font-normal normal-case whitespace-normal break-words !leading-relaxed">
                                    {recommendation.reasoning}
                                </span>
                            </div>
                        </div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={() => onRemoveStock(symbol)}
                  className="w-full text-red-400 hover:text-red-300 bg-slate-600 hover:bg-slate-500/80 font-medium py-2 px-3 rounded-md text-sm flex items-center justify-center transition-colors duration-150 mt-auto"
                  aria-label={`移除 ${name} (${symbol})`}
                >
                  <i className="ph-trash text-base mr-2"></i> 移除
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-slate-400 text-center py-4">您目前沒有任何持股。請在下方新增。</p>
      )}

      {holdingsArray.length > 0 && (
        <div className="border-t border-slate-700 pt-6">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold text-sky-300">
              <i className="ph-coins-fill mr-2 text-sky-400"></i>總資產:
            </h4>
            <p className="text-xl font-bold text-emerald-400">
              {totalAssets.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} NTD
            </p>
          </div>
        </div>
      )}

      <div className="border-t border-slate-700 pt-6 space-y-3">
        <h4 className="text-lg font-semibold text-sky-300">新增/調整持股標的</h4>
        <p className="text-xs text-slate-400">若輸入已持有標的代號，將增加其股數。</p>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-grow">
            <label htmlFor="newStockSymbol" className="block text-xs font-medium text-slate-400 mb-1">股票代號</label>
            <input
              type="text"
              id="newStockSymbol"
              placeholder="例: 0050, 2330, AAPL"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              className="w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-slate-100 focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
              aria-label="New stock symbol"
            />
          </div>
          <div className="w-full sm:w-36">
            <label htmlFor="newStockShares" className="block text-xs font-medium text-slate-400 mb-1">持有股數</label>
            <input
              type="number"
              id="newStockShares"
              placeholder="股數"
              value={newShares}
              onChange={(e) => setNewShares(e.target.value)}
              min="0"
              className="w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-slate-100 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 appearance-none text-right"
              aria-label="Shares for new stock"
            />
          </div>
          <button
            onClick={handleAdd}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-md shadow hover:shadow-md transition-all duration-150 ease-in-out flex items-center justify-center"
          >
            <i className="ph-plus-circle-fill mr-1 text-lg"></i>
            新增/調整
          </button>
        </div>
      </div>
    </div>
  );
};
