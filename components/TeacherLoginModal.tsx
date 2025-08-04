import React, { useState } from 'react';

export const TeacherLoginModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onLogin: (password: string) => void;
}> = ({ isOpen, onClose, onLogin }) => {
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl p-8 m-4 max-w-sm w-full transform transition-all animate-in fade-in-0 zoom-in-95" 
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-slate-800 mb-4 text-center">先生用ログイン</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="teacher-password">
              パスワード
            </label>
            <input
              id="teacher-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 bg-slate-100 border-slate-300 border rounded-md shadow-sm"
              autoFocus
            />
          </div>
          <div className="flex justify-center gap-4">
             <button type="button" onClick={onClose} className="py-2 px-8 rounded-lg bg-slate-200 text-slate-800 font-semibold hover:bg-slate-300 transition-colors">
              キャンセル
            </button>
            <button type="submit" className="py-2 px-8 rounded-lg bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-colors">
              ログイン
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
