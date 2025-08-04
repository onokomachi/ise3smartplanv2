import React, { useState, useCallback, useEffect, useRef } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { SetupForm } from './components/SetupForm';
import { StudyCalendar } from './components/StudyCalendar';
import { LoadingScreen } from './components/LoadingScreen';
import { TeacherDashboard } from './components/TeacherDashboard';
import { ClassDashboard } from './components/ClassDashboard';
import { TeacherLoginModal } from './components/TeacherLoginModal';
import { gasService } from './services/gasService';
import type { AppState, StudentInfo, StudyDay, Subject, Task } from './types';

// --- Helper Components & Functions ---

const LAST_USER_STORAGE_KEY = 'smartPlan-lastUser';

const ResetConfirmationModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; }> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={onClose}>
        <div className="bg-white text-slate-800 rounded-2xl shadow-2xl p-8 m-4 max-w-md w-full transform transition-all animate-in fade-in-0 zoom-in-95 text-center" onClick={e => e.stopPropagation()}>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">計画をリセット</h2>
          <p className="text-slate-600 mb-8">
            本当によろしいですか？<br/>
            現在の生徒のすべての課題、進捗、学習時間の記録が削除されます。
          </p>
          <div className="flex justify-center gap-4">
            <button onClick={onClose} className="py-2 px-8 rounded-lg bg-slate-200 text-slate-800 font-semibold hover:bg-slate-300 transition-colors">
              いいえ
            </button>
            <button onClick={onConfirm} className="py-2 px-8 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors">
              はい、リセットします
            </button>
          </div>
        </div>
      </div>
    );
  };
  
