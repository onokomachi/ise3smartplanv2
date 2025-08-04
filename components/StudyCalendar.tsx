import React, { useMemo, useState } from 'react';
import type { AppState, DailyAssignment, StudyDay, Task } from '../types';
import { PlusCircleIcon, RefreshCwIcon, Trash2Icon } from './icons';

const DailyProgressInput: React.FC<{
    assignment: DailyAssignment;
    task: Task | undefined;
    onUpdate: (completedPages: number) => void;
    onBlur: () => void;
}> = ({ assignment, task, onUpdate, onBlur }) => {
    if (!task) return null;

    const options = Array.from({ length: assignment.pages + 1 }, (_, i) => i);

    return (
        <div className="flex items-center justify-end">
            <select
                value={assignment.completedPages}
                onChange={(e) => onUpdate(parseInt(e.target.value))}
                onBlur={onBlur}
                className="w-16 appearance-none rounded-md border border-slate-300 bg-white p-2 text-sm text-center text-slate-800 shadow-sm bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em] bg-[url('data:image/svg+xml,%3csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20fill=%22none%22%20viewBox=%220%200%2020%2020%22%3e%3cpath%20stroke=%22%2364748b%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20stroke-width=%221.5%22%20d=%22M6%208l4%204%204-4%22/%3e%3c/svg%3e')]"
                aria-label={`${task.name} completed pages`}
            >
                {options.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <span className="text-xs text-slate-500 ml-1">/ {assignment.pages}p</span>
        </div>
    );
};

const AlphaAssignmentManager: React.FC<{
    day: StudyDay;
    dayIndex: number;
    allTasks: { id: string; name: string; subjectName: string }[];
    updateDay: (dayIndex: number, updatedDay: StudyDay) => void;
    triggerImmediateSave: () => void;
}> = ({ day, dayIndex, allTasks, updateDay, triggerImmediateSave }) => {
    const [selectedTask, setSelectedTask] = useState<string>(allTasks[0]?.id || '');
    const [pages, setPages] = useState<number>(1);

    const handleAdd = () => {
        if (!selectedTask || pages <= 0) return;
        const newAlphaAssignment: DailyAssignment = {
            taskId: selectedTask,
            pages: pages,
            completedPages: pages,
        };
        
        const updatedDay = {
            ...day,
            alphaAssignments: [...day.alphaAssignments, newAlphaAssignment]
        };
        updateDay(dayIndex, updatedDay);
        triggerImmediateSave();
        setPages(1);
    };

    const handleRemove = (alphaIndex: number) => {
        const updatedDay = {
            ...day,
            alphaAssignments: day.alphaAssignments.filter((_, i) => i !== alphaIndex)
        };
        updateDay(dayIndex, updatedDay);
        triggerImmediateSave();
    };

    const tasksById = useMemo(() => {
        const map = new Map<string, { name: string; subjectName: string }>();
        allTasks.forEach(t => map.set(t.id, t));
        return map;
    }, [allTasks]);


    return (
        <div className="space-y-2">
            <div className="space-y-2">
                {day.alphaAssignments.map((a, index) => {
                    const taskInfo = tasksById.get(a.taskId);
                    return (
                        <div key={index} className="flex items-center justify-between text-xs bg-sky-50 text-slate-800 p-1 rounded">
                            <span className="font-semibold text-sky-700">{taskInfo?.subjectName} - {taskInfo?.name}</span>
                            <div className="flex items-center">
                                <span className="text-slate-600">{a.completedPages}p</span>
                                <button onClick={() => handleRemove(index)} className="ml-2 text-red-400 hover:text-red-600" aria-label={`Remove ${taskInfo?.name || 'alpha assignment'}`}>
                                    <Trash2Icon className="w-3 h-3"/>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
             <div className="flex items-center gap-2 pt-1">
                <select 
                    value={selectedTask} 
                    onChange={e => setSelectedTask(e.target.value)}
                    onBlur={triggerImmediateSave}
                    className="flex-grow py-3 px-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1em_1em] bg-[url('data:image/svg+xml,%3csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20fill=%22none%22%20viewBox=%220%200%2020%2020%22%3e%3cpath%20stroke=%22%2364748b%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20stroke-width=%221.5%22%20d=%22M6%208l4%204%204-4%22/%3e%3c/svg%3e')]"
                >
                     {allTasks.length > 0 ? allTasks.map(t => (
                        <option key={t.id} value={t.id}>{t.subjectName} - {t.name}</option>
                    )) : <option disabled>課題がありません</option>}
                </select>
                <input 
                    type="number" 
                    min="1" 
                    value={pages} 
                    onChange={e => setPages(parseInt(e.target.value) || 1)}
                    onBlur={triggerImmediateSave}
                    className="w-20 py-3 px-2 text-sm bg-white border border-slate-300 rounded-md text-center"
                    disabled={allTasks.length === 0}
                />
                <button onClick={handleAdd} className="p-3 bg-sky-500 text-white rounded-md hover:bg-sky-600 flex-shrink-0 disabled:bg-slate-400" aria-label="Add alpha assignment" disabled={allTasks.length === 0}>
                    <PlusCircleIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};


export const StudyCalendar: React.FC<{
  state: AppState;
  updateDay: (dayIndex: number, updatedDay: StudyDay) => void;
  recalculatePlan: () => void;
  resetPlan: () => void;
  goToSettings: () => void;
  goToClassDashboard: () => void;
  onTeacherLoginClick: () => void;
  triggerImmediateSave: () => void;
}> = ({ state, updateDay, recalculatePlan, resetPlan, goToSettings, goToClassDashboard, onTeacherLoginClick, triggerImmediateSave }) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const tasksById = useMemo(() => {
    const map = new Map<string, Task>();
    state.subjects.forEach(s => s.tasks.forEach(t => map.set(t.id, t)));
    return map;
  }, [state.subjects]);
  
  const subjectsById = useMemo(() => {
    const map = new Map<string, string>();
     state.subjects.forEach(s => s.tasks.forEach(t => map.set(t.id, s.name)));
     return map;
  }, [state.subjects]);

  const allTasksForAlpha = useMemo(() => 
      state.subjects.flatMap(s => 
          s.tasks.map(t => ({ id: t.id, name: t.name, subjectName: s.name }))
      ), [state.subjects]);
  
  const missionStats = useMemo(() => {
    let totalMissionClears = 0;
    const dailyStreaks: { date: string, streak: number }[] = [];
    let runningStreak = 0;

    for (const day of state.plan) {
        if (day.date >= todayStr) {
            dailyStreaks.push({ date: day.date, streak: 0 });
            continue;
        }

        const isCleared = day.studyCapacity > 0 && day.assignments.every(a => a.completedPages >= a.pages);

        if (isCleared) {
            totalMissionClears++;
            runningStreak++;
        } else {
            runningStreak = 0;
        }
        dailyStreaks.push({ date: day.date, streak: runningStreak });
    }

    const todayIndex = state.plan.findIndex(d => d.date === todayStr);
    const currentActiveStreak = todayIndex > 0 ? dailyStreaks[todayIndex - 1]?.streak ?? 0 : 0;
    
    return { totalMissionClears, streaks: dailyStreaks, currentActiveStreak };
  }, [state.plan, todayStr]);

  const handleProgressUpdate = (dayIndex: number, assignmentIndex: number, completedPages: number) => {
    const dayToUpdate = state.plan[dayIndex];
    const newAssignments = [...dayToUpdate.assignments];
    newAssignments[assignmentIndex] = {...newAssignments[assignmentIndex], completedPages};
    updateDay(dayIndex, {...dayToUpdate, assignments: newAssignments});
  };
  
  const handleTimeUpdate = (dayIndex: number, part: 'hours' | 'minutes', value: number) => {
    const dayToUpdate = state.plan[dayIndex];
    const updatedDay = {...dayToUpdate};
    if(part === 'hours') updatedDay.studyTimeHours = value;
    else updatedDay.studyTimeMinutes = value;
    updateDay(dayIndex, updatedDay);
  };

  const totals = useMemo(() => {
    let totalPages = 0;
    let completedPages = 0;
    let totalTimeMinutes = 0;

    state.subjects.forEach(s => s.tasks.forEach(t => totalPages += t.totalPages));
    state.plan.forEach(day => {
        day.assignments.forEach(a => completedPages += a.completedPages);
        day.alphaAssignments.forEach(a => completedPages += a.completedPages);
        totalTimeMinutes += day.studyTimeHours * 60 + day.studyTimeMinutes;
    });

    const totalTimeGoalMinutes = state.timeGoalHours * 60;
    
    return {
        totalPages,
        completedPages,
        progressPercentage: totalPages > 0 ? (completedPages / totalPages) * 100 : 0,
        totalTimeMinutes,
        totalTimeGoalMinutes,
        timeProgressPercentage: totalTimeGoalMinutes > 0 ? (totalTimeMinutes / totalTimeGoalMinutes) * 100 : 0,
    };
  }, [state]);

  return (
    <div className="flex flex-col h-screen p-4 sm:p-6 lg:p-8 relative bg-slate-50">
      <div className="max-w-full mx-auto w-full flex flex-col flex-grow">
        <header className="mb-6 flex-shrink-0">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-sky-500 tracking-tight">
                    あなたのSmartPlan
                </h1>
                <p className="mt-1 text-slate-500 text-md">{state.testType} | 目標：{state.personalGoal || '未設定'}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <button onClick={goToClassDashboard} className="bg-amber-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-amber-600 transition-colors shadow">
                    クラスの状況
                </button>
                <button onClick={goToSettings} className="bg-slate-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors shadow">
                    設定に戻る
                </button>
                <button onClick={recalculatePlan} className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600 transition-colors shadow flex items-center gap-2">
                  <RefreshCwIcon className="w-5 h-5"/>
                  計画見直し
                </button>
                <button onClick={resetPlan} className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors shadow">
                  計画をリセット
                </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 flex-shrink-0">
            <div className="bg-white p-6 rounded-2xl shadow-md text-slate-800">
                <h3 className="font-bold text-lg text-slate-700 mb-2">課題の進捗</h3>
                <div className="w-full bg-slate-200 rounded-full h-4">
                    <div className="bg-sky-500 h-4 rounded-full transition-all duration-500" style={{width: `${totals.progressPercentage}%`}}></div>
                </div>
                <p className="text-right mt-2 font-semibold text-sky-600">{totals.completedPages} / {totals.totalPages} ページ完了</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-md text-slate-800">
                <h3 className="font-bold text-lg text-slate-700 mb-2">学習時間の進捗</h3>
                <div className="w-full bg-slate-200 rounded-full h-4">
                    <div className="bg-green-500 h-4 rounded-full transition-all duration-500" style={{width: `${totals.timeProgressPercentage}%`}}></div>
                </div>
                <p className="text-right mt-2 font-semibold text-green-600">
                    {(totals.totalTimeMinutes / 60).toFixed(1)} / {state.timeGoalHours} 時間達成
                </p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-md text-center text-slate-800">
                <h3 className="font-bold text-lg text-slate-700 mb-1">ミッションクリア</h3>
                <p className="text-5xl font-extrabold text-sky-500 tracking-tight">
                    Total {missionStats.totalMissionClears} day{missionStats.totalMissionClears !== 1 ? 's' : ''}
                </p>
                <p className="text-base font-medium text-slate-500 mt-1">
                    (連続 {missionStats.currentActiveStreak}日)
                </p>
            </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg flex-grow overflow-auto">
          <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0">
              <tr>
                <th scope="col" className="px-4 py-3 w-28 border-r border-b border-slate-200 bg-slate-100">日付</th>
                {state.subjects.map(s => <th key={s.id} scope="col" className="px-4 py-3 min-w-[180px] text-base font-bold text-center border-r border-b border-slate-200 bg-slate-100">{s.name}</th>)}
                <th scope="col" className="px-4 py-3 min-w-[250px] border-r border-b border-slate-200 bg-slate-100">+αの記録</th>
                <th scope="col" className="px-4 py-3 min-w-[200px] border-r border-b border-slate-200 bg-slate-100">今日の学習時間</th>
                <th scope="col" className="px-4 py-3 min-w-[150px] border-b border-slate-200 bg-slate-100">今日の目標</th>
              </tr>
            </thead>
            <tbody>
              {state.plan.map((day, dayIndex) => {
                const dayStreak = missionStats.streaks.find(s => s.date === day.date)?.streak ?? 0;
                const isDayCleared = day.date < todayStr && dayStreak > 0;

                const isToday = day.date === todayStr;
                const isPast = day.date < todayStr;
                const isTargetDate = day.date === state.targetDate;

                const rowBgClass = isToday ? 'bg-sky-50' : isPast ? 'bg-slate-100' : 'bg-white';
                
                return (
                  <tr key={day.date} className={`border-b border-slate-200 ${rowBgClass} transition-colors duration-300 ${isTargetDate ? 'border-l-4 border-l-red-500': ''}`}>
                    <td className={`px-4 py-4 font-medium w-28 border-r border-slate-200 ${rowBgClass} transition-colors duration-300 ${isToday ? 'text-sky-700 font-bold' : 'text-slate-900'}`}>
                      {day.date.substring(5).replace('-', '/')} 
                      <span className={`ml-1 ${day.isWeekend && !isToday ? 'text-red-500' : ''}`}>({day.dayOfWeek})</span>
                      {isToday && <div className="text-xs text-sky-600 font-bold mt-1">今日</div>}
                      {isTargetDate && !isToday && <div className="text-xs text-red-500 font-bold mt-1">目標日!</div>}
                    </td>
                    {state.subjects.map(subject => {
                      const assignmentsForSubject = day.assignments.filter(a => subjectsById.get(a.taskId) === subject.name);
                      return (
                        <td key={subject.id} className="px-4 py-4 border-r border-slate-200">
                          {assignmentsForSubject.length > 0 ? (
                            <div className="space-y-2">
                            {assignmentsForSubject.map((a, assignIdx) => {
                                const task = tasksById.get(a.taskId);
                                return (
                                    <div key={a.taskId + assignIdx} className="flex justify-between items-center w-full">
                                        <span className="text-slate-600 text-xs mr-2 w-24 truncate">{task?.name}</span>
                                        <DailyProgressInput 
                                            assignment={a} 
                                            task={task} 
                                            onUpdate={(val) => handleProgressUpdate(dayIndex, day.assignments.findIndex(da => da.taskId === a.taskId), val)}
                                            onBlur={triggerImmediateSave}
                                        />
                                    </div>
                                );
                            })}
                            </div>
                          ) : <span className="text-slate-400">-</span>}
                        </td>
                      )
                    })}
                     <td className="px-4 py-4 border-r border-slate-200">
                        <AlphaAssignmentManager 
                           day={day}
                           dayIndex={dayIndex}
                           allTasks={allTasksForAlpha}
                           updateDay={updateDay}
                           triggerImmediateSave={triggerImmediateSave}
                        />
                    </td>
                    <td className="px-4 py-4 border-r border-slate-200">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={day.studyTimeHours}
                          onChange={(e) => handleTimeUpdate(dayIndex, 'hours', parseInt(e.target.value) || 0)}
                          onBlur={triggerImmediateSave}
                          className="w-16 p-2 bg-white border border-slate-300 rounded-md shadow-sm text-center"
                          aria-label="Study hours"
                        />
                        <span className="text-slate-500 font-medium">時間</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          step="5"
                          value={day.studyTimeMinutes}
                          onChange={(e) => handleTimeUpdate(dayIndex, 'minutes', parseInt(e.target.value) || 0)}
                          onBlur={triggerImmediateSave}
                          className="w-16 p-2 bg-white border border-slate-300 rounded-md shadow-sm text-center"
                          aria-label="Study minutes"
                        />
                        <span className="text-slate-500 font-medium">分</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {isDayCleared ? (
                          <div className="text-center">
                            <div className="font-bold text-sky-600">Missionクリア!!</div>
                            <div className="text-xs text-sky-500">{dayStreak}日目</div>
                         </div>
                      ) : (
                        <div className="text-xs text-slate-500">
                          {(() => {
                              const goalMinutes = day.targetStudyMinutes || 0;
                              if (goalMinutes > 0) {
                                const hours = Math.floor(goalMinutes / 60);
                                const minutes = goalMinutes % 60;
                                const parts = [];
                                if (hours > 0) parts.push(`${hours}時間`);
                                if (minutes > 0) parts.push(`${minutes}分`);
                                return parts.join('');
                              } else {
                                return day.studyCapacity > 0 ? '目標達成！' : '休憩日';
                              }
                          })()}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
