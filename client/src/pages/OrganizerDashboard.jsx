/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Play, Trash2, X, Check, Zap, Folder, ChevronLeft, Trophy, AlertCircle, CheckCircle2, Pencil } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
    getMyQuizzes,
    createQuiz as apiCreateQuiz,
    deleteQuiz as apiDeleteQuiz,
    addQuestion as apiAddQuestion,
    deleteQuestion as apiDeleteQuestion,
    updateQuestion as apiUpdateQuestion,
    getQuizLeaderboard,
    getSubjectLeaderboard,
    startQuizSession as apiStartQuizSession,
} from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Inline Toast Notification ────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => {
    if (!message) return null;
    const isError = type === 'error';
    return (
        <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className={`fixed top-4 left-1/2 z-[200] -translate-x-1/2 flex items-center gap-3 px-6 py-4 backdrop-blur-xl rounded-2xl font-bold shadow-xl border
                ${isError ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-green-500/20 border-green-500/40 text-green-300'}`}
        >
            {isError ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span>{message}</span>
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={16} /></button>
        </motion.div>
    );
};

// ─── Confirm Dialog ────────────────────────────────────────────────────────────
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-dark/70 backdrop-blur-sm">
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass p-8 rounded-3xl max-w-sm w-full mx-4 space-y-6 border-red-500/20"
        >
            <div className="flex items-start gap-4">
                <div className="p-3 bg-red-500/20 rounded-2xl">
                    <Trash2 className="text-red-400" size={24} />
                </div>
                <div>
                    <h3 className="font-black text-lg tracking-tight">Confirm Delete</h3>
                    <p className="text-slate-400 text-sm mt-1">{message}</p>
                </div>
            </div>
            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 py-3 glass-dark rounded-xl text-sm font-bold hover:bg-white/10 transition-all border-white/5"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-sm font-bold transition-all border border-red-500/30"
                >
                    Delete
                </button>
            </div>
        </motion.div>
    </div>
);

