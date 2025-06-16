import React from 'react';
import { AIModelConfig } from '../services/dataService';

interface AIModelSelectorProps {
  models: AIModelConfig[];
  selectedModel: AIModelConfig | null;
  onModelSelect: (model: AIModelConfig) => void;
  isLoading?: boolean;
}

export const AIModelSelector: React.FC<AIModelSelectorProps> = ({
  models,
  selectedModel,
  onModelSelect,
  isLoading = false
}) => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-100">AI 模型選擇</h2>
      </div>

      {models.length === 0 ? (
        <div className="text-slate-400 text-center py-4">
          <p>無法載入 AI 模型配置</p>
          <p className="text-sm mt-1">請檢查 api.md 檔案</p>
        </div>
      ) : (
        <div className="space-y-3">
          {models.map((model, index) => (
            <button
              key={index}
              onClick={() => onModelSelect(model)}
              disabled={isLoading}
              className={`w-full p-4 rounded-lg border transition-all duration-200 text-left ${
                selectedModel?.name === model.name
                  ? 'bg-sky-600/20 border-sky-500 text-sky-100'
                  : 'bg-slate-700/30 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{model.name}</h3>
                  <p className="text-sm opacity-75 mt-1">{model.model}</p>
                </div>
                {selectedModel?.name === model.name && (
                  <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedModel && (
        <div className="mt-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
          <p className="text-sm text-slate-300">
            <span className="font-medium">已選擇:</span> {selectedModel.name}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            模型: {selectedModel.model}
          </p>
        </div>
      )}
    </div>
  );
};
