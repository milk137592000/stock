import React, { useState } from 'react';
import { StockSymbol, UserHoldings, StockRealTimeInfo, HoldingDetails } from '../types';
import { StockCrawlerService, extractSymbolsFromHoldings, updateWarehouseFile, generateSimpleWarehouseContent, autoUpdateWarehouseContent } from '../services/stockCrawlerService';
import { LoadingSpinner } from './LoadingSpinner';

interface StockDataUpdaterProps {
  userHoldings: UserHoldings;
  onDataUpdated?: (updatedData: StockRealTimeInfo[]) => void;
  onWarehouseUpdated?: (newContent: string) => void;
  isAutoUpdating?: boolean;
}

export const StockDataUpdater: React.FC<StockDataUpdaterProps> = ({
  userHoldings,
  onDataUpdated,
  onWarehouseUpdated,
  isAutoUpdating = false
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [stockData, setStockData] = useState<StockRealTimeInfo[]>([]);
  const [warehouseContent, setWarehouseContent] = useState<string>('');

  // 移除手動更新功能 - 只保留自動更新

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          isAutoUpdating
            ? 'bg-gradient-to-br from-blue-500 to-cyan-500 animate-pulse'
            : 'bg-gradient-to-br from-green-500 to-emerald-500'
        }`}>
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-100">股票資料更新</h2>
          {isAutoUpdating && (
            <p className="text-sm text-blue-300 animate-pulse">🚀 自動更新中...</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="text-slate-300 text-center">
            <p className="text-sm">持股數量: {Object.keys(userHoldings).length} 檔</p>
            {lastUpdateTime && (
              <p className="text-xs text-slate-400">最後更新: {lastUpdateTime}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">📱 進入app時自動更新一次</p>
          </div>
        </div>

        {updateStatus && (
          <div className={`p-3 rounded-lg text-sm ${
            updateStatus.includes('失敗') 
              ? 'bg-red-900/30 border border-red-700/50 text-red-300'
              : updateStatus.includes('成功')
              ? 'bg-green-900/30 border border-green-700/50 text-green-300'
              : 'bg-blue-900/30 border border-blue-700/50 text-blue-300'
          }`}>
            {updateStatus}
          </div>
        )}

        {stockData.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">最新股票資訊</h3>
            <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
              {stockData.map((stock) => (
                <div key={stock.symbol} className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-100">{stock.symbol}</h4>
                      <p className="text-sm text-slate-400">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-100">${stock.currentPrice.toFixed(2)}</p>
                      <p className={`text-sm ${
                        stock.change >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}



        <div className="mt-4 p-3 bg-slate-700/20 rounded-lg border border-slate-600/30">
          <h4 className="text-sm font-medium text-slate-300 mb-2">🚀 自動更新流程</h4>
          <div className="text-xs text-slate-400 space-y-2">
            <div className="p-2 bg-blue-900/20 border border-blue-700/30 rounded">
              <strong className="text-blue-300">步驟 1：</strong> 進入app時自動讀取 warehouse.md ✅
            </div>
            <div className="p-2 bg-green-900/20 border border-green-700/30 rounded">
              <strong className="text-green-300">步驟 2：</strong> 自動爬取最新Yahoo股市資訊 🕷️
            </div>
            <div className="p-2 bg-purple-900/20 border border-purple-700/30 rounded">
              <strong className="text-purple-300">步驟 3：</strong> 自動更新 warehouse.md 檔案 📁
            </div>
            <div className="p-2 bg-emerald-900/20 border border-emerald-700/30 rounded">
              <strong className="text-emerald-300">步驟 4：</strong> 自動更新持股卡片顯示 🔄
            </div>
          </div>
          <div className="mt-3 p-2 bg-green-900/20 border border-green-700/30 rounded text-xs text-green-300">
            <strong>✅ 完全自動化：</strong>進入app時自動執行一次完整更新，無需手動操作！
          </div>
        </div>
      </div>
    </div>
  );
};