const getDates = (startDate: string, endDate: string): Date[] => {
    const dates = [];
    let currentDate = new Date(startDate + 'T00:00:00');
    const stopDate = new Date(endDate + 'T00:00:00');
    while (currentDate <= stopDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
};

const calculatePlan = (
    baseState: Omit<AppState, 'plan' | 'lastModified'>,
    existingPlan: StudyDay[] = [],
    options: { subtractPastProgress: boolean } = { subtractPastProgress: true }
): StudyDay[] | { error: string } => {
    
    const REALISTIC_PAGE_CAP_PER_SUBJECT = 15;
    const CHUNK_ATTEMPTS = [1, 2, 3, 4];
    let lastError = "計画を作成できません。不明なエラーです。";

    const todayStr = new Date().toISOString().split('T')[0];
    const allDates = getDates(baseState.startDate, baseState.testDate);

    const totalPagesByTask: { [taskId: string]: number } = {};
    baseState.subjects.forEach(s => s.tasks.forEach(t => totalPagesByTask[t.id] = t.totalPages));

    const completedPagesByTask: { [taskId: string]: number } = {};
    if (options.subtractPastProgress) {
        existingPlan.filter(d => d.date < todayStr).forEach(day => {
            [...(day.assignments || []), ...(day.alphaAssignments || [])].forEach(a => {
                completedPagesByTask[a.taskId] = (completedPagesByTask[a.taskId] || 0) + a.completedPages;
            });
        });
    }

    const taskToSubjectMap = new Map<string, string>();
    baseState.subjects.forEach(s => s.tasks.forEach(t => taskToSubjectMap.set(t.id, s.id)));

    const initialPlanTemplate = allDates.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        const existingDay = existingPlan.find(d => d.date === dateStr);
        const dayOfWeekIndex = date.getDay();
        const studyCapacity = baseState.weeklyCapacity[dayOfWeekIndex] ?? 0;

        if (dateStr < todayStr && existingDay) return { ...existingDay, studyCapacity };
        
        return {
            date: dateStr, dayOfWeek: date.toLocaleDateString('ja-JP', { weekday: 'short' }),
            isWeekend: dayOfWeekIndex === 0 || dayOfWeekIndex === 6, studyCapacity,
            assignments: [], alphaAssignments: [], studyTimeHours: 0, studyTimeMinutes: 0, targetStudyMinutes: 0
        };
    });

    const futureStudyDaysForAssignment = initialPlanTemplate.filter(d =>
        d.date >= todayStr && d.date <= baseState.targetDate && d.studyCapacity > 0
    );
    
    const totalRemainingPages = Object.keys(totalPagesByTask).reduce((sum, taskId) => {
        return sum + (totalPagesByTask[taskId] - (completedPagesByTask[taskId] || 0));
    }, 0);
    
    if (totalRemainingPages > 0 && futureStudyDaysForAssignment.length === 0) {
        return { error: "計画を作成できません。残りの課題を割り振れる学習日がありません。学習期間を長くするか、休業日の設定を見直してください。" };
    }

    for (const chunkSize of CHUNK_ATTEMPTS) {
        const newPlan = JSON.parse(JSON.stringify(initialPlanTemplate));
        
        const taskQueue: { taskId: string, pages: number }[] = [];
        baseState.subjects.forEach(s => {
            s.tasks.forEach(t => {
                let remaining = totalPagesByTask[t.id] - (completedPagesByTask[t.id] || 0);
                if (remaining <= 0) return;
                while (remaining > 0) {
                    const pagesToAssign = Math.min(remaining, chunkSize);
                    taskQueue.push({ taskId: t.id, pages: pagesToAssign });
                    remaining -= pagesToAssign;
                }
            });
        });

        taskQueue.sort((a, b) => totalPagesByTask[a.taskId] - totalPagesByTask[b.taskId]);

        const assignmentsByDay: { [date: string]: { tasks: { [taskId: string]: number }, subjectIds: Set<string> } } = {};
        newPlan.forEach((d: StudyDay) => {
            assignmentsByDay[d.date] = { tasks: {}, subjectIds: new Set() };
        });

        const unplacedChunks: { taskId: string, pages: number }[] = [];
        for (const chunk of taskQueue) {
            let placed = false;
            let bestDay: StudyDay | null = null;
            let minTotalPages = Infinity;

            for (const day of futureStudyDaysForAssignment) {
                const dayData = assignmentsByDay[day.date];
                const subjectId = taskToSubjectMap.get(chunk.taskId)!;
                
                const canTakeSubject = baseState.maxSubjectsPerDay === 0 || dayData.subjectIds.has(subjectId) || dayData.subjectIds.size < baseState.maxSubjectsPerDay;
                if (!canTakeSubject) continue;

                const currentPagesForTask = dayData.tasks[chunk.taskId] || 0;
                if (currentPagesForTask + chunk.pages > REALISTIC_PAGE_CAP_PER_SUBJECT) continue;
                
                const totalPagesOnDay = Object.values(dayData.tasks).reduce((s: number, p: number) => s + p, 0);
                if (totalPagesOnDay < minTotalPages) {
                    minTotalPages = totalPagesOnDay;
                    bestDay = day;
                }
            }

            if (bestDay) {
                const dayData = assignmentsByDay[bestDay.date];
                const subjectId = taskToSubjectMap.get(chunk.taskId)!;
                if (!dayData.tasks[chunk.taskId]) dayData.tasks[chunk.taskId] = 0;
                dayData.tasks[chunk.taskId] += chunk.pages;
                dayData.subjectIds.add(subjectId);
                placed = true;
            }

            if (!placed) {
                unplacedChunks.push(chunk);
            }
        }

        if (unplacedChunks.length === 0) {
            newPlan.forEach((day: StudyDay) => {
                if (assignmentsByDay[day.date]) {
                    const dailyAssignmentsRaw = assignmentsByDay[day.date].tasks;
                    day.assignments = Object.keys(dailyAssignmentsRaw).map(taskId => ({
                        taskId, pages: dailyAssignmentsRaw[taskId], completedPages: 0
                    }));
                }
            });

            const totalTimeGoalMinutes = baseState.timeGoalHours * 60;
            const totalTimeStudiedMinutes = newPlan.filter((day: StudyDay) => day.date < todayStr)
                .reduce((sum: number, day: StudyDay) => sum + (day.studyTimeHours * 60) + day.studyTimeMinutes, 0);
            
            const remainingTimeGoalMinutes = Math.max(0, totalTimeGoalMinutes - totalTimeStudiedMinutes);
            const futureStudyDaysForTime = newPlan.filter((d: StudyDay) => d.date >= todayStr && d.date <= baseState.targetDate && d.studyCapacity > 0);
            const totalFutureCapacityUnits = futureStudyDaysForTime.reduce((sum: number, d: StudyDay) => sum + d.studyCapacity, 0);
            const timePerCapacityUnit = totalFutureCapacityUnits > 0 ? remainingTimeGoalMinutes / totalFutureCapacityUnits : 0;
            
            newPlan.forEach((day: StudyDay) => {
                if (day.date >= todayStr && day.date <= baseState.targetDate) {
                    day.targetStudyMinutes = Math.round(timePerCapacityUnit * day.studyCapacity);
                } else {
                    day.targetStudyMinutes = 0;
                }
            });

            return newPlan;
        }
        
        const failedTaskId = unplacedChunks[0].taskId;
        const failedTask = baseState.subjects.flatMap(s => s.tasks).find(t => t.id === failedTaskId);
        const failedSubject = baseState.subjects.find(s => s.tasks.some(t => t.id === failedTaskId));
        const taskName = failedTask?.name || '不明な課題';
        const subjectName = failedSubject?.name || '不明な教科';
        lastError = `計画を作成できません。「${subjectName} - ${taskName}」の割り振りに失敗しました。1日の最大教科数の設定が厳しいか、学習期間が短い可能性があります。`;
    }

    return { error: lastError };
};


