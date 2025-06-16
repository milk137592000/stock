import React, { useState, useEffect } from 'react';
import { SchedulerService } from '../services/schedulerService';
import { MultiAIAdviceService } from '../services/multiAIAdviceService';

interface SchedulerStatus {
  isScheduled: boolean;
  isRunning: boolean;
  nextExecution: string | null;
  timeUntilNext: number | null;
}

export const SchedulerManager: React.FC = () => {
  const [status, setStatus] = useState<SchedulerStatus>({
    isScheduled: false,
    isRunning: false,
    nextExecution: null,
    timeUntilNext: null
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  // 更新狀態
  const updateStatus = () => {
    const currentStatus = SchedulerService.getStatus();
    setStatus(currentStatus);
  };

  // 定期更新狀態
  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 30000); // 每30秒更新一次
    return () => clearInterval(interval);
  }, []);

  // 啟動排程
  const handleStart = () => {
    SchedulerService.start();
    updateStatus();
    setLastResult('✅ 排程服務已啟動');
  };

  // 停止排程
  const handleStop = () => {
    SchedulerService.stop();
    updateStatus();
    setLastResult('🛑 排程服務已停止');
  };

  // 手動執行
  const handleExecuteNow = async () => {
    setIsExecuting(true);
    setLastResult('🔄 正在執行AI建議生成...');
    
    try {
      await SchedulerService.executeNow();
      setLastResult('✅ 手動執行完成');
    } catch (error) {
      setLastResult(`❌ 執行失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setIsExecuting(false);
      updateStatus();
    }
  };

  // 測試單一模型
  const handleTestModel = async (modelName: string) => {
    setIsExecuting(true);
    setLastResult(`🧪 正在測試 ${modelName}...`);
    
    try {
      const success = await MultiAIAdviceService.testSingleModel(modelName);
      setLastResult(success ? `✅ ${modelName} 測試成功` : `❌ ${modelName} 測試失敗`);
    } catch (error) {
      setLastResult(`❌ ${modelName} 測試失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // 啟動測試模式
  const handleTestMode = () => {
    SchedulerService.startTestMode(2); // 每2分鐘執行一次
    updateStatus();
    setLastResult('🧪 測試模式已啟動（每2分鐘執行一次）');
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">AI建議自動排程</h2>
          <p className="text-sm text-slate-400">每天早上10點自動生成4種AI模型建議</p>
        </div>
      </div>

      {/* 狀態顯示 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-700/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-3 h-3 rounded-full ${status.isScheduled ? 'bg-green-400' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium text-slate-200">排程狀態</span>
          </div>
          <p className="text-xs text-slate-400">
            {status.isScheduled ? '已啟動' : '未啟動'}
          </p>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-3 h-3 rounded-full ${status.isRunning ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium text-slate-200">執行狀態</span>
          </div>
          <p className="text-xs text-slate-400">
            {status.isRunning ? '執行中' : '待機中'}
          </p>
        </div>
      </div>

      {/* 下次執行時間 */}
      {status.nextExecution && (
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 mb-4">
          <h3 className="text-sm font-medium text-blue-300 mb-1">下次執行時間</h3>
          <p className="text-sm text-blue-200">{status.nextExecution}</p>
          {status.timeUntilNext && (
            <p className="text-xs text-blue-400 mt-1">
              還有 {status.timeUntilNext} 分鐘
            </p>
          )}
        </div>
      )}

      {/* 控制按鈕 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={handleStart}
          disabled={status.isScheduled || isExecuting}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            status.isScheduled || isExecuting
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/25'
          }`}
        >
          啟動排程
        </button>

        <button
          onClick={handleStop}
          disabled={!status.isScheduled || isExecuting}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            !status.isScheduled || isExecuting
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25'
          }`}
        >
          停止排程
        </button>
      </div>

      {/* 手動執行 */}
      <div className="mb-4">
        <button
          onClick={handleExecuteNow}
          disabled={isExecuting}
          className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            isExecuting
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/25'
          }`}
        >
          {isExecuting ? '執行中...' : '立即執行一次'}
        </button>
      </div>

      {/* 測試功能 */}
      <div className="border-t border-slate-600/50 pt-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">🧪 測試功能</h3>
        
        <div className="grid grid-cols-2 gap-2 mb-3">
          {['deepseek', 'Mistral', 'Gemini', 'Meta'].map(model => (
            <button
              key={model}
              onClick={() => handleTestModel(model)}
              disabled={isExecuting}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                isExecuting
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              測試 {model}
            </button>
          ))}
        </div>

        <button
          onClick={handleTestMode}
          disabled={isExecuting}
          className={`w-full px-3 py-1 text-xs rounded transition-colors ${
            isExecuting
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-orange-600 hover:bg-orange-700 text-white'
          }`}
        >
          啟動測試模式（2分鐘間隔）
        </button>
      </div>

      {/* 結果顯示 */}
      {lastResult && (
        <div className="mt-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
          <p className="text-sm text-slate-300">{lastResult}</p>
        </div>
      )}

      {/* 說明 */}
      <div className="mt-4 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
        <h4 className="text-sm font-medium text-amber-300 mb-2">📋 功能說明</h4>
        <ul className="text-xs text-amber-200 space-y-1">
          <li>• 每天早上10點自動執行4種AI模型建議生成</li>
          <li>• 只記錄有買/賣建議的股票到 advice.md</li>
          <li>• 自動清理30天前的舊記錄</li>
          <li>• 可手動執行或測試單一模型</li>
        </ul>
      </div>
    </div>
  );
};
