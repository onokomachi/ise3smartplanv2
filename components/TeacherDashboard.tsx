import React, { useState, useEffect, useMemo } from 'react';
import type { AppState, ProcessedStudentData } from '../types';
import { gasService } from '../services/gasService';
import { LoaderIcon, LogOutIcon } from './icons';
import { TEST_TYPES } from '../constants';


export const TeacherDashboard: React.FC<{ onLogout: () => void; }> = ({ onLogout }) => {
    const [students, setStudents] = useState<AppState[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [gradeFilter, setGradeFilter] = useState<string>('all');
    const [classFilter, setClassFilter] = useState<string>('all');
    const [testTypeFilter, setTestTypeFilter] = useState<string>(TEST_TYPES[0]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await gasService.loadAllData();
                setStudents(data);
            } catch (error) {
                console.error("Failed to load student data", error);
                alert(`生徒データの読み込みに失敗しました。${error instanceof Error ? error.message : ''}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);
    
    const processedStudents = useMemo((): ProcessedStudentData[] => {
        const filtered = students.filter(s => 
            (gradeFilter === 'all' || s.studentInfo.grade === Number(gradeFilter)) &&
            (classFilter === 'all' || s.studentInfo.classNum === Number(classFilter)) &&
            (s.testType === testTypeFilter)
        );

        const latestEntries = new Map<string, AppState>();
        for (const student of filtered) {
            const studentId = `${student.studentInfo.grade}-${student.studentInfo.classNum}-${student.studentInfo.studentNum}`;
            const existing = latestEntries.get(studentId);
            if (!existing || (student.lastModified && new Date(student.lastModified) > new Date(existing.lastModified))) {
                latestEntries.set(studentId, student);
            }
        }

        return Array.from(latestEntries.values())
            .sort((a, b) => 
                a.studentInfo.grade - b.studentInfo.grade ||
                a.studentInfo.classNum - b.studentInfo.classNum ||
                a.studentInfo.studentNum - b.studentInfo.studentNum
            )
            .map(s => {
                const remainingPagesBySubject: { [key: string]: number } = {};
                (s.subjects || []).forEach(subject => {
                    const totalPagesInSubject = (subject.tasks || []).reduce((sum, task) => sum + task.totalPages, 0);
                    const completedPagesInSubject = (s.plan || []).reduce((sum, day) => {
                       return sum + 
                        [...(day.assignments || []), ...(day.alphaAssignments || [])]
                            .filter(a => (subject.tasks || []).some(t => t.id === a.taskId))
                            .reduce((dsum, assign) => dsum + assign.completedPages, 0);
                    }, 0);

                    if (totalPagesInSubject > 0) {
                        const remaining = totalPagesInSubject - completedPagesInSubject;
                        remainingPagesBySubject[subject.name] = Math.max(0, remaining);
                    }
                });
                
                const totalStudyMinutes = (s.plan || []).reduce((sum, day) => sum + ((day.studyTimeHours || 0) * 60) + (day.studyTimeMinutes || 0), 0);
                
                return {
                    id: `${s.studentInfo.grade}-${s.studentInfo.classNum}-${s.studentInfo.studentNum}`,
                    grade: s.studentInfo.grade,
                    classNum: s.studentInfo.classNum,
                    studentNum: s.studentInfo.studentNum,
                    name: s.studentInfo.name,
                    lastUpdated: s.lastModified ? new Date(s.lastModified).toLocaleString('ja-JP') : 'N/A',
                    totalStudyTime: `${(totalStudyMinutes / 60).toFixed(1)}時間`,
                    remainingPagesBySubject,
                };
            });
    }, [students, gradeFilter, classFilter, testTypeFilter]);

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-slate-50">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
                        先生用管理ダッシュボード
                    </h1>
                     <button 
                        onClick={onLogout}
                        className="flex items-center gap-2 bg-slate-600 text-white font-semibold hover:bg-red-500 transition-colors py-2 px-4 rounded-lg"
                    >
                        <LogOutIcon className="w-5 h-5" />
                        ログアウト
                    </button>
                </header>

                <div className="bg-white text-slate-800 p-6 rounded-2xl shadow-md mb-8">
                    <h2 className="text-xl font-bold mb-4">フィルター</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">学年</label>
                            <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="w-full p-2 bg-slate-100 border-slate-300 border rounded-md text-slate-800">
                                <option value="all">全学年</option>
                                <option value="1">1年</option>
                                <option value="2">2年</option>
                                <option value="3">3年</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">組</label>
                            <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-full p-2 bg-slate-100 border-slate-300 border rounded-md text-slate-800">
                                <option value="all">全クラス</option>
                                {[1,2,3,4,5,6].map(c => <option key={c} value={c}>{c}組</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">テストの種類</label>
                            <select value={testTypeFilter} onChange={e => setTestTypeFilter(e.target.value)} className="w-full p-2 bg-slate-100 border-slate-300 border rounded-md text-slate-800">
                                {TEST_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-white text-slate-800 rounded-2xl shadow-lg overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                            <tr>
                                <th scope="col" className="px-6 py-3">学年</th>
                                <th scope="col" className="px-6 py-3">組</th>
                                <th scope="col" className="px-6 py-3">番号</th>
                                <th scope="col" className="px-6 py-3">氏名</th>
                                <th scope="col" className="px-6 py-3">最終更新日</th>
                                <th scope="col" className="px-6 py-3">総学習時間</th>
                                <th scope="col" className="px-6 py-3 min-w-[200px]">残りページ数 (教科別)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="text-center p-8">
                                        <div className="flex justify-center items-center gap-2 text-slate-500">
                                            <LoaderIcon className="w-6 h-6 animate-spin" />
                                            <span>生徒のデータを読み込んでいます...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : processedStudents.length > 0 ? (
                                processedStudents.map(student => (
                                    <tr key={student.id} className="bg-white border-b hover:bg-slate-50">
                                        <td className="px-6 py-4">{student.grade}</td>
                                        <td className="px-6 py-4">{student.classNum}</td>
                                        <td className="px-6 py-4">{student.studentNum}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{student.name}</td>
                                        <td className="px-6 py-4">{student.lastUpdated}</td>
                                        <td className="px-6 py-4">{student.totalStudyTime}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                {Object.entries(student.remainingPagesBySubject).map(([subject, pages]) => (
                                                    <span key={subject} className="text-xs">
                                                        <span className="font-semibold">{subject}:</span> {pages}p
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center p-8 text-slate-500">
                                        表示するデータがありません。
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
