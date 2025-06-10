
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full max-w-4xl mt-12 py-6 text-center text-slate-500 border-t border-slate-700">
      <p className="text-sm">
        &copy; {new Date().getFullYear()} 鈞鈞智慧投資顧問. All rights reserved.
      </p>
      <p className="text-xs mt-1">
        投資一定有風險，基金投資有賺有賠，申購前應詳閱公開說明書。
      </p>
    </footer>
  );
};
