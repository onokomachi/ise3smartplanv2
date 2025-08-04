import type { AppState, StudentInfo } from '../types';

const GAS_WEB_APP_URL: string = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

interface GasResponse {
  status: 'success' | 'error';
  data?: any;
  message?: string;
}

const IS_CLOUD_MODE = GAS_WEB_APP_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
const LOCAL_STORAGE_KEY_PREFIX = 'smartPlan-';

const getStudentKey = (studentInfo: StudentInfo) => 
  `${LOCAL_STORAGE_KEY_PREFIX}${studentInfo.grade}-${studentInfo.classNum}-${studentInfo.studentNum}`;

const saveDataLocal = (state: AppState): Promise<void> => {
    const key = getStudentKey(state.studentInfo);
    localStorage.setItem(key, JSON.stringify(state));
    return Promise.resolve();
};

const loadDataLocal = (studentInfo: StudentInfo): Promise<AppState | null> => {
    const key = getStudentKey(studentInfo);
    const data = localStorage.getItem(key);
    return Promise.resolve(data ? JSON.parse(data) : null);
};

const deleteDataLocal = (studentInfo: StudentInfo): Promise<void> => {
    const key = getStudentKey(studentInfo);
    localStorage.removeItem(key);
    return Promise.resolve();
};

const loadAllDataLocal = (): Promise<AppState[]> => {
    const allStates: AppState[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
            const data = localStorage.getItem(key);
            if (data) {
                allStates.push(JSON.parse(data));
            }
        }
    }
    return Promise.resolve(allStates);
};

const postToGas = async (action: string, payload: object): Promise<any> => {
  if (!IS_CLOUD_MODE) {
    // This is a fallback and shouldn't be hit if logic is correct
    // but useful for debugging if the URL isn't set.
    throw new Error("クラウドモードではありません。GAS_WEB_APP_URLが設定されているか確認してください。");
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors', // This is important for cross-origin requests
      headers: {
        'Content-Type': 'application/json', // Sending JSON
      },
      // Body needs to be a stringified JSON object
      body: JSON.stringify({ action, payload }),
      redirect: 'follow'
    });

    // It's good practice to check if the response is ok before parsing JSON
    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const result: GasResponse = await response.json();

    if (result.status === 'success') {
      return result.data;
    } else {
      console.error('GAS Error:', result.message);
      throw new Error(result.message || 'バックエンドでエラーが発生しました。');
    }
  } catch (error) {
    console.error('Fetch to GAS failed:', error);
    throw new Error('サーバーとの通信に失敗しました。インターネット接続を確認してください。');
  }
};

export const gasService = {
  saveData: (state: AppState): Promise<void> => {
    return IS_CLOUD_MODE ? postToGas('saveData', { state }) : saveDataLocal(state);
  },
  loadData: (studentInfo: StudentInfo): Promise<AppState | null> => {
    return IS_CLOUD_MODE ? postToGas('loadData', { studentInfo }) : loadDataLocal(studentInfo);
  },
  deleteData: (studentInfo: StudentInfo): Promise<void> => {
    return IS_CLOUD_MODE ? postToGas('deleteData', { studentInfo }) : deleteDataLocal(studentInfo);
  },
  loadAllData: (): Promise<AppState[]> => {
    return IS_CLOUD_MODE ? postToGas('loadAllData', {}) : loadAllDataLocal();
  },
};
