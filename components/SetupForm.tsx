import React, { useState, useEffect } from 'react';
import type { AppState, Subject, Task, TestType } from '../types';
import { DEFAULT_SUBJECTS, TEST_TYPES, WEEK_DAYS, STUDY_CAPACITY_OPTIONS } from '../constants';
import { BookOpenIcon, CalendarIcon, ChevronDownIcon, ChevronUpIcon, LoaderIcon, PlusCircleIcon, TargetIcon, Trash2Icon } from './icons';

const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <div className={`bg-white text-slate-800 p-6 rounded-2xl shadow-lg transition-all duration-300 ${className}`}>
    {children}
  </div>
);

const SectionHeader: React.FC<{ icon: React.ReactNode, title: string, subtitle: string }> = ({ icon, title, subtitle }) => (
  <div className="flex items-center gap-4 mb-6">
    <div className="bg-sky-100 text-sky-600 p-3 rounded-full">{icon}</div>
    <div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  </div>
);

const CustomNumberInput: React.FC<{ value: number; onChange: (value: number) => void; min?: number; max?: number }> = ({ value, onChange, min = 0, max }) => {
    const handleIncrement = () => {
        onChange(max !== undefined ? Math.min(max, value + 1) : value + 1);
    };
    const handleDecrement = () => {
        onChange(min !== undefined ? Math.max(min, value - 1) : value - 1);
    };

    return (
        <div className="relative w-28">
            <input
                type="number"
                value={value}
                min={min}
                max={max}
                onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                        onChange(val);
                    }
                }}
                className="w-full pl-3 pr-8 py-2 bg-slate-100 text-slate-800 border-slate-300 border rounded-md shadow-sm appearance-none text-center"
            />
            <div className="absolute inset-y-0 right-0 flex flex-col items-center justify-center w-8">
                <button type="button" onClick={handleIncrement} className="h-1/2 text-slate-500 hover:text-slate-800 flex items-center justify-center rounded-tr-md w-full">
                    <ChevronUpIcon className="w-4 h-4" />
                </button>
                <button type="button" onClick={handleDecrement} className="h-1/2 text-slate-500 hover:text-slate-800 flex items-center justify-center rounded-br-md w-full">
                    <ChevronDownIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export const SetupForm: React.FC<{
  onSave: (data: Omit<AppState, 'plan' | 'lastModified'>) => Promise<string | null>;
  onBackToCalendar?: () => void;
  initialState: AppState;
  onTeacherLoginClick: () => void;
}> = ({ onSave, onBackToCalendar, initialState, onTeacherLoginClick }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [startDate, setStartDate] = useState('');
  const [testDate, setTestDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [weeklyCapacity, setWeeklyCapacity] = useState<{ [key: number]: number }>({});
  const [timeGoalHours, setTimeGoalHours] = useState(20);
  const [maxSubjectsPerDay, setMaxSubjectsPerDay] = useState(0);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [testType, setTestType] = useState<TestType>('1学期期末テスト');
  const [personalGoal, setPersonalGoal] = useState('');
  const [planError, setPlanError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialState) {
        setSubjects(initialState.subjects);
        setStartDate(initialState.startDate);
        setTestDate(initialState.testDate);
        setTargetDate(initialState.targetDate);
        setWeeklyCapacity(initialState.weeklyCapacity);
        setTimeGoalHours(initialState.timeGoalHours);
        setTestType(initialState.testType);
        setPersonalGoal(initialState.personalGoal);
        setMaxSubjectsPerDay(initialState.maxSubjectsPerDay ?? 0);
    }
  }, [initialState]);


  const handleAddSubject = () => {
    if (newSubjectName.trim() && !subjects.find(s => s.name === newSubjectName.trim())) {
      setSubjects([
        ...subjects,
        {
          id: `s${Date.now()}`,
          name: newSubjectName.trim(),
          tasks: [{ id: `t${Date.now()}`, name: '課題', totalPages: 10 }],
        },
      ]);
      setNewSubjectName('');
    }
  };

  const handleRemoveSubject = (subjectId: string) => {
    setSubjects(subjects.filter(s => s.id !== subjectId));
  };

  const handleTaskChange = <K extends keyof Task>(subjectId: string, taskId: string, field: K, value: Task[K]) => {
    setSubjects(subjects.map(s => 
      s.id === subjectId 
        ? { ...s, tasks: s.tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t) }
        : s
    ));
  };

  const handleAddTask = (subjectId: string) => {
    setSubjects(subjects.map(s => 
      s.id === subjectId 
        ? { ...s, tasks: [...s.tasks, { id: `t${Date.now()}`, name: '新規課題', totalPages: 10 }] }
        : s
    ));
  };

  const handleRemoveTask = (subjectId: string, taskId: string) => {
    setSubjects(subjects.map(s => 
      s.id === subjectId
        ? { ...s, tasks: s.tasks.filter(t => t.id !== taskId) }
        : s
    ));
  };

  const handleTestDateChange = (newTestDate: string) => {
    setTestDate(newTestDate);
    const d = new Date(newTestDate);
    d.setDate(d.getDate() - 1);
    setTargetDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!initialState?.studentInfo) {
        console.error("Student info is missing.");
        alert("エラー：生徒情報が見つかりません。");
        return;
    }
    if (new Date(targetDate) > new Date(testDate) || new Date(startDate) > new Date(targetDate)) {
        alert("日付の設定が正しくありません。開始日 -> 目標完了日 -> テスト日の順になるようにしてください。");
        return;
    }
    
    setIsSaving(true);
    setPlanError(null);

    const error = await onSave({
      studentInfo: initialState.studentInfo,
      subjects: subjects.filter(s => s.tasks.some(t => t.totalPages > 0)),
      startDate,
      testDate,
      targetDate,
      weeklyCapacity,
      timeGoalHours,
      testType,
      personalGoal,
      maxSubjectsPerDay,
    });
    
    if (error) {
        setPlanError(error);
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 relative">
       <button 
        onClick={onTeacherLoginClick}
        className="absolute top-4 right-4 md:top-8 md:right-8 text-sm text-slate-500 hover:text-sky-600 hover:underline font-semibold z-10"
       >
         先生用
       </button>
      <div className="text-center mb-10">
        <h1 className="text-5xl md:text-6xl font-black text-sky-500 tracking-tight">Ise3 Smart Plan</h1>
        <p className="mt-2 text-lg text-slate-500 max-w-2xl mx-auto">
            {initialState?.studentInfo.name ? `${initialState.studentInfo.name}さんの計画を設定` : "計画の設定"}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <SectionHeader icon={<BookOpenIcon className="w-6 h-6"/>} title="1. 学習課題の入力" subtitle="テスト範囲の課題とページ数を入力してください。" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subjects.map(subject => (
              <div key={subject.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-sky-700">{subject.name}</h3>
                  <button type="button" onClick={() => handleRemoveSubject(subject.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2Icon className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {subject.tasks.map(task => (
                    <div key={task.id} className="flex items-center gap-2">
                      <input type="text" value={task.name} onChange={e => handleTaskChange(subject.id, task.id, 'name', e.target.value)} className="flex-grow p-2 bg-slate-100 border-slate-300 border text-slate-800 rounded-md shadow-sm placeholder:text-slate-400" />
                      <input type="number" value={task.totalPages} min="0" onChange={e => handleTaskChange(subject.id, task.id, 'totalPages', parseInt(e.target.value) || 0)} className="w-20 p-2 bg-slate-100 border-slate-300 border text-slate-800 rounded-md shadow-sm text-center" />
                      <span className="text-sm text-slate-500">p</span>
                      <button type="button" onClick={() => handleRemoveTask(subject.id, task.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                          <Trash2Icon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => handleAddTask(subject.id)} className="mt-3 text-sm text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1">
                  <PlusCircleIcon className="w-4 h-4" />
                  課題を追加
                </button>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <select
                value={newSubjectName}
                onChange={e => setNewSubjectName(e.target.value)}
                className="p-2 bg-slate-100 border-slate-300 border text-slate-800 rounded-md shadow-sm"
            >
                <option value="">教科を選択...</option>
                {DEFAULT_SUBJECTS.filter(ds => !subjects.some(s => s.name === ds)).map(sName => (
                    <option key={sName} value={sName}>{sName}</option>
                ))}
            </select>
            <button type="button" onClick={handleAddSubject} className="bg-sky-500 text-white font-bold py-2 px-4 rounded-md hover:bg-sky-600 transition-colors flex items-center gap-2">
              <PlusCircleIcon className="w-5 h-5" /> 教科を追加
            </button>
          </div>
        </Card>

        <Card>
          <SectionHeader icon={<CalendarIcon className="w-6 h-6"/>} title="2. 期間と目標の設定" subtitle="いつから始めて、いつまでに終わらせるかを決めましょう。" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">テストの種類</label>
              <select value={testType} onChange={e => setTestType(e.target.value as TestType)} className="w-full p-2 bg-slate-100 border-slate-300 border text-slate-800 rounded-md shadow-sm">
                {TEST_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">総学習時間の目標</label>
              <div className="flex items-center gap-2">
                  <CustomNumberInput value={timeGoalHours} onChange={setTimeGoalHours} min={0} />
                  <span className="text-slate-500">時間</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">１日の最大教科数</label>
              <select 
                value={maxSubjectsPerDay}
                onChange={e => setMaxSubjectsPerDay(Number(e.target.value))}
                className={`w-full p-2 bg-slate-100 border-slate-300 border text-slate-800 rounded-md shadow-sm transition-all ${planError ? 'border-red-500 border-2 ring-2 ring-red-300' : ''}`}
              >
                  <option value="0">設定なし</option>
                  <option value="1">1教科【推奨しない】</option>
                  <option value="2">2教科</option>
                  <option value="3">3教科</option>
                  <option value="4">4教科</option>
                  <option value="5">5教科</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">学習開始日</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 bg-slate-100 border-slate-300 border text-slate-800 rounded-md shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">課題完了目標日</label>
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="w-full p-2 bg-slate-100 border-slate-300 border text-slate-800 rounded-md shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">テスト当日</label>
              <input type="date" value={testDate} onChange={e => handleTestDateChange(e.target.value)} className="w-full p-2 bg-slate-100 border-slate-300 border text-slate-800 rounded-md shadow-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">テストの目標</label>
            <textarea
                value={personalGoal}
                onChange={e => setPersonalGoal(e.target.value)}
                className="w-full p-2 bg-slate-100 border-slate-300 border text-slate-800 rounded-md shadow-sm placeholder:text-slate-400"
                rows={3}
                placeholder="例: 5教科合計で450点以上取る！"
            />
          </div>
        </Card>

        <Card>
          <SectionHeader icon={<TargetIcon className="w-6 h-6"/>} title="3. 学習ペースの設定" subtitle="曜日ごとに勉強できる時間を設定します。" />
          <div className="grid grid-cols-7 gap-1 md:gap-3">
            {WEEK_DAYS.map(day => (
              <div key={day.id} className="text-center">
                <div className={`font-bold text-lg mb-2 ${
                  day.id === 6 ? 'text-blue-600' : day.id === 0 ? 'text-red-600' : 'text-slate-700'
                }`}>{day.name}</div>
                <select 
                  value={weeklyCapacity[day.id] ?? 0} 
                  onChange={e => setWeeklyCapacity({...weeklyCapacity, [day.id]: parseFloat(e.target.value)})} 
                  className="w-full appearance-none rounded-md border border-slate-300 bg-white p-1 sm:p-2 text-xs sm:text-sm text-center text-slate-800 shadow-sm focus:ring-sky-500 focus:border-sky-500 bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em] bg-[url('data:image/svg+xml,%3csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20fill=%22none%22%20viewBox=%220%200%2020%2020%22%3e%3cpath%20stroke=%22%2364748b%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20stroke-width=%221.5%22%20d=%22M6%208l4%204%204-4%22/%3e%3c/svg%3e')]"
                >
                  {STUDY_CAPACITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </Card>

        <div className="text-center pt-4 space-y-4">
          {planError && (
             <p className="text-red-600 bg-red-100 p-3 rounded-lg font-bold text-center">
                {planError}
             </p>
          )}
          <div className="flex justify-center items-center gap-4">
            {onBackToCalendar ? (
               <button type="button" onClick={onBackToCalendar} className="bg-slate-500 text-white font-bold py-3 px-10 rounded-full hover:bg-slate-600 transition-colors text-lg">
                  戻る
              </button>
            ) : <div className="w-40" style={{ flexBasis: '160px', flexShrink: 0 }}></div>}
            <button type="submit" disabled={isSaving} className="bg-sky-500 text-white font-extrabold py-3 px-10 rounded-full hover:bg-sky-600 transition-transform hover:scale-105 shadow-lg text-lg disabled:bg-slate-400 disabled:scale-100 flex items-center justify-center gap-2">
              {isSaving ? (
                <>
                  <LoaderIcon className="w-6 h-6 animate-spin"/>
                  作成中...
                </>
              ) : (
                initialState && initialState.plan.length > 0 ? '計画を更新する' : '学習プランを作成する！'
              )}
            </button>
             {onBackToCalendar ? <div className="w-40" style={{ flexBasis: '160px', flexShrink: 0 }}></div> : <div className="w-40" style={{ flexBasis: '160px', flexShrink: 0 }}></div>}
          </div>
        </div>
      </form>
    </div>
  );
};