const createNewState = (studentInfo: StudentInfo): AppState => {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    
    const testDate = new Date();
    testDate.setDate(today.getDate() + 14);
    const testDateStr = testDate.toISOString().split('T')[0];

    const targetDate = new Date();
    targetDate.setDate(testDate.getDate() - 1);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    return {
        studentInfo,
        subjects: [
            { id: 's1', name: '国語', tasks: [{ id: 't1', name: 'ワーク', totalPages: 20 }] },
            { id: 's2', name: '数学', tasks: [{ id: 't2', name: '問題集', totalPages: 30 }] },
            { id: 's3', name: '理科', tasks: [{ id: 't3', name: 'ワーク', totalPages: 10 }] },
            { id: 's4', name: '社会', tasks: [{ id: 't4', name: 'ワーク', totalPages: 10 }] },
            { id: 's5', name: '英語', tasks: [{ id: 't5', name: 'ワーク', totalPages: 10 }] },
        ],
        plan: [],
        testType: '1学期期末テスト',
        personalGoal: 'がんばる！',
        startDate: startDate,
        testDate: testDateStr,
        targetDate: targetDateStr,
        weeklyCapacity: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0.5, 0: 0 },
        timeGoalHours: 20,
        maxSubjectsPerDay: 0,
        lastModified: new Date().toISOString()
    };
};

// --- Main App Component ---

