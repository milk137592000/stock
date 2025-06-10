
import React from 'react';

interface HeaderProps {
  currentMonthName: string;
}

export const Header: React.FC<HeaderProps> = ({ currentMonthName }) => {
  return (
    <header className="w-full max-w-4xl mb-8 text-center">
      <div className="inline-block p-4 bg-slate-800 rounded-lg shadow-xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">
          <i className="ph-chart-line-up-fill mr-2"></i>
          鈞鈞智慧投資顧問
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          您的 {currentMonthName} 專屬投資策略夥伴
        </p>
      </div>
    </header>
  );
};
