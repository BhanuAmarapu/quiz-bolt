import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api, {
    getMyQuizzes,
    startQuizSession as apiStartQuizSession,
} from '../services/api';
import Toast from '../components/common/Toast';
import useToast from '../hooks/useToast';
import LiveLoading from '../components/organizerLive/LiveLoading';
import LiveLobby from '../components/organizerLive/LiveLobby';
import LiveView from '../components/organizerLive/LiveView';
import LiveResult from '../components/organizerLive/LiveResult';
import LaunchChooser from '../components/organizerLive/LaunchChooser';

const OrganizerLive = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const socket = useSocket();
    const { user } = useAuth();

    const [activeQuiz, setActiveQuiz] = useState(location.state?.quiz || null);
    // view: 'loading' | 'chooser' | 'lobby' | 'live' | 'results'
    const [view, setView] = useState('loading');
    const [participants, setParticipants] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [expiry, setExpiry] = useState(null);
    // sessionCode is the live room code generated per-session (separate from template roomCode)
    const [sessionCode, setSessionCode] = useState(null);
    const { toast, showToast, clearToast } = useToast();

    // ─── Initial load ────────────────────────────────────────────────────────
    const initSession = useCallback(async () => {
        try {
            let quiz = activeQuiz;
            if (!quiz) {
                const quizzes = await getMyQuizzes('none');
                quiz = quizzes.find(q => q._id === id);
                if (!quiz) throw new Error('Quiz not found');
                setActiveQuiz(quiz);
            }

            // If already ongoing → drop straight into live lobby
            if (quiz.status === 'ongoing') {
                setView('lobby');
                return;
            }

            // Scheduled in future → show lobby (permanent QR + countdown)
            if (quiz.scheduledAt && new Date(quiz.scheduledAt) > new Date()) {
                setView('lobby');
                return;
            }

            // Otherwise let host pick: instant or schedule
            setView('chooser');
        } catch {
            showToast('Failed to load quiz');
            navigate('/organizer-dashboard');
        }
    }, [activeQuiz, id, navigate, showToast]);

    useEffect(() => {
        if (view === 'loading') initSession();
    }, [view, initSession]);

    // ─── Socket hooks ─────────────────────────────────────────────────────────
    useEffect(() => {
        if ((view === 'lobby' || view === 'live') && socket && activeQuiz) {
            socket.emit('join_room', { roomCode: activeQuiz.roomCode }); // user identity from JWT

            socket.on('room_state', (state) => {
                if (state.participants) setParticipants(state.participants);
                if (state.leaderboard) setLeaderboard(state.leaderboard);
                if (state.currentQuestion) setCurrentQuestion(state.currentQuestion);
                if (state.timeLeft) setTimeLeft(state.timeLeft);
                if (state.expiry) setExpiry(state.expiry);
            });

            socket.on('participants_update', setParticipants);
            socket.on('new_question', (q) => {
                setCurrentQuestion(q);
                setTimeLeft(q.timeLimit);
                if (q.expiry) setExpiry(q.expiry);
            });
            socket.on('timer_tick', setTimeLeft);
            socket.on('update_leaderboard', setLeaderboard);
            socket.on('quiz_finished', () => {
                showToast('Quiz complete! Great session.', 'success');
                setView('results');
            });

            return () => {
                socket.off('room_state');
                socket.off('participants_update');
                socket.off('new_question');
                socket.off('timer_tick');
                socket.off('update_leaderboard');
                socket.off('quiz_finished');
            };
        }
    }, [view, socket, activeQuiz, user, showToast]);

    // ─── Client-side timer sync ───────────────────────────────────────────────
    useEffect(() => {
        if (!expiry || view !== 'live') return;
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining === 0) clearInterval(interval);
        }, 500);
        return () => clearInterval(interval);
    }, [expiry, view]);

    // ─── Actions ──────────────────────────────────────────────────────────────
    const handleGoLiveNow = async () => {
        try {
            const freshQuiz = await apiStartQuizSession(activeQuiz._id);
            // freshQuiz has sessionCode returned from the backend
            const liveCode = freshQuiz.sessionCode || freshQuiz.roomCode;
            setSessionCode(liveCode);
            // Provide an enriched quiz so lobby shows the live code for QR/copy
            setActiveQuiz({ ...freshQuiz, roomCode: liveCode });
            setView('lobby');
        } catch {
            showToast('Failed to start session');
        }
    };

    const handleSchedule = async (scheduledAt) => {
        try {
            const updated = await api.post(`/quiz/${activeQuiz._id}/schedule`, { scheduledAt }).then(r => r.data);
            setActiveQuiz(updated);
            setView('lobby');
            showToast('Quiz scheduled! Permanent link is ready.', 'success');
        } catch (err) {
            showToast(err?.response?.data?.message || 'Failed to schedule quiz');
        }
    };

    const startQuizBroadcast = () => {
        const code = sessionCode || activeQuiz?.roomCode;
        if (!socket || !code) return;
        socket.emit('start_quiz', { roomCode: code });
        setView('live');
    };

    const handleAbort = async () => {
        try {
            if (activeQuiz) {
                await api.post(`/quiz/${activeQuiz._id}/abort`, { sessionCode });
            }
        } catch {
            // best-effort — still navigate away
        } finally {
            navigate('/organizer-dashboard');
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    if (view === 'loading') return <LiveLoading />;

    if (view === 'results') {
        return (
            <>
                <AnimatePresence>
                    {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
                </AnimatePresence>
                <LiveResult
                    activeQuiz={activeQuiz}
                    leaderboard={leaderboard}
                    navigate={navigate}
                    sessionCode={sessionCode}
                />
            </>
        );
    }

    if (view === 'live') {
        return (
            <>
                <AnimatePresence>
                    {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
                </AnimatePresence>
                <LiveView
                    activeQuiz={activeQuiz}
                    currentQuestion={currentQuestion}
                    timeLeft={timeLeft}
                    participants={participants}
                    leaderboard={leaderboard}
                    navigate={navigate}
                    onAbort={handleAbort}
                />
            </>
        );
    }

    if (view === 'lobby') {
        return (
            <>
                <AnimatePresence>
                    {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
                </AnimatePresence>
                <LiveLobby
                    activeQuiz={activeQuiz}
                    participants={participants}
                    navigate={navigate}
                    startQuizBroadcast={startQuizBroadcast}
                    showToast={showToast}
                    onAbort={handleAbort}
                />
            </>
        );
    }

    if (view === 'chooser') {
        return (
            <>
                <AnimatePresence>
                    {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
                </AnimatePresence>
                <LaunchChooser
                    activeQuiz={activeQuiz}
                    navigate={navigate}
                    onGoLiveNow={handleGoLiveNow}
                    onSchedule={handleSchedule}
                    showToast={showToast}
                />
            </>
        );
    }

    return null;
};

export default OrganizerLive;
