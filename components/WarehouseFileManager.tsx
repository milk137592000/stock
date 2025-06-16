import React, { useState } from 'react';

interface WarehouseFileManagerProps {
  show: boolean;
  onClose: () => void;
  warehouseContent: string;
}

export const WarehouseFileManager: React.FC<WarehouseFileManagerProps> = ({
  show,
  onClose,
  warehouseContent
}) => {
  const [step, setStep] = useState(1);

  if (!show) return null;

  const handleDownload = () => {
    const blob = new Blob([warehouseContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'warehouse.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStep(2);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-100">📁 更新 warehouse.md 檔案</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* 步驟指示器 */}
            <div className="flex items-center space-x-4 mb-6">
              <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-400' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600' : 'bg-slate-600'}`}>
                  1
                </div>
                <span>下載檔案</span>
              </div>
              <div className="flex-1 h-px bg-slate-600"></div>
              <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-green-400' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-green-600' : 'bg-slate-600'}`}>
                  2
                </div>
                <span>替換檔案</span>
              </div>
              <div className="flex-1 h-px bg-slate-600"></div>
              <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-purple-400' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-purple-600' : 'bg-slate-600'}`}>
                  3
                </div>
                <span>重新載入</span>
              </div>
            </div>

            {/* 步驟 1: 下載檔案 */}
            {step === 1 && (
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">步驟 1: 下載更新後的 warehouse.md</h3>
                <p className="text-slate-300 mb-4">
                  點擊下方按鈕下載包含最新股票資訊的 warehouse.md 檔案。
                </p>
                <button
                  onClick={handleDownload}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  📥 下載 warehouse.md
                </button>
              </div>
            )}

            {/* 步驟 2: 替換檔案 */}
            {step === 2 && (
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-300 mb-3">步驟 2: 替換原始檔案</h3>
                <div className="text-slate-300 space-y-2 mb-4">
                  <p>1. 找到下載的 warehouse.md 檔案（通常在下載資料夾）</p>
                  <p>2. 將它移動到專案根目錄，替換原有的 warehouse.md</p>
                  <p className="text-amber-300">📍 檔案位置: <code>/Users/eugenefang/Desktop/code/inventment/warehouse.md</code></p>
                </div>
                <button
                  onClick={() => setStep(3)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  ✅ 已替換檔案
                </button>
              </div>
            )}

            {/* 步驟 3: 重新載入 */}
            {step === 3 && (
              <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-300 mb-3">步驟 3: 重新載入應用程式</h3>
                <p className="text-slate-300 mb-4">
                  點擊下方按鈕重新載入頁面，應用程式將讀取更新後的 warehouse.md 檔案。
                </p>
                <button
                  onClick={handleReload}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  🔄 重新載入頁面
                </button>
              </div>
            )}

            {/* 檔案內容預覽 */}
            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
              <h4 className="text-sm font-medium text-slate-300 mb-2">📄 更新後的檔案內容預覽</h4>
              <div className="bg-slate-800/50 rounded p-3 max-h-40 overflow-y-auto">
                <pre className="text-xs text-slate-300 whitespace-pre-wrap">
                  {warehouseContent}
                </pre>
              </div>
            </div>

            {/* 說明 */}
            <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
              <h4 className="text-sm font-medium text-amber-300 mb-2">⚠️ 為什麼需要手動替換？</h4>
              <p className="text-xs text-amber-200">
                由於瀏覽器安全限制，網頁應用程式無法直接修改本地檔案系統中的檔案。
                因此需要透過下載和手動替換的方式來更新 warehouse.md 檔案。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
