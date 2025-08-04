import React from 'react';
import { LoaderIcon } from './icons';

export const LoadingScreen: React.FC<{ message?: string; }> = ({ message = "データを読み込んでいます..." }) => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex flex-col justify-center items-center z-50">
      <LoaderIcon className="w-16 h-16 text-sky-500 animate-spin" />
      <p className="mt-4 text-xl text-slate-700 font-semibold">{message}</p>
    </div>
  );
};
