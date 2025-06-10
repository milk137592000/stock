import React from 'react';
import { InformationCircleIcon } from './icons/InformationCircleIcon';

interface InvestmentControlsProps {
  monthlyInvestment: number; // This now represents the user's maximum willingness / upper limit
  onInvestmentChange: (value: number) => void;
  onGetAdvice: () => void;
  isLoading: boolean;
  minAmount: number;
  maxAmount: number;
}

export const InvestmentControls: React.FC<InvestmentControlsProps> = ({
  monthlyInvestment,
  onInvestmentChange,
  onGetAdvice,
  isLoading,
  minAmount,
  maxAmount
}) => {
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onInvestmentChange(Number(event.target.value));
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let value = Number(event.target.value);
    if (value < minAmount) value = minAmount;
    if (value > maxAmount) value = maxAmount;
    onInvestmentChange(value);
  };

  return (
    <div className="bg-slate-800 shadow-xl rounded-lg p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <label htmlFor="monthlyInvestmentInput" className="text-lg font-semibold text-sky-400">
          每月可投資金額上限 (NTD):
        </label>
        <div className="flex items-center gap-2">
           <input
            type="number"
            id="monthlyInvestmentInput"
            value={monthlyInvestment}
            onChange={handleInputChange}
            min={minAmount}
            max={maxAmount}
            step="500"
            className="w-32 p-2 border border-slate-600 rounded-md bg-slate-700 text-slate-100 focus:ring-sky-500 focus:border-sky-500"
            disabled={isLoading}
          />
           <div className="tooltip">
             <InformationCircleIcon className="w-5 h-5 text-slate-400 hover:text-sky-400" />
             <span className="tooltiptext">您願意投入的資金上限： {minAmount.toLocaleString()} NTD - {maxAmount.toLocaleString()} NTD。AI 將在此範圍內決定最佳投資金額。</span>
           </div>
        </div>
      </div>
       <input
          type="range"
          id="monthlyInvestmentSlider"
          min={minAmount}
          max={maxAmount}
          value={monthlyInvestment}
          onChange={handleSliderChange}
          step="500"
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          disabled={isLoading}
        />
      <button
        onClick={onGetAdvice}
        disabled={isLoading}
        className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            分析中...
          </>
        ) : (
          <>
            <i className="ph-lightbulb text-xl"></i>
            獲取本月投資建議
          </>
        )}
      </button>
    </div>
  );
};