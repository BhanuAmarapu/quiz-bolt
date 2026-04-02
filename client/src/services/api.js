import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const readStoredUser = () => {
    try {
        const raw = localStorage.getItem('quizbolt_user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        localStorage.removeItem('quizbolt_user');
        return null;
    }
};

const api = axios.create({
    baseURL: BASE_URL,
});

// Attach the auth token to every request automatically
api.interceptors.request.use((config) => {
    const saved = readStoredUser();
    if (saved?.token) {
        config.headers.Authorization = `Bearer ${saved.token}`;
    }

    if (!config.headers) {
        config.headers = {};
    }

    return config;
});

// Handle Token Refresh on 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error?.config;
        if (!originalRequest) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
            originalRequest._retry = true;
            try {
                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
                const saved = readStoredUser();
                if (!saved) {
                    return Promise.reject(error);
                }

                const updated = { ...saved, token: data.token };
                localStorage.setItem('quizbolt_user', JSON.stringify(updated));

                api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
                return api(originalRequest);
            } catch (err) {
                localStorage.removeItem('quizbolt_user');
                return Promise.reject(err);
            }
        }
        return Promise.reject(error);
    }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginUser = (email, password) =>
    api.post('/auth/login', { email, password }, { withCredentials: true }).then(r => r.data);

export const registerUser = (name, email, password, role) =>
    api.post('/auth/register', { name, email, password, role }, { withCredentials: true }).then(r => r.data);

export const logoutUser = () =>
    api.post('/auth/logout', {}, { withCredentials: true }).then(() => {
        localStorage.removeItem('quizbolt_user');
    });

export const getMyProfile = () =>
    api.get('/auth/me').then(r => r.data);

export const updateMyProfile = (payload) =>
    api.put('/auth/me', payload).then(r => r.data);

// ─── Quiz ────────────────────────────────────────────────────────────────────

export const getMyQuizzes = (parentId) =>
    api.get('/quiz/my-quizzes', { params: { parentId } }).then(r => r.data);

export const getQuizByCode = (roomCode) =>
    api.get(`/quiz/${roomCode}`).then(r => r.data);

export const createQuiz = (title, type, parentId, isPaid, price) =>
    api.post('/quiz', { title, type, parentId, isPaid, price }).then(r => r.data);

export const updateQuiz = (id, payload) =>
    api.put(`/quiz/${id}`, payload).then(r => r.data);

export const startQuizSession = (id) =>
    api.post(`/quiz/${id}/start`).then(r => r.data);

export const scheduleQuiz = (id, scheduledAt) =>
    api.post(`/quiz/${id}/schedule`, { scheduledAt }).then(r => r.data);

export const deleteQuiz = (id) =>
    api.delete(`/quiz/${id}`).then(r => r.data);

// Participant: register for a scheduled session
export const joinScheduledSession = (roomCode) =>
    api.post(`/quiz/join-scheduled/${roomCode}`).then(r => r.data);

// Participant: get all scheduled sessions joined
export const getMyScheduledJoins = () =>
    api.get('/quiz/user/scheduled-joins').then(r => r.data);

// ─── Questions ───────────────────────────────────────────────────────────────

export const addQuestion = (quizId, questionData) =>
    api.post(`/quiz/${quizId}/questions`, questionData).then(r => r.data);

export const updateQuestion = (quizId, questionId, questionData) =>
    api.put(`/quiz/${quizId}/questions/${questionId}`, questionData).then(r => r.data);

export const deleteQuestion = (quizId, questionId) =>
    api.delete(`/quiz/${quizId}/questions/${questionId}`).then(r => r.data);

// ─── Leaderboards & History ───────────────────────────────────────────────────

export const getQuizLeaderboard = (quizId) =>
    api.get(`/quiz/${quizId}/leaderboard`).then(r => r.data);

export const getSubjectLeaderboard = (subjectId) =>
    api.get(`/quiz/subject/${subjectId}/leaderboard`).then(r => r.data);

export const getUserHistory = () =>
    api.get('/quiz/user/history').then(r => r.data);

export const getOrganizerHistory = () =>
    api.get('/quiz/organizer/history').then(r => r.data);

// ─── Payments ────────────────────────────────────────────────────────────────

export const createPaymentOrder = (quizId, amount) =>
    api.post('/payment/create-order', { quizId, amount }).then(r => r.data);

export const verifyPayment = (orderId, paymentId, signature, quizId) =>
    api.post('/payment/verify', { orderId, paymentId, signature, quizId }).then(r => r.data);

export const getPaymentStatus = (quizId) =>
    api.get(`/payment/status/${quizId}`).then(r => r.data);

export const getBatchPaymentStatus = (quizIds) =>
    api.post('/payment/status/batch', { quizIds }).then(r => r.data);

export const getTotalRevenue = (quizIds) =>
    api.post('/payment/revenue/total', { quizIds }).then(r => r.data);

export const getRevenueByQuiz = (quizIds) =>
    api.post('/payment/revenue/by-quiz', { quizIds }).then(r => r.data);

export const getSocketUrl = () => (BASE_URL.startsWith('http') ? BASE_URL : window.location.origin);

export default api;
