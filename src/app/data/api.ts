import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/api';
const ML_BACKEND_URL = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Add a request interceptor to include the token in all requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const authApi = {
    login: (credentials: any) => api.post('/auth/login', credentials),
};

export const studentApi = {
    getAll: (params?: any) => api.get('/students', { params }),
    getOne: (id: string) => api.get(`/students/${id}`),
};

export const classScheduleApi = {
    getAll: (params?: any) => api.get('/class-schedules', { params }),
};

// ────────────────────────────────────────────────────
// ML Backend calls (Python FastAPI on port 8000)
// ────────────────────────────────────────────────────
const mlApi = axios.create({ baseURL: ML_BACKEND_URL });

export const faceApi = {
    /** Send a base64 image to the Python backend; get back a 128-d embedding */
    embed: (image_b64: string) =>
        mlApi.post<{ embedding: number[] }>('/embed', { image_b64 }),

    /** Identify a student from a live frame (Python backend does cosine search) */
    recognize: (image_b64: string, node_token: string) =>
        mlApi.post<{ identified: boolean; student_id: string | null; similarity: number | null; message: string }>(
            '/recognize', { image_b64, node_token }
        ),

    /** Save one or more embeddings to the Node backend for a student */
    saveEmbeddings: (mongoId: string, embeddings: number[][]) =>
        api.put(`/students/${mongoId}/embeddings`, { embeddings }),

    /** Health check for the Python backend */
    health: () => mlApi.get('/health'),

    /** Anti-spoofing liveness check — call before recognize when toggle is on */
    liveness: (image_b64: string) =>
        mlApi.post<{ is_live: boolean; confidence: number; label: string }>(
            '/liveness', { image_b64 }
        ),
};

export const attendanceApi = {
    /** Run the full enrollment + payment check. Returns access decision without saving. */
    check: (studentId: string, classScheduleId: string) =>
        api.post('/attendance/check', { studentId, classScheduleId }),

    /** Save an attendance record (call only after access is granted). */
    mark: (studentId: string, classId: string, classScheduleId: string) =>
        api.post('/attendance/mark', {
            studentId,
            classId,
            classScheduleId,
            status: 'present',
            method: 'face',
        }),
};

export const scoreApi = {
    /** Fetch all scores for a student grouped by subject, sorted grade+term asc. */
    getByStudent: (studentMongoId: string) =>
        api.get<{
            success: boolean;
            data: Record<string, { id: string; grade: number; term: number; marks: number }[]>;
        }>(`/scores/student/${studentMongoId}`),
};

export const predictApi = {
    /** Send 9 term marks [G9T1‥G11T3] → predicted O/L score + grade letter. */
    predict: (features: number[]) =>
        mlApi.post<{ predicted_score: number; grade: string }>('/predict', { features }),
};

export default api;
