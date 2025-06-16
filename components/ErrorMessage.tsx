
import React from 'react';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className="bg-red-700 border border-red-900 text-red-100 px-4 py-3 rounded-lg relative shadow-md" role="alert">
      <strong className="font-bold mr-2"><i className="ph-warning-octagon-fill mr-1"></i>錯誤：</strong>
      <span className="block sm:inline">{message}</span>
    </div>
  );
};
