import React, { useMemo } from 'react';
import type { AppState, ProcessedClassmateData, StudentInfo } from '../types';

export const ClassDashboard: React.FC<{
    classmates: AppState[];
    currentUserInfo: StudentInfo;
    onBack: () => void;
    onTeacherLoginClick: () => void;
}> = ({ classmates, currentUserInfo, onBack, onTeacherLoginClick }) => {

    const processedData = useMemo((): ProcessedClassmateData[] => {
        return classmates.map(s => {
            const subjects = s.subjects || [];
            const plan = s.plan || [];

            const totalPages = subjects.reduce((sum, subj) => {
                const tasks = subj.tasks || [];
                return sum + tasks.reduce((tsum, task) => tsum + (task.totalPages || 0), 0)
            }, 0);
            
            const completedPages = plan.reduce((sum, day) => {
                const dayAssignments = day.assignments || [];
                const alphaAssignments = day.alphaAssignments || [];
                const dayCompleted = dayAssignments.reduce((dsum, assign) => dsum + (assign.completedPages || 0), 0);
                const alphaCompleted = alphaAssignments.reduce((dsum, assign) => dsum + (assign.completedPages || 0), 0);
                return sum + dayCompleted + alphaCompleted;
            }, 0);

            const totalStudyMinutes = plan.reduce((sum, day) => sum + ((day.studyTimeHours || 0) * 60) + (day.studyTimeMinutes || 0), 0);
            
            const todayStr = new Date().toISOString().split('T')[0];
            const missionClears = plan.filter(day => {
                const dayAssignments = day.assignments || [];
                return day.date < todayStr && 
                    day.studyCapacity > 0 && 
                    dayAssignments.every(a => (a.completedPages || 0) >= (a.pages || 0));
            }).length;

            return {
                id: `${s.studentInfo.grade}-${s.studentInfo.classNum}-${s.studentInfo.studentNum}`,
                studentNum: s.studentInfo.studentNum,
                isCurrentUser: s.studentInfo.studentNum === currentUserInfo.studentNum,
                totalStudyTime: totalStudyMinutes,
                progressPercentage: totalPages > 0 ? (completedPages / totalPages) * 100 : 0,
                missionClears,
            };
        }).sort((a, b) => a.studentNum - b.studentNum);
    }, [classmates, currentUserInfo]);

    const headerContent = (
        <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
                {classmates.length > 0 ? `${classmates[0].studentInfo.grade}年${classmates[0].studentInfo.classNum}組 の学習状況` : 'クラスの学習状況'}
            </h1>
            <button onClick={onBack} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors shadow">
                計画に戻る
            </button>
        </header>
    );

    if (!classmates.length) {
        return (
             <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
                {headerContent}
                <div className="text-center py-16 bg-white text-slate-800 rounded-2xl shadow-md">
                    <p className="text-slate-500">まだクラスの他の生徒のデータがありません。</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 relative bg-slate-50">
            <button 
                onClick={onTeacherLoginClick}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 text-sm text-slate-500 hover:text-sky-600 hover:underline font-semibold z-10"
            >
                先生用
            </button>
            <div className="max-w-7xl mx-auto">
                {headerContent}
                 <div className="bg-white text-slate-800 rounded-2xl shadow-lg overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                            <tr>
                                <th scope="col" className="px-6 py-3">番号</th>
                                <th scope="col" className="px-6 py-3">総学習時間</th>
                                <th scope="col" className="px-6 py-3">課題進捗率</th>
                                <th scope="col" className="px-6 py-3">ミッションクリア日数</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.map(student => (
                                <tr key={student.id} className={`border-b border-slate-200 ${student.isCurrentUser ? 'bg-sky-100 text-sky-800 font-bold' : 'bg-white hover:bg-slate-50'}`}>
                                    <td className="px-6 py-4">{student.studentNum}番</td>
                                    <td className="px-6 py-4">{(student.totalStudyTime / 60).toFixed(1)} 時間</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-full bg-slate-200 rounded-full h-2.5">
                                                <div className="bg-sky-500 h-2.5 rounded-full" style={{ width: `${student.progressPercentage}%` }}></div>
                                            </div>
                                            <span className="w-12 text-right">{student.progressPercentage.toFixed(0)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{student.missionClears} 日</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};