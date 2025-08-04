export type TestType = "1学期中間テスト" | "1学期期末テスト" | "2学期中間テスト" | "2学期期末テスト" | "3学期期末テスト";

export interface StudentInfo {
  grade: number;
  classNum: number;
  studentNum: number;
  name: string;
}

export interface Task {
  id: string;
  name: string;
  totalPages: number;
}

export interface Subject {
  id: string;
  name: string;
  tasks: Task[];
}

export interface DailyAssignment {
  taskId: string;
  pages: number;
  completedPages: number;
}

export interface StudyDay {
  date: string; // ISO string like '2024-07-29'
  dayOfWeek: string;
  isWeekend: boolean;
  studyCapacity: number; // 0, 0.5, 1
  assignments: DailyAssignment[];
  alphaAssignments: DailyAssignment[]; // For extra work
  studyTimeHours: number;
  studyTimeMinutes: number;
  targetStudyMinutes: number;
}

export interface AppState {
  studentInfo: StudentInfo;
  testType: TestType;
  personalGoal: string;
  subjects: Subject[];
  startDate: string;
  testDate: string;
  targetDate: string;
  weeklyCapacity: { [key: number]: number }; // 0:Sun, 1:Mon...
  timeGoalHours: number;
  maxSubjectsPerDay: number; // 0 for no limit
  plan: StudyDay[];
  lastModified: string; // ISO string
}

export interface ProcessedStudentData {
    id: string;
    grade: number;
    classNum: number;
    studentNum: number;
    name: string;
    lastUpdated: string;
    totalStudyTime: string;
    remainingPagesBySubject: { [key: string]: number };
}

export interface ProcessedClassmateData {
    id: string;
    studentNum: number;
    isCurrentUser: boolean;
    totalStudyTime: number;
    progressPercentage: number;
    missionClears: number;
}