export default function App() {
  const [view, setView] = useState<'login' | 'setup' | 'calendar' | 'loading' | 'teacherDashboard' | 'classDashboard'>('loading');
  const [loadingMessage, setLoadingMessage] = useState('読み込み中...');
  const [appState, setAppState] = useState<AppState | null>(null);
  const [tempSetupState, setTempSetupState] = useState<AppState | null>(null);
  const [classmates, setClassmates] = useState<AppState[]>([]);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isTeacherLoginOpen, setIsTeacherLoginOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const debounceTimer = useRef<number | null>(null);

  const saveData = useCallback(async (stateToSave: AppState) => {
    if (!stateToSave) return;
    try {
        const stateWithTimestamp = { ...stateToSave, lastModified: new Date().toISOString() };
        await gasService.saveData(stateWithTimestamp);
        setIsDirty(false);
    } catch (e) {
        console.error("Background save failed:", e);
    }
  }, []);

  const debouncedSave = useCallback((newState: AppState) => {
    if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(() => {
        saveData(newState);
    }, 10000);
  }, [saveData]);
  
  const immediateSave = useCallback(() => {
    if (isDirty && appState) {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
            debounceTimer.current = null;
        }
        saveData(appState);
    }
  }, [isDirty, appState, saveData]);

  const handleLogin = useCallback(async (studentInfo: StudentInfo) => {
    setView('loading');
    setLoadingMessage('データを読み込んでいます...');
    try {
      const savedState = await gasService.loadData(studentInfo);
      if (savedState) {
        const result = calculatePlan(savedState, savedState.plan);
        if ('error' in result) {
            console.warn("Could not recalculate plan on login, showing potentially stale plan:", result.error);
            setAppState(savedState);
        } else {
            const newState = { ...savedState, plan: result };
            if (JSON.stringify(savedState.plan) !== JSON.stringify(result)) {
                saveData(newState);
            }
            setAppState(newState);
        }
        setView('calendar');
      } else {
        const newState = createNewState(studentInfo);
        const result = calculatePlan(newState, [])
        if ('error' in result) {
          alert(`初期計画の作成に失敗: ${result.error}`);
          setAppState(newState);
        } else {
          setAppState({ ...newState, plan: result });
        }
        setView('setup');
      }
      localStorage.setItem(LAST_USER_STORAGE_KEY, JSON.stringify(studentInfo));
    } catch (e) {
      console.error("Login failed", e);
      alert(`データの読み込みに失敗しました。 ${e instanceof Error ? e.message : ''}`);
      localStorage.removeItem(LAST_USER_STORAGE_KEY);
      setView('login');
    } finally {
        setIsDirty(false);
    }
  }, [saveData]);

  useEffect(() => {
    const lastUserJson = localStorage.getItem(LAST_USER_STORAGE_KEY);
    if (lastUserJson) {
      try {
        const lastUser = JSON.parse(lastUserJson);
        handleLogin(lastUser);
      } catch (e) {
        console.error("Failed to parse last user from localStorage, clearing.", e);
        localStorage.removeItem(LAST_USER_STORAGE_KEY);
        setView('login');
      }
    } else {
      setView('login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        immediateSave();
      }
    };
    
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', immediateSave);
    
    return () => {
        window.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', immediateSave);
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
    };
  }, [immediateSave]);


  const handleSaveSetup = useCallback(async (setupData: Omit<AppState, 'plan' | 'lastModified'>): Promise<string | null> => {
    const completedPagesByTask: { [taskId: string]: number } = {};
    if (appState && appState.plan) {
        appState.plan.forEach(day => {
            [...(day.assignments || []), ...(day.alphaAssignments || [])].forEach(a => {
                completedPagesByTask[a.taskId] = (completedPagesByTask[a.taskId] || 0) + a.completedPages;
            });
        });
    }

    const newStateBase = JSON.parse(JSON.stringify(setupData));
    newStateBase.subjects.forEach((subject: Subject) => {
        subject.tasks.forEach((task: Task) => {
            const completed = completedPagesByTask[task.id] || 0;
            task.totalPages = (task.totalPages || 0) + completed;
        });
    });
    
    const result = calculatePlan(newStateBase, appState?.plan || []);
    
    if (result && 'error' in result) {
        return result.error;
    }
    
    setView('loading');
    setLoadingMessage('計画を更新しています...');
    
    try {
      const plan = result as StudyDay[];
      const newState: AppState = { ...newStateBase, plan, lastModified: new Date().toISOString() };
      await gasService.saveData(newState);
      setAppState(newState);
      setTempSetupState(null);
      setView('calendar');
      setIsDirty(false);
      return null;
    } catch (e) {
      console.error("Failed to save setup", e);
      alert(`計画の保存に失敗しました。 ${e instanceof Error ? e.message : ''}`);
      setView('setup');
      return `計画の保存に失敗しました。`;
    }
  }, [appState]);

  const updateDayInPlan = useCallback((dayIndex: number, updatedDay: StudyDay) => {
    if (!appState) return;
    const newPlan = [...appState.plan];
    newPlan[dayIndex] = updatedDay;
    const newState = { ...appState, plan: newPlan };
    setAppState(newState);
    setIsDirty(true);
    debouncedSave(newState);
  }, [appState, debouncedSave]);

  const handleRecalculatePlan = useCallback(() => {
    if (!appState) return;
    const result = calculatePlan(appState, appState.plan);
    if ('error' in result) {
        alert(`計画の見直しに失敗しました: ${result.error}`);
        return;
    }
    const newState = { ...appState, plan: result };
    setAppState(newState);
    saveData(newState);
  }, [appState, saveData]);

  const handleResetRequest = () => setIsResetModalOpen(true);

  const handleConfirmReset = useCallback(async () => {
    if (appState) {
        setView('loading');
        setLoadingMessage('データをリセットしています...');
        try {
            await gasService.deleteData(appState.studentInfo);
            const newState = createNewState(appState.studentInfo);
            const result = calculatePlan(newState, []);
            if ('error' in result) {
              alert(`リセット後の計画作成に失敗: ${result.error}`);
              setAppState(newState);
            } else {
              setAppState({ ...newState, plan: result });
            }
            setView('setup');
        } catch(e) {
            console.error("Failed to reset data", e);
            alert(`リセットに失敗しました。 ${e instanceof Error ? e.message : ''}`);
            setView('calendar');
        }
    }
    setIsResetModalOpen(false);
  }, [appState]);
  
  const handleGoToSettings = () => {
    immediateSave();
    if (!appState) {
        setView('login');
        return;
    }

    const completedPagesByTask: { [taskId: string]: number } = {};
    appState.plan.forEach(day => {
        [...(day.assignments || []), ...(day.alphaAssignments || [])].forEach(a => {
            completedPagesByTask[a.taskId] = (completedPagesByTask[a.taskId] || 0) + a.completedPages;
        });
    });

    const tempStateForSetup = JSON.parse(JSON.stringify(appState));
    tempStateForSetup.subjects.forEach((subject: Subject) => {
        subject.tasks.forEach((task: Task) => {
            const completed = completedPagesByTask[task.id] || 0;
            task.totalPages = Math.max(0, task.totalPages - completed);
        });
    });

    setTempSetupState(tempStateForSetup);
    setView('setup');
};

  
  const handleTeacherLogin = (password: string) => {
    if (password === '215124') {
        setIsTeacherLoginOpen(false);
        setView('teacherDashboard');
    } else {
        alert('パスワードが違います。');
    }
  };
  
  const handleTeacherLogout = () => {
    setAppState(null);
    setClassmates([]);
    localStorage.removeItem(LAST_USER_STORAGE_KEY);
    setView('login');
  };
  
  const handleGoToClassDashboard = useCallback(async () => {
    immediateSave();
    if (!appState) return;
    setView('loading');
    setLoadingMessage('クラスの状況を読み込み中...');
    try {
      const allData = await gasService.loadAllData();
      
      const classData = allData.filter(
        data => data && data.studentInfo &&
                data.studentInfo.grade === appState.studentInfo.grade &&
                data.studentInfo.classNum === appState.studentInfo.classNum &&
                data.testType === appState.testType
      );

      const latestEntries = new Map<string, AppState>();
        for (const studentData of classData) {
        const studentId = `${studentData.studentInfo.grade}-${studentData.studentInfo.classNum}-${studentData.studentInfo.studentNum}`;
        const existing = latestEntries.get(studentId);
        if (!existing || (studentData.lastModified && new Date(studentData.lastModified || 0) > new Date(existing.lastModified || 0))) {
            latestEntries.set(studentId, studentData);
        }
      }
      const myClassmates = Array.from(latestEntries.values());

      setClassmates(myClassmates);
      setView('classDashboard');
    } catch (e) {
      console.error("Failed to load class data", e);
      alert(`クラスの状況の読み込みに失敗しました。 ${e instanceof Error ? e.message : ''}`);
      setView('calendar');
    }
  }, [appState, immediateSave]);

  const renderContent = () => {
    const onTeacherLoginClick = () => setIsTeacherLoginOpen(true);

    switch (view) {
      case 'loading':
        return <LoadingScreen message={loadingMessage} />;
      case 'login':
        return <LoginScreen onLogin={handleLogin} onTeacherLoginClick={onTeacherLoginClick} />;
      case 'setup':
        if (!appState?.studentInfo && !tempSetupState?.studentInfo) {
            setView('login');
            return null;
        }
        return <SetupForm 
                    onSave={handleSaveSetup} 
                    initialState={tempSetupState || appState!} 
                    onBackToCalendar={appState?.plan.length ?? 0 > 0 ? () => { setTempSetupState(null); setView('calendar'); } : undefined} 
                    onTeacherLoginClick={onTeacherLoginClick}
                />;
      case 'calendar':
        if (!appState) {
          setView('login');
          return null;
        }
        return (
          <StudyCalendar 
            state={appState} 
            updateDay={updateDayInPlan} 
            recalculatePlan={handleRecalculatePlan}
            resetPlan={handleResetRequest} 
            goToSettings={handleGoToSettings}
            goToClassDashboard={handleGoToClassDashboard}
            onTeacherLoginClick={onTeacherLoginClick}
            triggerImmediateSave={immediateSave}
          />
        );
      case 'teacherDashboard':
        return <TeacherDashboard onLogout={handleTeacherLogout} />;
      case 'classDashboard':
          if (!appState) {
              setView('login');
              return null;
          }
          return (
              <ClassDashboard 
                classmates={classmates} 
                currentUserInfo={appState.studentInfo} 
                onBack={() => setView('calendar')} 
                onTeacherLoginClick={onTeacherLoginClick}
              />
          );
      default:
        return <LoginScreen onLogin={handleLogin} onTeacherLoginClick={onTeacherLoginClick} />;
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <main>
        {renderContent()}
      </main>
      <ResetConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleConfirmReset}
      />
      <TeacherLoginModal
        isOpen={isTeacherLoginOpen}
        onClose={() => setIsTeacherLoginOpen(false)}
        onLogin={handleTeacherLogin}
      />
    </div>
  );
}