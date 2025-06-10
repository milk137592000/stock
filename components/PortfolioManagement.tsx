import React, { useState } from 'react';
import { StockSymbol, UserHoldings, StockDetails } from '../types';
// No direct import of ALL_STOCKS_MAP here, uses allStocksView prop

interface PortfolioManagementProps {
  userHoldings: UserHoldings;
  onSharesChange: (symbol: StockSymbol, shares: number) => void;
  onAddStock: (symbol: StockSymbol, shares: number) => void;
  onRemoveStock: (symbol: StockSymbol) => void;
  allStocksView: Record<StockSymbol, Partial<Omit<StockDetails, 'symbol'>>>; // For display names/categories
}

export const PortfolioManagement: React.FC<PortfolioManagementProps> = ({
  userHoldings,
  onSharesChange,
  onAddStock,
  onRemoveStock,
  allStocksView,
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
    .filter(([, shares]) => shares !== undefined) // Filter out undefined share counts
    .map(([symbol, shares]) => {
        const stockViewDetails = allStocksView[symbol] || {};
        return {
            symbol: symbol as StockSymbol,
            shares: shares || 0,
            name: stockViewDetails.name || `自訂 (${symbol})`,
            // category is not displayed in this table, but good to have if needed later
        };
    })
    .sort((a, b) => a.symbol.localeCompare(b.symbol));


  return (
    <div className="bg-slate-800 shadow-xl rounded-lg p-6 space-y-6">
      <h3 className="text-xl font-semibold text-sky-400 mb-4">
        <i className="ph-wallet-fill mr-2"></i>我的持股管理
      </h3>
      
      {holdingsArray.length > 0 ? (
        <div className="overflow-x-auto max-h-96"> {/* Added max-h-96 for scrollability if list is long */}
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700/50 sticky top-0 z-10"> {/* Sticky header */}
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">代號</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">名稱</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">持有股數</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {holdingsArray.map(({ symbol, shares, name }) => (
                <tr key={symbol}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-200">{symbol}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 truncate max-w-xs">{name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="number"
                      value={shares.toString()} // Ensure value is string for controlled input
                      onChange={(e) => onSharesChange(symbol, Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-28 p-1.5 border border-slate-600 rounded-md bg-slate-700 text-slate-100 focus:ring-sky-500 focus:border-sky-500 text-sm appearance-none text-right"
                      min="0"
                      aria-label={`Shares for ${symbol}`}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <button
                      onClick={() => onRemoveStock(symbol)}
                      className="text-red-500 hover:text-red-400 text-sm font-medium"
                      aria-label={`Remove ${symbol}`}
                    >
                      <i className="ph-trash text-base"></i> 移除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-400 text-center py-4">您目前沒有任何持股。請在下方新增。</p>
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
              onChange={(e) => setNewSymbol(e.target.value)}
              className="w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-slate-100 focus:ring-sky-500 focus:border-sky-500"
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
              className="w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-slate-100 focus:ring-sky-500 focus:border-sky-500 appearance-none text-right"
              aria-label="Shares for new stock"
            />
          </div>
          <button
            onClick={handleAdd}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-md shadow transition duration-150 ease-in-out flex items-center justify-center"
          >
            <i className="ph-plus-circle-fill mr-1 text-lg"></i>
            新增/調整
          </button>
        </div>
      </div>
    </div>
  );
};