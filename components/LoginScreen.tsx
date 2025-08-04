import React, { useState } from 'react';
import type { StudentInfo } from '../types';

export const LoginScreen: React.FC<{ onLogin: (studentInfo: StudentInfo) => void; onTeacherLoginClick: () => void; }> = ({ onLogin, onTeacherLoginClick }) => {
  const [grade, setGrade] = useState(1);
  const [classNum, setClassNum] = useState(1);
  const [studentNum, setStudentNum] = useState(1);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('名前を入力してください。');
      return;
    }
    setError('');
    onLogin({
      grade,
      classNum,
      studentNum,
      name: name.trim(),
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-slate-50">
       <button 
        onClick={onTeacherLoginClick}
        className="absolute top-4 right-4 text-sm text-slate-500 hover:text-sky-600 hover:underline font-semibold z-10"
       >
         先生用
       </button>
       <div className="w-full max-w-md">
        <div className="text-center mb-10">
            <h1 className="text-5xl md:text-6xl font-black text-sky-500 tracking-tight">Ise3 Smart Plan</h1>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">あなたの努力を”最適化”する最強にsmartな計画アプリ</p>
        </div>

        <div className="bg-white text-slate-800 p-8 rounded-2xl shadow-2xl">
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">ログイン</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">学年</label>
                <select value={grade} onChange={e => setGrade(Number(e.target.value))} className="w-full p-3 bg-slate-100 border-slate-300 border rounded-md shadow-sm text-slate-800 focus:ring-sky-500 focus:border-sky-500">
                  {[1, 2, 3].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">組</label>
                <select value={classNum} onChange={e => setClassNum(Number(e.target.value))} className="w-full p-3 bg-slate-100 border-slate-300 border rounded-md shadow-sm text-slate-800 focus:ring-sky-500 focus:border-sky-500">
                  {[1, 2, 3, 4, 5, 6].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">番号</label>
                <select value={studentNum} onChange={e => setStudentNum(Number(e.target.value))} className="w-full p-3 bg-slate-100 border-slate-300 border rounded-md shadow-sm text-slate-800 focus:ring-sky-500 focus:border-sky-500">
                  {Array.from({ length: 40 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">名前</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full p-3 bg-slate-100 border-slate-300 border rounded-md shadow-sm placeholder:text-slate-400 text-slate-800 focus:ring-sky-500 focus:border-sky-500"
                placeholder="例: 伊勢 三郎"
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            
            <div className="pt-4">
              <button type="submit" className="w-full bg-sky-500 text-white font-extrabold py-3 px-6 rounded-full hover:bg-sky-600 transition-transform hover:scale-105 shadow-lg text-lg">
                計画をはじめる
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
