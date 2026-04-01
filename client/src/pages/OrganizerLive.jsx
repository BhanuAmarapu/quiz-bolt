import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Play, Zap, Trophy, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { getMyQuizzes, startQuizSession as apiStartQuizSession } from '../services/api';

const Toast = ({ message, type, onClose }) => {
    if (!message) return null;
    const isError = type === 'error';
    return (
        <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className={`fixed top-4 left-1/2 z-[200] -translate-x-1/2 flex items-center gap-3 px-6 py-4 bg-white rounded-2xl font-bold shadow-xl border
                ${isError ? 'border-red-200 text-red-600' : 'border-green-200 text-green-600'}`}
        >
            {isError ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span>{message}</span>
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={16} /></button>
        </motion.div>
    );
};

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
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

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
            } catch (err) {
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

    if (view === 'loading') return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Initializing Room...</div>;

    if (view === 'results') {
        const topThree = leaderboard.slice(0, 3);
        const others = leaderboard.slice(3);

        return (
            <div className="p-8 max-w-6xl mx-auto space-y-12 animate-in fade-in zoom-in duration-700">
                <AnimatePresence>
                    {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                </AnimatePresence>
                
                <div className="text-center space-y-4">
                    <div className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold tracking-widest rounded-full border border-emerald-100 uppercase">Session Complete</div>
                    <h1 className="text-5xl font-black text-slate-900 uppercase">The Podium</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Final results for {activeQuiz?.title}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end pb-12">
                    {/* 2nd place */}
                    <div className="order-2 md:order-1 h-64 bg-white p-8 rounded-[2rem] shadow-sm flex flex-col items-center justify-end relative border-t-4 border-slate-300">
                        <div className="absolute -top-12 w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-3xl">2</div>
                        <p className="text-xl font-bold uppercase mb-2 truncate w-full text-center text-slate-900">{topThree[1]?.name || '—'}</p>
                        <p className="text-3xl font-black text-slate-700">{topThree[1]?.score || 0}</p>
                        <p className="text-xs font-bold uppercase text-slate-400">Points</p>
                    </div>

                    {/* 1st place */}
                    <div className="order-1 md:order-2 h-80 bg-gradient-to-t from-yellow-50 to-white p-8 rounded-[2rem] shadow-md flex flex-col items-center justify-end relative border-t-4 border-yellow-400 scale-105 z-10">
                        <Trophy className="absolute -top-16 text-yellow-500 w-32 h-32" />
                        <p className="text-2xl font-bold uppercase mb-2 truncate w-full text-center text-slate-900">{topThree[0]?.name || '—'}</p>
                        <p className="text-5xl font-black text-yellow-500">{topThree[0]?.score || 0}</p>
                        <p className="text-xs font-bold uppercase text-yellow-600/60">Points</p>
                    </div>

                    {/* 3rd place */}
                    <div className="order-3 h-52 bg-white p-8 rounded-[2rem] shadow-sm flex flex-col items-center justify-end relative border-t-4 border-amber-600">
                        <div className="absolute -top-12 w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-black text-2xl">3</div>
                        <p className="text-xl font-bold uppercase mb-2 truncate w-full text-center text-slate-900">{topThree[2]?.name || '—'}</p>
                        <p className="text-3xl font-black text-slate-700">{topThree[2]?.score || 0}</p>
                        <p className="text-xs font-bold uppercase text-slate-400">Points</p>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-gray-100">
                    <div className="p-8 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 uppercase text-sm">Full Standings</h3>
                        <span className="px-3 py-1 bg-white text-xs font-bold text-slate-500 uppercase rounded-full shadow-sm">{leaderboard.length} Participants</span>
                    </div>
                    <div className="max-h-[40vh] overflow-y-auto p-4 space-y-2">
                        {others.map((p, i) => (
                            <div key={p.name} className="flex justify-between items-center p-6 rounded-2xl hover:bg-gray-50 transition-all">
                                <div className="flex items-center gap-6">
                                    <span className="font-black text-slate-400 w-8 text-xl">#{i + 4}</span>
                                    <span className="font-bold text-xl uppercase tracking-tight text-slate-900">{p.name}</span>
                                </div>
                                <span className="text-2xl font-black text-indigo-600">{p.score}</span>
                            </div>
                        ))}
                        {others.length === 0 && (
                            <p className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest text-xs">No further participants...</p>
                        )}
                    </div>
                </div>

                <div className="flex justify-center pt-8">
                    <button
                        onClick={() => navigate('/organizer-dashboard')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-16 py-5 text-lg font-bold rounded-2xl transition-all"
                    >
                        Conclude Session
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'live') {
        return (
            <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
                <AnimatePresence>
                    {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                </AnimatePresence>

                <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900">LIVE SESSION</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Room Code // {activeQuiz.roomCode}</p>
                    </div>
                    <button onClick={() => navigate('/organizer-dashboard')} className="px-6 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all">
                        END FORCIBLY
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 font-black text-6xl text-slate-100">#{currentQuestion?.index + 1 || 1}</div>
                            <h2 className="text-xs font-bold text-indigo-600 uppercase mb-2">Current Question</h2>
                            <p className="text-3xl font-black text-slate-900 leading-tight">{currentQuestion?.text || 'Waiting for question...'}</p>

                            <div className="mt-8 space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase">
                                    <span className="text-slate-500">Time Remaining</span>
                                    <span className={timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-indigo-600'}>{timeLeft}s</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 transition-all duration-1000"
                                        style={{ width: `${(timeLeft / (currentQuestion?.timeLimit || 30)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Participants</p>
                                <p className="text-3xl font-black text-slate-900">{participants.length}</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Progress</p>
                                <p className="text-3xl font-black text-slate-900">{currentQuestion?.index + 1 || 0} / {activeQuiz.questions.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <Zap size={20} className="text-yellow-500 fill-yellow-500" /> TOP LEADERS
                        </h3>
                        <div className="space-y-3">
                            {leaderboard.map((player, i) => (
                                <div key={player.name || i} className="bg-white shadow-sm p-4 rounded-2xl flex justify-between items-center border-l-4 border-l-indigo-500 animate-in slide-in-from-right" style={{ animationDelay: `${i * 50}ms` }}>
                                    <div className="flex items-center gap-3">
                                        <span className="font-black text-slate-400">#{i + 1}</span>
                                        <span className="font-bold text-slate-900">{player.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-indigo-600 leading-none">{player.score}</p>
                                        <p className="text-xs text-slate-400 font-bold">{player.time?.toFixed(1)}s</p>
                                    </div>
                                </div>
                            ))}
                            {leaderboard.length === 0 && <p className="text-slate-400 font-bold text-center py-8 bg-gray-50 rounded-2xl">Tracking progress...</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'lobby') {
        const joinUrl = `${window.location.origin}/quiz/${activeQuiz.roomCode}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}&bgcolor=e0e7ff&color=4f46e5&margin=10`;

        return (
            <div className="p-8 max-w-6xl mx-auto space-y-12 animate-in fade-in zoom-in duration-500">
                <AnimatePresence>
                    {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                </AnimatePresence>
                
                <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold tracking-widest rounded-full uppercase animate-pulse">Live Lobby</span>
                            <h1 className="text-4xl font-black text-slate-900 uppercase">Control Room</h1>
                        </div>
                        <p className="text-slate-500 font-bold">Active: {activeQuiz.title}</p>
                    </div>
                    <div className="text-right flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Participant Count</p>
                            <div className="text-6xl font-black text-indigo-600 tabular-nums flex items-center justify-end gap-3">
                                {participants.length}
                                <div className="w-4 h-4 bg-green-500 rounded-full animate-ping opacity-50" />
                            </div>
                        </div>
                        <button onClick={() => navigate('/organizer-dashboard')} className="px-6 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all ml-4">
                            ABORT
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white shadow-sm p-10 rounded-[2.5rem] space-y-8 border border-gray-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[100px] -mr-32 -mt-32 transition-all" />

                            <div className="relative space-y-4">
                                <h2 className="text-3xl font-black flex items-center gap-4 text-slate-900"><Play className="text-indigo-600 fill-indigo-600" /> READY TO LAUNCH?</h2>
                                <p className="text-slate-500 text-lg leading-relaxed max-w-xl">
                                    Final check: {activeQuiz.questions?.length || 0} slides ready.
                                    Instruct your audience to scan the QR or use the session code below.
                                </p>
                            </div>

                            <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-200 group/code cursor-copy hover:border-indigo-300 transition-colors" onClick={() => {
                                navigator.clipboard.writeText(activeQuiz.roomCode);
                                showToast('Code copied!', 'success');
                            }}>
                                <div className="space-y-1 flex-1">
                                    <p className="text-xs font-bold text-slate-500 uppercase">Session Code</p>
                                    <p className="text-5xl font-black text-slate-900 group-hover/code:text-indigo-600 transition-colors uppercase tracking-widest">{activeQuiz.roomCode}</p>
                                </div>
                                <div className="h-12 w-px bg-gray-300" />
                                <div className="p-4 rounded-2xl bg-white shadow-sm">
                                    <div className="grid grid-cols-2 gap-1">
                                        {[1, 2, 3, 4].map(i => <div key={i} className="w-2 h-2 bg-indigo-200 rounded-full" />)}
                                    </div>
                                </div>
                            </div>

                            <button onClick={startQuizBroadcast} className="w-full py-6 text-xl font-black flex items-center justify-center gap-4 shadow-xl group/start bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all">
                                COMMENCE BATTLE <Zap className="group-hover:rotate-12 transition-transform" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white shadow-sm p-8 rounded-[2.5rem] flex flex-col items-center text-center space-y-6 border border-gray-100">
                            <p className="text-xs font-bold text-slate-500 uppercase">Scan to Join</p>
                            <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm relative group/qr overflow-hidden">
                                <img
                                    src={qrUrl}
                                    alt="Quiz QR Code"
                                    className="w-48 h-48 rounded-2xl relative z-10"
                                />
                                <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm z-20">
                                    <Zap className="text-indigo-600 animate-bounce" size={48} />
                                </div>
                            </div>
                            <div className="space-y-1 w-full bg-gray-50 p-3 rounded-xl border border-gray-100 overflow-hidden">
                                <p className="text-xs font-bold text-slate-500">Direct Entry Link</p>
                                <p className="text-[10px] font-bold text-slate-900 truncate w-full">{joinUrl}</p>
                            </div>
                        </div>

                        <div className="bg-white shadow-sm p-8 rounded-[2.5rem] flex-1 border border-gray-100">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                                <h3 className="text-sm font-black uppercase text-slate-900">The Vanguard ({participants.length})</h3>
                            </div>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                {participants.map((p, i) => (
                                    <motion.div
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        key={p._id || i}
                                        className="px-5 py-3 bg-gray-50 rounded-2xl font-bold text-sm flex items-center gap-3 text-slate-900"
                                    >
                                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                                        {p.name}
                                    </motion.div>
                                ))}
                                {participants.length === 0 && (
                                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center space-y-3">
                                        <div className="w-12 h-12 border-2 border-dashed border-slate-300 rounded-full animate-spin" />
                                        <p className="text-xs font-bold uppercase">Awaiting Warriors...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    return null;
};

export default OrganizerLive;
