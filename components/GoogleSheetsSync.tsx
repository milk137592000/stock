import React, { useState, useEffect } from 'react';
import { createGoogleDocsService, GoogleDocsConfig } from '../services/googleDocsService';
import { WarehouseApiService } from '../services/warehouseApiService';

interface GoogleDocsSyncProps {
  className?: string;
}

export const GoogleSheetsSync: React.FC<GoogleDocsSyncProps> = ({ className = '' }) => {
  const [config, setConfig] = useState<GoogleDocsConfig>({
    warehouseDocumentId: '',
    adviceDocumentId: '',
    apiKey: ''
  });
  
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{
    warehouse: boolean | null;
    advice: boolean | null;
  }>({ warehouse: null, advice: null });
  const [showConfig, setShowConfig] = useState(false);

  // 檢查配置是否完整
  useEffect(() => {
    const isComplete = config.warehouseDocumentId && config.adviceDocumentId && config.apiKey;
    setIsConfigured(isComplete);
  }, [config]);

  // 載入保存的配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('googleDocsConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
      } catch (error) {
        console.error('載入 Google Docs 配置失敗:', error);
      }
    }
  }, []);

  // 保存配置
  const saveConfig = () => {
    localStorage.setItem('googleDocsConfig', JSON.stringify(config));
    setShowConfig(false);
  };

  // 執行同步
  const handleSync = async () => {
    if (!isConfigured) {
      alert('請先配置 Google Docs 設定');
      setShowConfig(true);
      return;
    }

    setIsSyncing(true);
    setSyncStatus({ warehouse: null, advice: null });

    try {
      // 讀取本地文件內容
      const warehouseContent = await WarehouseApiService.readWarehouseFile();
      const adviceResponse = await fetch('http://localhost:3001/api/advice');
      const adviceData = await adviceResponse.json();

      if (!warehouseContent || !adviceData.success) {
        throw new Error('無法讀取本地文件');
      }

      // 創建 Google Docs 服務並同步
      const docsService = createGoogleDocsService(config);
      const result = await docsService.syncAllData(warehouseContent, adviceData.content);

      setSyncStatus({
        warehouse: result.warehouseSuccess,
        advice: result.adviceSuccess
      });

      if (result.warehouseSuccess && result.adviceSuccess) {
        setLastSyncTime(new Date().toLocaleString('zh-TW'));
      }

    } catch (error) {
      console.error('同步失敗:', error);
      setSyncStatus({ warehouse: false, advice: false });
      alert(`同步失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 生成 Google Docs 連結
  const getDocsUrls = () => {
    return {
      warehouse: config.warehouseDocumentId ? `https://docs.google.com/document/d/${config.warehouseDocumentId}/edit` : '#',
      advice: config.adviceDocumentId ? `https://docs.google.com/document/d/${config.adviceDocumentId}/edit` : '#'
    };
  };

  return (
    <div className={`bg-slate-800 rounded-lg p-6 border border-slate-700 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center">
          📄 Google Docs 同步
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
          >
            ⚙️ 設定
          </button>
          {isConfigured && (
            <>
              <a
                href={getDocsUrls().warehouse}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
              >
                📊 投資組合
              </a>
              <a
                href={getDocsUrls().advice}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-sm bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
              >
                🤖 AI建議
              </a>
            </>
          )}
        </div>
      </div>

      {/* 配置面板 */}
      {showConfig && (
        <div className="mb-4 p-4 bg-slate-900 rounded border border-slate-600">
          <h4 className="text-md font-medium text-slate-200 mb-3">Google Docs 配置</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1">投資組合 Document ID</label>
              <input
                type="text"
                value={config.warehouseDocumentId}
                onChange={(e) => setConfig(prev => ({ ...prev, warehouseDocumentId: e.target.value }))}
                placeholder="從 Google Docs URL 中提取的投資組合文件 ID"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-100 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">AI建議 Document ID</label>
              <input
                type="text"
                value={config.adviceDocumentId}
                onChange={(e) => setConfig(prev => ({ ...prev, adviceDocumentId: e.target.value }))}
                placeholder="從 Google Docs URL 中提取的 AI建議文件 ID"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-100 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">API Key</label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Google Docs API 金鑰"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-100 text-sm"
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={saveConfig}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
            >
              💾 保存配置
            </button>
            <button
              onClick={() => setShowConfig(false)}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded text-sm transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 同步狀態 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-300">
            配置狀態: {isConfigured ? 
              <span className="text-green-400">✅ 已配置</span> : 
              <span className="text-yellow-400">⚠️ 未配置</span>
            }
          </div>
          
          {lastSyncTime && (
            <div className="text-sm text-slate-400">
              上次同步: {lastSyncTime}
            </div>
          )}
        </div>

        {/* 同步結果 */}
        {(syncStatus.warehouse !== null || syncStatus.advice !== null) && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center">
              <span className="text-slate-300 mr-2">投資組合:</span>
              {syncStatus.warehouse === true && <span className="text-green-400">✅ 成功</span>}
              {syncStatus.warehouse === false && <span className="text-red-400">❌ 失敗</span>}
              {syncStatus.warehouse === null && <span className="text-slate-400">⏳ 處理中</span>}
            </div>
            
            <div className="flex items-center">
              <span className="text-slate-300 mr-2">AI建議:</span>
              {syncStatus.advice === true && <span className="text-green-400">✅ 成功</span>}
              {syncStatus.advice === false && <span className="text-red-400">❌ 失敗</span>}
              {syncStatus.advice === null && <span className="text-slate-400">⏳ 處理中</span>}
            </div>
          </div>
        )}

        {/* 同步按鈕 */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`w-full py-3 rounded font-medium transition-colors ${
            isSyncing
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : isConfigured
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-yellow-600 hover:bg-yellow-500 text-white'
          }`}
        >
          {isSyncing ? '🔄 同步中...' : isConfigured ? '📤 同步到 Google Docs' : '⚙️ 請先配置'}
        </button>
      </div>

      {/* 說明文字 */}
      <div className="mt-4 text-xs text-slate-400 space-y-1">
        <p>• 同步會將 warehouse.md 和 advice.md 的內容上傳到 Google Docs</p>
        <p>• 請確保已按照 GOOGLE_DOCS_SETUP.md 的說明完成設定</p>
        <p>• 同步後可在線上查看和分享您的投資數據</p>
      </div>
    </div>
  );
};