const OrganizerDashboard = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newQuizTitle, setNewQuizTitle] = useState('');
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [view, setView] = useState('list');
    const [participants, setParticipants] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);

    // Hierarchical Management
    const [currentSubject, setCurrentSubject] = useState(null);
    const [quizType, setQuizType] = useState('quiz');
    const [subjectLeaderboard, setSubjectLeaderboard] = useState([]);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [leaderboardMeta, setLeaderboardMeta] = useState({ title: '', sub: '', accent: 'secondary' });

    // UI state
    const [toast, setToast] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [showNewSlideModal, setShowNewSlideModal] = useState(false);
    const [expiry, setExpiry] = useState(null);

    const handleGoLive = async (quiz) => {
        try {
            const freshQuiz = await apiStartQuizSession(quiz._id);
            setActiveQuiz(freshQuiz);
            setQuizzes(prev => prev.map(q => q._id === freshQuiz._id ? freshQuiz : q));
            setView('lobby');
        } catch (err) {
            console.error('[Session Error]', err);
            showToast('Failed to start session');
        }
    };

    // Inline rename state
    const [editingQuizId, setEditingQuizId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');

    const socket = useSocket();
    const { user } = useAuth();

    // Question form state
    const [qText, setQText] = useState('');
    const [qOptions, setQOptions] = useState(['', '', '', '']);
    const [qAnswer, setQAnswer] = useState('');
    const [qTime, setQTime] = useState(10);

    // Payment / monetization state
    const [isPaid, setIsPaid] = useState(false);
    const [quizPrice, setQuizPrice] = useState('');

    const showToast = useCallback((message, type = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const showConfirm = (message, onConfirm) => {
        setConfirmDialog({ message, onConfirm });
    };

    const fetchQuizzes = useCallback(async () => {
        try {
            const parentId = currentSubject ? currentSubject._id : 'none';
            const data = await getMyQuizzes(parentId);
            setQuizzes(data);
        } catch {
            showToast('Failed to load quizzes');
        }
    }, [currentSubject, showToast]);

    useEffect(() => {
        fetchQuizzes();
    }, [fetchQuizzes]);

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

    useEffect(() => {
        if (socket && currentSubject && user) {
            socket.emit('join_room', { roomCode: `subject_${currentSubject._id}`, user });
            socket.on('subject_score_update', (data) => {
                setSubjectLeaderboard(data);
                // If the leaderboard modal is open, also update it live
                if (isLeaderboardOpen) setSubjectLeaderboard(data);
            });
            return () => socket.off('subject_score_update');
        }
    }, [socket, currentSubject, user, isLeaderboardOpen]);

    const openLeaderboard = async (fetchFn, title, sub, accent) => {
        try {
            const data = await fetchFn();
            setSubjectLeaderboard(data);
            setLeaderboardMeta({ title, sub, accent });
            setIsLeaderboardOpen(true);
        } catch {
            showToast('Failed to fetch leaderboard');
        }
    };

    const handleFetchSubjectLeaderboard = (subject = currentSubject) => {
        if (!subject) return;
        openLeaderboard(
            () => getSubjectLeaderboard(subject._id),
            'SUBJECT MASTERY',
            'Global Subject Standings',
            'secondary'
        );
    };

    const handleRenameQuiz = async (quizId) => {
        if (!editingTitle.trim()) {
            setEditingQuizId(null);
            return;
        }
        try {
            const updated = await apiUpdateQuiz(quizId, { title: editingTitle.trim() });
            setQuizzes(prev => prev.map(q => q._id === updated._id ? updated : q));
            if (activeQuiz && activeQuiz._id === updated._id) setActiveQuiz(updated);
            showToast('Title updated!', 'success');
        } catch {
            showToast('Failed to rename');
        } finally {
            setEditingQuizId(null);
            setEditingTitle('');
        }
    };

    const handleFetchQuizLeaderboard = (quiz) => {
        openLeaderboard(
            () => getQuizLeaderboard(quiz._id),
            quiz.title.toUpperCase(),
            'Quiz Rush Standings',
            'primary'
        );
    };

    const createQuiz = async () => {
        if (!newQuizTitle.trim()) {
            showToast('Please enter a title');
            return;
        }
        try {
            const data = await apiCreateQuiz(
                newQuizTitle.trim(),
                quizType,
                currentSubject ? currentSubject._id : null,
                isPaid,
                isPaid ? Number(quizPrice) || 0 : 0
            );
            setQuizzes(prev => [data, ...prev]);
            setNewQuizTitle('');
            setShowCreate(false);
            setIsPaid(false);
            setQuizPrice('');
            if (data.type === 'quiz') {
                setActiveQuiz(data);
                setView('edit');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to create project';
            showToast(msg);
        }
    };

    const handleDeleteQuiz = (quizId) => {
        showConfirm('All data for this project will be permanently wiped. This cannot be undone.', async () => {
            setConfirmDialog(null);
            try {
                await apiDeleteQuiz(quizId);
                setQuizzes(prev => prev.filter(q => q._id !== quizId));
                showToast('Project deleted', 'success');
            } catch {
                showToast('Failed to delete project');
            }
        });
    };

    const addQuestion = async () => {
        if (!qText.trim() || qOptions.some(o => !o.trim()) || !qAnswer) {
            showToast('Please fill all fields before adding a question');
            return;
        }
        try {
            const correctOption = qOptions.indexOf(qAnswer);
            const data = await apiAddQuestion(activeQuiz._id, {
                text: qText,
                options: qOptions,
                correctOption,
                timeLimit: qTime
            });
            setActiveQuiz(data);
            setQuizzes(prev => prev.map(q => q._id === data._id ? data : q));
            setQText('');
            setQOptions(['', '', '', '']);
            setQAnswer('');
            showToast('Question added!', 'success');
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to add question';
            showToast(msg);
        }
    };

    const handleDeleteQuestion = (qId) => {
        if (!qId) {
            showToast('Cannot identify slide to delete');
            return;
        }
        showConfirm('Delete this slide permanently?', async () => {
            try {
                const data = await apiDeleteQuestion(activeQuiz._id, qId);
                setActiveQuiz(data);
                setQuizzes(prev => prev.map(q => q._id === data._id ? data : q));
                if (activeQuestionIndex >= data.questions.length) {
                    setActiveQuestionIndex(Math.max(0, data.questions.length - 1));
                }
                showToast('Slide removed successfully', 'success');
            } catch (err) {
                showToast(err.response?.data?.message || 'Failed to delete slide');
            } finally {
                setConfirmDialog(null);
            }
        });
    };

    const startQuizBroadcast = () => {
        socket.emit('start_quiz', { roomCode: activeQuiz.roomCode });
        setView('live');
    };

    // ─── Results View ─────────────────────────────────────────────────────────
    if (view === 'results') {
        const topThree = leaderboard.slice(0, 3);
        const others = leaderboard.slice(3);

        return (
            <div className="p-8 max-w-6xl mx-auto space-y-12 animate-in fade-in zoom-in duration-700">
                <div className="text-center space-y-4">
                    <div className="inline-block px-4 py-1.5 bg-green-500/20 text-green-400 text-[10px] font-black tracking-widest rounded-full border border-green-500/20 uppercase">Session Complete</div>
                    <h1 className="text-7xl font-black italic tracking-tighter text-gradient uppercase">THE PODIUM</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Final results for {activeQuiz?.title}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end pb-12">
                    {/* 2nd place */}
                    <div className="order-2 md:order-1 h-64 glass p-8 rounded-[2.5rem] flex flex-col items-center justify-end relative border-slate-300/20">
                        <div className="absolute -top-12 w-24 h-24 rounded-full bg-slate-300/20 flex items-center justify-center text-slate-300 font-black text-3xl italic">2</div>
                        <p className="text-xl font-black italic uppercase mb-2 truncate w-full text-center">{topThree[1]?.name || '—'}</p>
                        <p className="text-3xl font-black text-white">{topThree[1]?.score || 0}</p>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Points</p>
                    </div>

                    {/* 1st place */}
                    <div className="order-1 md:order-2 h-80 glass p-8 rounded-[2.5rem] flex flex-col items-center justify-end relative border-yellow-400/50 bg-yellow-400/5 scale-110 shadow-2xl shadow-yellow-400/10">
                        <Trophy className="absolute -top-16 text-yellow-400 w-32 h-32 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                        <p className="text-2xl font-black italic uppercase mb-2 truncate w-full text-center">{topThree[0]?.name || '—'}</p>
                        <p className="text-5xl font-black text-yellow-400">{topThree[0]?.score || 0}</p>
                        <p className="text-[10px] font-black uppercase text-yellow-400/60 tracking-widest">Points</p>
                    </div>

                    {/* 3rd place */}
                    <div className="order-3 h-52 glass p-8 rounded-[2.5rem] flex flex-col items-center justify-end relative border-amber-600/20">
                        <div className="absolute -top-12 w-20 h-20 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-600 font-black text-2xl italic">3</div>
                        <p className="text-xl font-black italic uppercase mb-2 truncate w-full text-center">{topThree[2]?.name || '—'}</p>
                        <p className="text-3xl font-black text-white">{topThree[2]?.score || 0}</p>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Points</p>
                    </div>
                </div>

                <div className="glass rounded-[3rem] overflow-hidden border-white/5">
                    <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <h3 className="font-black italic tracking-widest uppercase text-sm">Full Standings</h3>
                        <span className="px-3 py-1 bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-full">{leaderboard.length} Participants</span>
                    </div>
                    <div className="max-h-[40vh] overflow-y-auto p-4 space-y-2">
                        {others.map((p, i) => (
                            <div key={p.name} className="flex justify-between items-center p-6 rounded-2xl hover:bg-white/5 transition-all">
                                <div className="flex items-center gap-6">
                                    <span className="font-black text-slate-600 italic w-8 text-xl">#{i + 4}</span>
                                    <span className="font-bold text-xl uppercase tracking-tight">{p.name}</span>
                                </div>
                                <span className="text-2xl font-black italic text-primary">{p.score}</span>
                            </div>
                        ))}
                        {others.length === 0 && (
                            <p className="text-center py-12 text-slate-600 italic uppercase font-black tracking-widest opacity-30 text-xs">No further participants...</p>
                        )}
                    </div>
                </div>

                <div className="flex justify-center pt-8">
                    <button
                        onClick={() => { setView('list'); setActiveQuiz(null); }}
                        className="btn-shimmer px-16 py-5 text-lg"
                    >
                        Conclude Session
                    </button>
                </div>
            </div>
        );
    }

    // ─── Lobby View ───────────────────────────────────────────────────────────
    if (view === 'lobby') {
        const joinUrl = `${window.location.origin}/quiz/${activeQuiz.roomCode}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}&bgcolor=1a1a1a&color=ffffff&margin=10`;

        return (
            <div className="p-8 max-w-6xl mx-auto space-y-12 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-between items-center bg-white/5 p-8 rounded-[2rem] border border-white/5">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-black tracking-widest rounded-full border border-primary/20 uppercase animate-pulse">Live Session</span>
                            <h1 className="text-4xl font-black italic tracking-tighter text-gradient uppercase">CONTROL ROOM</h1>
                        </div>
                        <p className="text-slate-400 font-bold tracking-tight">Active: {activeQuiz.title}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-2">Participant Count</p>
                        <div className="text-6xl font-black italic tracking-tighter text-white tabular-nums flex items-center justify-end gap-3">
                            {participants.length}
                            <div className="w-4 h-4 bg-green-500 rounded-full animate-ping opacity-50" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="glass p-10 rounded-[2.5rem] space-y-8 border-primary/30 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32 group-hover:bg-primary/20 transition-all" />

                            <div className="relative space-y-4">
                                <h2 className="text-3xl font-black italic flex items-center gap-4"><Play className="text-green-500 fill-green-500" /> READY TO LAUNCH?</h2>
                                <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
                                    Final check: {activeQuiz.questions.length} slides ready.
                                    Instruct your audience to scan the QR or use the session code below.
                                </p>
                            </div>

                            <div className="flex items-center gap-6 p-6 bg-black/40 rounded-3xl border border-white/10 group/code cursor-copy" onClick={() => {
                                navigator.clipboard.writeText(activeQuiz.roomCode);
                                showToast('Code copied!', 'success');
                            }}>
                                <div className="space-y-1 flex-1">
                                    <p className="text-[10px] font-black text-primary tracking-widest uppercase">Session Code</p>
                                    <p className="text-5xl font-black italic tracking-[-0.05em] text-white group-hover/code:text-primary transition-colors">{activeQuiz.roomCode}</p>
                                </div>
                                <div className="h-12 w-px bg-white/10" />
                                <div className="p-4 rounded-2xl bg-white/5 opacity-40">
                                    <div className="grid grid-cols-2 gap-1">
                                        {[1, 2, 3, 4].map(i => <div key={i} className="w-2 h-2 bg-white rounded-full" />)}
                                    </div>
                                </div>
                            </div>

                            <button onClick={startQuizBroadcast} className="btn-shimmer w-full py-6 text-xl font-black italic flex items-center justify-center gap-4 shadow-2xl group/start">
                                COMMENCE BATTLE <Zap className="group-hover:rotate-12 transition-transform" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="glass p-8 rounded-[2.5rem] flex flex-col items-center text-center space-y-6 border-white/5">
                            <p className="text-[10px] font-black text-slate-500 tracking-widest uppercase">Scan to Join</p>
                            <div className="p-6 bg-white rounded-[2rem] shadow-2xl relative group/qr overflow-hidden">
                                <img
                                    src={qrUrl}
                                    alt="Quiz QR Code"
                                    className="w-48 h-48 rounded-lg relative z-10"
                                />
                                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm z-20">
                                    <Zap className="text-white animate-bounce" size={48} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-300">Direct Entry Link</p>
                                <p className="text-[10px] font-medium text-slate-500 truncate w-full max-w-[200px]">{joinUrl}</p>
                            </div>
                        </div>

                        <div className="glass p-8 rounded-[2.5rem] flex-1 border-white/5">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                                <h3 className="text-sm font-black italic uppercase">The Vanguard ({participants.length})</h3>
                            </div>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                {participants.map((p, i) => (
                                    <motion.div
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        key={p._id || i}
                                        className="px-5 py-3 bg-white/5 rounded-2xl border border-white/5 font-bold text-sm flex items-center gap-3"
                                    >
                                        <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                        {p.name}
                                    </motion.div>
                                ))}
                                {participants.length === 0 && (
                                    <div className="py-12 flex flex-col items-center justify-center opacity-30 text-center space-y-3">
                                        <div className="w-12 h-12 border-2 border-dashed border-white/40 rounded-full animate-spin" />
                                        <p className="text-xs font-bold italic uppercase tracking-widest">Awaiting Warriors...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Live View ────────────────────────────────────────────────────────────
    if (view === 'live') {
        return (
            <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-[2rem] border border-white/5">
                    <div>
                        <h1 className="text-5xl font-black italic tracking-tighter text-gradient">LIVE RANK RUSH</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Room Intelligence // {activeQuiz.roomCode}</p>
                    </div>
                    <button onClick={() => setView('list')} className="px-6 py-2 glass text-xs font-bold hover:bg-red-500/20 hover:text-red-400 transition-all">
                        TERMINATE VIEW
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass p-8 border-primary/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 font-black italic text-6xl opacity-5">#{currentQuestion?.index + 1 || 1}</div>
                            <h2 className="text-sm font-black text-primary tracking-[0.3em] uppercase mb-2">Current Question</h2>
                            <p className="text-2xl font-bold">{currentQuestion?.text || 'Waiting for question...'}</p>

                            <div className="mt-8 space-y-2">
                                <div className="flex justify-between text-xs font-bold tracking-widest uppercase">
                                    <span>Time Remaining</span>
                                    <span className={timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-primary'}>{timeLeft}s</span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000"
                                        style={{ width: `${(timeLeft / (currentQuestion?.timeLimit || 30)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="glass p-4 text-center">
                                <p className="text-[10px] text-gray-500 font-bold uppercase">Participants</p>
                                <p className="text-2xl font-black italic">{participants.length}</p>
                            </div>
                            <div className="glass p-4 text-center">
                                <p className="text-[10px] text-gray-500 font-bold uppercase">Progress</p>
                                <p className="text-2xl font-black italic">{currentQuestion?.index + 1 || 0} / {activeQuiz.questions.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-black italic tracking-tighter flex items-center gap-2">
                            <Zap size={20} className="text-secondary fill-secondary" /> TOP RUSHERS
                        </h3>
                        <div className="space-y-2">
                            {leaderboard.map((player, i) => (
                                <div key={player.name || i} className="glass p-4 flex justify-between items-center border-l-4 border-l-primary animate-in slide-in-from-right" style={{ animationDelay: `${i * 50}ms` }}>
                                    <div className="flex items-center gap-3">
                                        <span className="font-black italic text-primary">#{i + 1}</span>
                                        <span className="font-bold">{player.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black italic leading-none">{player.score}</p>
                                        <p className="text-[10px] text-gray-500 font-bold italic tracking-tighter">{player.time?.toFixed(1)}s</p>
                                    </div>
                                </div>
                            ))}
                            {leaderboard.length === 0 && <p className="text-gray-500 italic text-center py-8 glass">Tracking rushes...</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Edit View (Mentimeter Style) ───────────────────────────────────────────
    if (view === 'edit') {
        const questions = activeQuiz.questions || [];
        const activeQuestion = questions[activeQuestionIndex];

        return (
            <div className="fixed inset-0 z-[100] bg-[var(--color-dark)] flex flex-col animate-in fade-in duration-300">
                <AnimatePresence>
                    {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                </AnimatePresence>

                {/* Header */}
                <header className="h-16 border-b border-[var(--color-border)] bg-[var(--bg-surface)] backdrop-blur-md flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('list')} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="h-6 w-px bg-[var(--color-border)]"></div>
                        <h1 className="font-black italic tracking-tighter text-lg truncate max-w-[200px]">{activeQuiz.title}</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-[var(--color-border)] p-1 rounded-xl">
                            <button className="px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-[var(--bg-surface-bright)] text-primary shadow-sm">Create</button>
                            <button className="px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300">Results</button>
                        </div>
                        <button onClick={() => setView('lobby')} className="btn-shimmer py-2 px-6 text-xs flex items-center gap-2">
                            <Play size={14} fill="currentColor" /> START PRESENTATION
                        </button>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar: Slide Navigator */}
                    <aside className="w-64 border-r border-[var(--color-border)] bg-[var(--bg-surface)] flex flex-col shrink-0">
                        <div className="p-4">
                            <button
                                onClick={async () => {
                                    try {
                                        const data = await apiAddQuestion(activeQuiz._id, {
                                            text: 'New Question: Enter your inquiry here...',
                                            options: ['Classic Option A', 'Vibrant Option B', 'Clear Option C', 'Sharp Option D'],
                                            correctOption: 0,
                                            timeLimit: 15
                                        });
                                        setActiveQuiz(data);
                                        setActiveQuestionIndex(data.questions.length - 1);
                                        showToast('New slide added!', 'success');
                                    } catch (err) {
                                        showToast('Failed to add slide');
                                    }
                                }}
                                className="w-full py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl font-black text-xs tracking-widest hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={16} /> NEW SLIDE (MCQ)
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                            {questions.map((q, i) => (
                                <div
                                    key={q._id || i}
                                    onClick={() => setActiveQuestionIndex(i)}
                                    className={`group cursor-pointer flex gap-3 items-center relative pr-8`}
                                >
                                    <span className="text-[10px] font-black text-slate-500 w-4">{i + 1}</span>
                                    <div className={`flex-1 aspect-video rounded-lg border-2 transition-all p-2 flex flex-col justify-center items-center gap-1 overflow-hidden
                                        ${activeQuestionIndex === i ? 'border-primary bg-primary/5' : 'border-[var(--color-border)] bg-black/20 hover:border-slate-500'}`}
                                    >
                                        <div className="w-full h-1 bg-slate-700/50 rounded-full"></div>
                                        <div className="w-2/3 h-1 bg-slate-700/30 rounded-full"></div>
                                        <div className="grid grid-cols-2 gap-1 w-full mt-1">
                                            <div className="h-1 bg-slate-800 rounded-full"></div>
                                            <div className="h-1 bg-slate-800 rounded-full"></div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteQuestion(q._id);
                                        }}
                                        className="absolute right-0 opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-500 transition-all rounded-lg hover:bg-red-500/10"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </aside>

                    {/* Center: Visual Canvas */}
                    <main className="flex-1 bg-black/20 p-12 overflow-y-auto flex flex-col items-center">
                        <div className="w-full max-w-4xl aspect-video glass rounded-[2.5rem] p-16 flex flex-col shadow-2xl relative border-white/5">
                            <div className="absolute top-8 right-12 opacity-20">
                                <Zap className="fill-primary text-secondary" size={32} />
                            </div>

                            {activeQuestion ? (
                                <div className="flex-1 flex flex-col space-y-12">
                                    <textarea
                                        className="bg-transparent border-none outline-none text-4xl font-black text-center w-full resize-none placeholder:text-slate-700 tracking-tight"
                                        placeholder="Type your question here..."
                                        value={activeQuestion.text}
                                        onChange={async (e) => {
                                            const updatedQuestions = [...questions];
                                            updatedQuestions[activeQuestionIndex].text = e.target.value;
                                            setActiveQuiz({ ...activeQuiz, questions: updatedQuestions });
                                            // Optional: Debounced auto-save could go here
                                        }}
                                    />

                                    <div className="grid grid-cols-2 gap-6 flex-1">
                                        {activeQuestion.options.map((opt, i) => (
                                            <div key={i} className={`relative flex items-center transition-all duration-300 group`}>
                                                <div className={`absolute -top-3 left-6 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest z-10
                                                    ${activeQuestion.correctOption === i ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                                    Option {i + 1} {activeQuestion.correctOption === i && '✓'}
                                                </div>
                                                <input
                                                    className={`w-full py-6 px-8 rounded-2xl bg-white/5 border-2 outline-none transition-all font-bold text-center
                                                        ${activeQuestion.correctOption === i ? 'border-green-500/50 bg-green-500/5' : 'border-white/5 focus:border-primary/50'}`}
                                                    placeholder={`Option ${i + 1}`}
                                                    value={opt}
                                                    onChange={(e) => {
                                                        const updatedQuestions = [...questions];
                                                        updatedQuestions[activeQuestionIndex].options[i] = e.target.value;
                                                        setActiveQuiz({ ...activeQuiz, questions: updatedQuestions });
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                                    <AlertCircle size={64} />
                                    <p className="text-xl font-bold">No slide selected.<br />Add a question to get started.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                            WYSIWYG Editor // Canvas Phase 1
                        </div>
                    </main>

                    {/* Right Sidebar: Properties */}
                    <aside className="w-80 border-l border-[var(--color-border)] bg-[var(--bg-surface)] p-6 overflow-y-auto shrink-0 space-y-8">
                        <section className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Configuration</h3>

                            <div className="space-y-6">
                                <button
                                    onClick={async () => {
                                        if (!activeQuestion) return;
                                        try {
                                            const data = await apiUpdateQuestion(activeQuiz._id, activeQuestion._id, {
                                                text: activeQuestion.text,
                                                options: activeQuestion.options,
                                                correctOption: activeQuestion.correctOption ?? 0,
                                                timeLimit: activeQuestion.timeLimit
                                            });
                                            setActiveQuiz(data);
                                            showToast('Slide updated successfully!', 'success');
                                        } catch (err) {
                                            showToast(err.response?.data?.message || 'Failed to save changes');
                                        }
                                    }}
                                    className="w-full py-4 btn-shimmer text-[10px] font-black uppercase tracking-[0.2em] shadow-lg"
                                >
                                    SAVE SLIDE CONTENT
                                </button>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">Question Type</label>
                                    <div className="relative">
                                        <select className="input-premium py-3 text-sm pr-10 appearance-none bg-black/10">
                                            <option>Multiple Choice</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                            <Zap size={14} className="fill-primary" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">Time Limit</label>
                                    <select
                                        className="input-premium py-3 text-sm"
                                        value={activeQuestion?.timeLimit || 10}
                                        onChange={(e) => {
                                            if (!activeQuestion) return;
                                            const updatedQuestions = [...activeQuiz.questions];
                                            updatedQuestions[activeQuestionIndex].timeLimit = Number(e.target.value);
                                            setActiveQuiz({ ...activeQuiz, questions: updatedQuestions });
                                        }}
                                    >
                                        {[10, 15, 20, 30, 45, 60].map(sec => (
                                            <option key={sec} value={sec}>{sec} Seconds</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">Correct Answer</label>
                                    <select
                                        className="input-premium py-3 text-sm"
                                        value={activeQuestion?.correctOption ?? ''}
                                        onChange={(e) => {
                                            if (!activeQuestion) return;
                                            const updatedQuestions = [...activeQuiz.questions];
                                            updatedQuestions[activeQuestionIndex].correctOption = Number(e.target.value);
                                            setActiveQuiz({ ...activeQuiz, questions: updatedQuestions });
                                        }}
                                    >
                                        <option value="">Select correct index</option>
                                        {activeQuestion?.options.map((opt, i) => (
                                            <option key={i} value={i}>Option {i + 1}: {opt?.substring(0, 20) || 'Untitled Option'}...</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </section>

                        <div className="pt-12 border-t border-[var(--color-border)]">
                            <button
                                onClick={() => handleDeleteQuestion(activeQuestion?._id)}
                                className="w-full py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-xs font-black tracking-widest transition-all border border-red-500/20 flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} /> DELETE SLIDE
                            </button>
                        </div>
                    </aside>
                </div>
            </div>
        );
    }

    // ─── List View (Main Dashboard) ────────────────────────────────────────────
    return (
        <>
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                {confirmDialog && (
                    <ConfirmDialog
                        message={confirmDialog.message}
                        onConfirm={confirmDialog.onConfirm}
                        onCancel={() => setConfirmDialog(null)}
                    />
                )}
            </AnimatePresence>

            <div className="p-8 space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-5xl font-black italic tracking-tighter uppercase line-through decoration-primary decoration-4">STUDIO</h1>
                        <p className="text-gray-400 font-medium">Welcome back, <span className="text-primary font-bold">{user.name}</span></p>
                    </div>
                    {!currentSubject && (
                        <button onClick={() => setShowCreate(!showCreate)} className="btn-premium px-8 py-4 group">
                            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                            {showCreate ? 'Close Menu' : 'New Project'}
                        </button>
                    )}
                </div>

                {currentSubject && (
                    <div className="flex items-center gap-6 p-4 glass rounded-3xl animate-in slide-in-from-left border-secondary/20">
                        <button onClick={() => setCurrentSubject(null)} className="p-4 glass-dark rounded-2xl hover:bg-white/10 transition-all border-white/5">
                            <ChevronLeft />
                        </button>
                        <div>
                            <h2 className="text-3xl font-black italic tracking-tighter text-secondary uppercase leading-none">{currentSubject.title}</h2>
                            <p className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase mt-1">Management Chamber // Sub-directory</p>
                        </div>
                        <button
                            onClick={() => handleFetchSubjectLeaderboard()}
                            className="flex items-center gap-2 px-6 py-3 bg-secondary/20 text-secondary border border-secondary/30 rounded-2xl font-black italic tracking-tight hover:bg-secondary/30 transition-all"
                        >
                            <Trophy size={18} /> SUBJECT LEADERBOARD
                        </button>
                        <button
                            onClick={() => { setQuizType('quiz'); setShowCreate(!showCreate); }}
                            className="btn-premium px-6 py-3 text-xs flex items-center gap-2"
                        >
                            <Plus size={16} /> {showCreate ? 'CANCEL' : 'ADD QUIZ'}
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes.map((quiz) => (
                        <div key={quiz._id} className={`glass card-hover overflow-hidden group ${quiz.type === 'subject' ? 'border-secondary/20' : ''}`}>
                            <div className="p-8 space-y-6 relative">
                                {quiz.type === 'subject' ? (
                                    <>
                                        <div className="flex justify-between items-start">
                                            <div className="p-3 bg-secondary/10 rounded-2xl">
                                                <Folder className="text-secondary" size={24} />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleFetchSubjectLeaderboard(quiz); }}
                                                    className="p-2 hover:bg-yellow-500/20 text-slate-500 hover:text-yellow-400 rounded-lg transition-all"
                                                    title="View Subject Mastery"
                                                >
                                                    <Trophy size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingQuizId(quiz._id); setEditingTitle(quiz.title); }}
                                                    className="p-2 hover:bg-primary/20 text-slate-500 hover:text-primary rounded-lg transition-all"
                                                    title="Rename"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteQuiz(quiz._id); }}
                                                    className="p-2 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <span className="px-3 py-1 bg-secondary/20 text-secondary text-[10px] font-black tracking-widest rounded-full uppercase">Subject Folder</span>
                                            </div>
                                        </div>
                                        {editingQuizId === quiz._id ? (
                                            <div className="flex items-center gap-2 w-full mt-2" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    autoFocus
                                                    className="input-premium text-base font-black italic py-2 flex-1 border-secondary/50"
                                                    value={editingTitle}
                                                    onChange={(e) => setEditingTitle(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleRenameQuiz(quiz._id);
                                                        if (e.key === 'Escape') setEditingQuizId(null);
                                                    }}
                                                />
                                                <button onClick={() => handleRenameQuiz(quiz._id)} className="p-2.5 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30 transition-all border border-green-500/30"><Check size={16} /></button>
                                                <button onClick={() => setEditingQuizId(null)} className="p-2.5 bg-white/5 text-slate-400 rounded-xl hover:bg-white/10 transition-all border border-white/10"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <h3
                                                className="text-3xl font-black italic tracking-tighter text-secondary truncate cursor-pointer hover:underline decoration-secondary/30 decoration-2 underline-offset-8 transition-all"
                                                onDoubleClick={() => { setEditingQuizId(quiz._id); setEditingTitle(quiz.title); }}
                                                title="Double-click to rename"
                                            >{quiz.title}</h3>
                                        )}
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">A container for nested quiz rushes.</p>
                                        <button
                                            onClick={() => setCurrentSubject(quiz)}
                                            className="w-full py-4 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-secondary/10"
                                        >
                                            Open Directory
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start">
                                            {editingQuizId === quiz._id ? (
                                                <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        autoFocus
                                                        className="input-premium text-base font-black italic py-2 flex-1 border-primary/50"
                                                        value={editingTitle}
                                                        onChange={(e) => setEditingTitle(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleRenameQuiz(quiz._id);
                                                            if (e.key === 'Escape') setEditingQuizId(null);
                                                        }}
                                                    />
                                                    <button onClick={() => handleRenameQuiz(quiz._id)} className="p-2.5 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30 transition-all border border-green-500/30"><Check size={16} /></button>
                                                    <button onClick={() => setEditingQuizId(null)} className="p-2.5 bg-white/5 text-slate-400 rounded-xl hover:bg-white/10 transition-all border border-white/10"><X size={16} /></button>
                                                </div>
                                            ) : (
                                                <h3
                                                    className="text-3xl font-black italic tracking-tighter text-primary truncate w-3/4 cursor-pointer hover:underline decoration-primary/30 decoration-2 underline-offset-8 transition-all"
                                                    onDoubleClick={() => { setEditingQuizId(quiz._id); setEditingTitle(quiz.title); }}
                                                    title="Double-click to rename"
                                                >{quiz.title}</h3>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleDeleteQuiz(quiz._id)}
                                                    className="p-2 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-6 text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">
                                            <span className="flex items-center gap-1.5"><Zap size={10} className="text-secondary" /> {quiz.questions?.length || 0} Quests</span>
                                            <span>Status: <span className="text-white">{quiz.status}</span></span>
                                            {quiz.isPaid && <span className="text-yellow-400">₹{quiz.price}</span>}
                                        </div>
                                        <div className="flex gap-3 pt-4">
                                            <button
                                                onClick={() => { setActiveQuiz(quiz); setView('edit'); }}
                                                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/5"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleFetchQuizLeaderboard(quiz)}
                                                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"
                                                title="View Standings"
                                            >
                                                <Trophy size={14} className="text-yellow-500" />
                                            </button>
                                            <button
                                                onClick={() => handleGoLive(quiz)}
                                                className="flex-1 py-3 btn-shimmer rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all group/btn"
                                            >
                                                <Play size={12} fill="currentColor" className="group-hover:scale-110 transition-transform" /> Go Live
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {showCreate && (
                    <div className="glass p-8 space-y-6 mt-12 animate-in slide-in-from-bottom duration-300 border-primary/30">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold italic tracking-tight uppercase">
                                {currentSubject ? `New Quiz in ${currentSubject.title}` : 'New Project Configuration'}
                            </h3>
                            {!currentSubject && (
                                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                    <button
                                        onClick={() => setQuizType('quiz')}
                                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${quizType === 'quiz' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Single Blitz
                                    </button>
                                    <button
                                        onClick={() => setQuizType('subject')}
                                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${quizType === 'subject' ? 'bg-secondary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Multi-Quiz Subject
                                    </button>
                                </div>
                            )}
                            {currentSubject && (
                                <span className="px-4 py-2 bg-primary/20 text-primary text-[10px] font-black tracking-widest rounded-lg uppercase">Sub-Directory Quiz</span>
                            )}
                        </div>
                        <div className="flex gap-4">
                            <input
                                className="input-premium flex-1"
                                placeholder={quizType === 'quiz' ? 'e.g. JavaScript Core Deep Dive' : "e.g. Master's in Web Development Subject"}
                                value={newQuizTitle}
                                onChange={(e) => setNewQuizTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && createQuiz()}
                            />
                            <button onClick={createQuiz} className="btn-premium px-12">Initialize</button>
                        </div>

                        {/* Paid quiz toggle */}
                        {quizType === 'quiz' && (
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <div
                                        onClick={() => setIsPaid(!isPaid)}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${isPaid ? 'bg-primary' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isPaid ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Paid Quiz</span>
                                </label>
                                {isPaid && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-primary font-black text-lg">₹</span>
                                        <input
                                            type="number"
                                            min="1"
                                            className="input-premium w-32 text-center"
                                            placeholder="Price"
                                            value={quizPrice}
                                            onChange={(e) => setQuizPrice(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {quizType === 'quiz' ? 'Creates a standalone high-speed competitive quiz.' : 'Creates a collaborative folder to group multiple quizzes with a cumulative leaderboard.'}
                        </p>
                    </div>
                )}

                {/* Leaderboard Modal */}
                {isLeaderboardOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-dark/80 backdrop-blur-xl">
                        <div className={`glass-bright w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col rounded-[3rem] border-${leaderboardMeta.accent}/30 shadow-2xl animate-in zoom-in duration-300`}>
                            <div className={`p-10 border-b border-white/5 flex justify-between items-center bg-${leaderboardMeta.accent}/5`}>
                                <div>
                                    <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase">{leaderboardMeta.title}</h2>
                                    <p className={`text-[10px] font-black text-${leaderboardMeta.accent} tracking-[0.4em] uppercase mt-1`}>{leaderboardMeta.sub}</p>
                                </div>
                                <button onClick={() => setIsLeaderboardOpen(false)} className="p-4 glass rounded-2xl hover:text-red-400 transition-all border-white/5"><X /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-3">
                                {subjectLeaderboard.map((player, i) => (
                                    <div key={player.name || i} className="glass p-5 flex items-center justify-between border-white/5 hover:bg-white/5 transition-all">
                                        <div className="flex items-center gap-5">
                                            <span className={`text-2xl font-black italic ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>
                                                #{i + 1}
                                            </span>
                                            <div>
                                                <p className="font-black italic text-lg uppercase leading-none tracking-tight">{player.name}</p>
                                                {player.count !== undefined && (
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Conquered {player.count} Quizzes</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-2xl font-black italic text-${leaderboardMeta.accent} leading-none`}>{player.score}</p>
                                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">
                                                {player.time ? player.time.toFixed(1) + 's avg' : 'Total Prowess'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {subjectLeaderboard.length === 0 && (
                                    <p className="text-center py-20 text-slate-500 italic uppercase font-black tracking-widest opacity-30">No mastery data recorded yet...</p>
                                )}
                            </div>
                            <div className={`p-6 bg-${leaderboardMeta.accent} text-dark text-center font-black italic tracking-tight uppercase`}>
                                Top 10 Legends of the Rush
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default OrganizerDashboard;
