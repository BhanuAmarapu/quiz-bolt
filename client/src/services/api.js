import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: BASE_URL,
});

// Attach the auth token to every request automatically
api.interceptors.request.use((config) => {
    const saved = localStorage.getItem('quizbolt_user');
    if (saved) {
        const { token } = JSON.parse(saved);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Handle Token Refresh on 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/refresh')) {
            originalRequest._retry = true;
            try {
                const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {}, { withCredentials: true });
                const saved = JSON.parse(localStorage.getItem('quizbolt_user'));
                saved.token = data.token;
                localStorage.setItem('quizbolt_user', JSON.stringify(saved));

                api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
                return api(originalRequest);
            } catch (err) {
                localStorage.removeItem('quizbolt_user');
                window.location.href = '/login';
                return Promise.reject(err);
            }
        }
        return Promise.reject(error);
    }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginUser = (email, password) =>
    api.post('/api/auth/login', { email, password }, { withCredentials: true }).then(r => r.data);

export const registerUser = (name, email, password, role) =>
    api.post('/api/auth/register', { name, email, password, role }, { withCredentials: true }).then(r => r.data);

export const logoutUser = () =>
    api.post('/api/auth/logout', {}, { withCredentials: true }).then(() => {
        localStorage.removeItem('quizbolt_user');
    });

// ─── Quiz ────────────────────────────────────────────────────────────────────

export const getMyQuizzes = (parentId) =>
    api.get('/api/quiz/my-quizzes', { params: { parentId } }).then(r => r.data);

export const getQuizByCode = (roomCode) =>
    api.get(`/api/quiz/${roomCode}`).then(r => r.data);

export const createQuiz = (title, type, parentId, isPaid, price) =>
    api.post('/api/quiz', { title, type, parentId, isPaid, price }).then(r => r.data);

export const updateQuiz = (id, payload) =>
    api.put(`/api/quiz/${id}`, payload).then(r => r.data);

export const startQuizSession = (id) =>
    api.post(`/api/quiz/${id}/start`).then(r => r.data);

export const deleteQuiz = (id) =>
    api.delete(`/api/quiz/${id}`).then(r => r.data);

// ─── Questions ───────────────────────────────────────────────────────────────

export const addQuestion = (quizId, questionData) =>
    api.post(`/api/quiz/${quizId}/questions`, questionData).then(r => r.data);

export const updateQuestion = (quizId, questionId, questionData) =>
    api.put(`/api/quiz/${quizId}/questions/${questionId}`, questionData).then(r => r.data);

export const deleteQuestion = (quizId, questionId) =>
    api.delete(`/api/quiz/${quizId}/questions/${questionId}`).then(r => r.data);

// ─── Leaderboards & History ───────────────────────────────────────────────────

export const getQuizLeaderboard = (quizId) =>
    api.get(`/api/quiz/${quizId}/leaderboard`).then(r => r.data);

export const getSubjectLeaderboard = (subjectId) =>
    api.get(`/api/quiz/subject/${subjectId}/leaderboard`).then(r => r.data);

export const getUserHistory = () =>
    api.get('/api/quiz/user/history').then(r => r.data);

export const getOrganizerHistory = () =>
    api.get('/api/quiz/organizer/history').then(r => r.data);

// ─── Payments ────────────────────────────────────────────────────────────────

export const createPaymentOrder = (quizId, amount) =>
    api.post('/api/payment/create-order', { quizId, amount }).then(r => r.data);

export const verifyPayment = (orderId, paymentId, signature, quizId) =>
    api.post('/api/payment/verify', { orderId, paymentId, signature, quizId }).then(r => r.data);

export const getPaymentStatus = (quizId) =>
    api.get(`/api/payment/status/${quizId}`).then(r => r.data);

export const getBatchPaymentStatus = (quizIds) =>
    api.post('/api/payment/status/batch', { quizIds }).then(r => r.data);

export const getTotalRevenue = (quizIds) =>
    api.post('/api/payment/revenue/total', { quizIds }).then(r => r.data);

export const getRevenueByQuiz = (quizIds) =>
    api.post('/api/payment/revenue/by-quiz', { quizIds }).then(r => r.data);

export const getSocketUrl = () => BASE_URL;

export default api;
