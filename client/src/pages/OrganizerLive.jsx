import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { getMyQuizzes, startQuizSession as apiStartQuizSession } from '../services/api';
import Toast from '../components/common/Toast';
import useToast from '../hooks/useToast';
import LiveLoading from '../components/organizerLive/LiveLoading';
import LiveLobby from '../components/organizerLive/LiveLobby';
import LiveView from '../components/organizerLive/LiveView';
import LiveResult from '../components/organizerLive/LiveResult';

const OrganizerLive = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const socket = useSocket();
    const { user } = useAuth();

    const [activeQuiz, setActiveQuiz] = useState(location.state?.quiz || null);
    const [view, setView] = useState('loading'); // loading, lobby, live, results
    const [participants, setParticipants] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [expiry, setExpiry] = useState(null);
    const { toast, showToast, clearToast } = useToast();

    // Initial setup: start session and move to lobby
    useEffect(() => {
        const initSession = async () => {
            try {
                let quiz = activeQuiz;
                if (!quiz) {
                    const quizzes = await getMyQuizzes();
                    quiz = quizzes.find(q => q._id === id);
                    if (!quiz) throw new Error('Quiz not found');
                }
                
                // If it isn't ongoing yet, start it. Note: you might want backend to handle starting safely if already started
                const freshQuiz = await apiStartQuizSession(quiz._id);
                setActiveQuiz(freshQuiz);
                setView('lobby');
            } catch {
                showToast('Failed to initialize session');
                navigate('/organizer-dashboard');
            }
        };

        if (view === 'loading') {
            initSession();
        }
    }, [activeQuiz, id, view, navigate, showToast]);

    // Socket hooks
    useEffect(() => {
        if ((view === 'lobby' || view === 'live') && socket && activeQuiz) {
            socket.emit('join_room', { roomCode: activeQuiz.roomCode, user });

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

    // Sync local timer with server expiry
    useEffect(() => {
        if (!expiry || view !== 'live') return;
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining === 0) clearInterval(interval);
        }, 500);
        return () => clearInterval(interval);
    }, [expiry, view]);

    const startQuizBroadcast = () => {
        if (!socket || !activeQuiz) return;
        socket.emit('start_quiz', { roomCode: activeQuiz.roomCode });
        setView('live');
    };

    if (view === 'loading') return <LiveLoading />;

    if (view === 'results') {
        return (
            <>
                <AnimatePresence>
                    {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
                </AnimatePresence>
                <LiveResult activeQuiz={activeQuiz} leaderboard={leaderboard} navigate={navigate} />
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
                />
            </>
        );
    }
    
    return null;
};

export default OrganizerLive;
