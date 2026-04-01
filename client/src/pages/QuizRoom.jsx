import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Timer, Trophy, Users, CheckCircle2, XCircle, PlayCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QuizRoom = () => {
    const { roomCode } = useParams();
    const socket = useSocket();
    const { user } = useAuth();

    const [status, setStatus] = useState('waiting');
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [myResult, setMyResult] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [expiry, setExpiry] = useState(null);
    const [quizTitle, setQuizTitle] = useState('');
    const [selectedOption, setSelectedOption] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    useEffect(() => {
        if (!socket || !user) return;

        socket.emit('join_room', { roomCode, user });

        // Reconnection / sync state handling
        socket.on('room_state', (state) => {
            setStatus(state.status);
            if (state.title) setQuizTitle(state.title);
            setLeaderboard(state.leaderboard || []);
            setParticipants(state.participants || []);
            if (state.currentQuestion) {
                setCurrentQuestion(state.currentQuestion);
                setTimeLeft(state.timeLeft);
                if (state.expiry) setExpiry(state.expiry);
                setStatus('playing');
            }
        });

        // Participants list update from server
        socket.on('participants_update', (list) => {
            setParticipants(list);
        });

        socket.on('new_question', (question) => {
            setCurrentQuestion(question);
            setTimeLeft(question.timeLimit);
            if (question.expiry) setExpiry(question.expiry);
            setMyResult(null);
            setSelectedOption(null);
            setStatus('playing');
        });

        socket.on('timer_tick', (time) => setTimeLeft(time));

        socket.on('answer_result', (result) => {
            setMyResult(result);
        });

        socket.on('update_leaderboard', (data) => setLeaderboard(data));

        socket.on('quiz_finished', () => setStatus('finished'));

        socket.on('error', (msg) => {
            setErrorMessage(msg);
            setTimeout(() => setErrorMessage(null), 5000);
        });

        return () => {
            socket.off('room_state');
            socket.off('participants_update');
            socket.off('new_question');
            socket.off('timer_tick');
            socket.off('answer_result');
            socket.off('update_leaderboard');
            socket.off('quiz_finished');
            socket.off('error');
        };
    }, [socket, roomCode, user]);

    // Sync local timer with server expiry
    useEffect(() => {
        if (!expiry || status !== 'playing') return;
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining === 0) clearInterval(interval);
        }, 500);
        return () => clearInterval(interval);
    }, [expiry, status]);

    const submitAnswer = (option) => {
        if (selectedOption || timeLeft === 0 || status !== 'playing') return;
        setSelectedOption(option);

        // timeTaken is calculated server-side for anti-cheat
        socket.emit('submit_answer', {
            roomCode,
            userId: user._id,
            userName: user.name,
            questionId: currentQuestion._id,
            selectedOption: option
        });
    };

    // ─── Error Toast ─────────────────────────────────────────────────────────
    const ErrorToast = () => (
        <AnimatePresence>
            {errorMessage && (
                <motion.div
                    role="alert"
                    aria-live="assertive"
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 bg-red-500/20 border border-red-500/40 backdrop-blur-xl rounded-2xl text-red-300 font-bold shadow-xl"
                >
                    <AlertCircle size={20} />
                    {errorMessage}
                </motion.div>
            )}
        </AnimatePresence>
    );

    // ─── Waiting Lobby ───────────────────────────────────────────────────────
    if (status === 'waiting' || status === 'upcoming') {
        return (
            <>
                <ErrorToast />
                <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 animate-in fade-in duration-500">
                    <div className="text-center space-y-6">
                        <div className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 text-[10px] font-black tracking-widest rounded-full border border-indigo-200 uppercase animate-pulse">Waiting for host</div>
                        <h1 className="text-6xl font-black tracking-tight text-slate-900 uppercase">{quizTitle || 'Joining Session...'}</h1>
                        <p className="text-slate-500 text-lg font-medium tracking-wide">The arena is being prepared. Stand by for activation.</p>
                    </div>

                    <div className="bg-white p-8 w-full max-w-md border border-gray-100 rounded-3xl shadow-sm">
                        <div className="flex items-center gap-3 mb-6 text-indigo-600 border-b border-gray-100 pb-4">
                            <Users size={24} />
                            <h3 className="text-xl font-bold uppercase tracking-widest text-slate-900">Lobby ({participants.length})</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                            {participants.map((p, i) => (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    key={p._id || i}
                                    className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-center font-bold text-slate-800"
                                >
                                    {p.name}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // ─── Finished / Completed Screen ─────────────────────────────────────────
    if (status === 'finished' || status === 'completed') {
        return (
            <div className="max-w-4xl mx-auto p-8 text-center space-y-12 animate-in zoom-in duration-700">
                <div className="space-y-4">
                    <h1 className="text-7xl font-black tracking-tighter text-indigo-600">
                        GAME OVER
                    </h1>
                    <p className="text-slate-500 text-xl font-bold">Final Standings</p>
                </div>

                <div className="bg-white p-10 space-y-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500" />
                    <h2 className="text-3xl font-bold flex items-center justify-center gap-3 text-slate-900">
                        <Trophy className="text-yellow-500" size={32} /> The Champions
                    </h2>
                    <div className="space-y-4">
                        {leaderboard.map((entry, i) => (
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                key={entry.name}
                                className={`flex justify-between items-center p-6 rounded-2xl ${i === 0 ? 'bg-yellow-50 border-2 border-yellow-400 scale-105 shadow-xl' : 'bg-gray-50 border border-gray-100'}`}
                            >
                                <div className="flex items-center gap-6">
                                    <span className={`text-3xl font-black w-10 ${i === 0 ? 'text-yellow-500' : 'text-slate-400'}`}>{i + 1}</span>
                                    <span className="font-black text-2xl tracking-tight text-slate-900">{entry.name}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-black text-indigo-600">{entry.score}</p>
                                    <p className="text-xs text-slate-400 font-bold uppercase">{entry.time?.toFixed(2)}s Response</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ─── Playing Screen ───────────────────────────────────────────────────────
    return (
        <>
            <ErrorToast />
            <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col-reverse lg:grid lg:grid-cols-4 gap-8 mt-4">
                <div className="lg:col-span-3 space-y-8 flex flex-col">
                    {/* Header with timer */}
                    <div className="flex justify-between items-center bg-white p-8 border border-gray-100 rounded-3xl shadow-sm relative overflow-hidden min-h-[140px]" aria-live="polite">
                        <div
                            className="absolute top-0 left-0 h-1 bg-indigo-500 transition-all duration-1000"
                            style={{ width: `${(timeLeft / currentQuestion?.timeLimit) * 100}%` }}
                        />
                        <div className="space-y-2 relative z-10">
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full uppercase tracking-tighter">
                                    Q{currentQuestion?.index + 1} / {currentQuestion?.total}
                                </span>
                                <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">
                                    {currentQuestion?.questionType?.replace('-', ' ')}
                                </span>
                            </div>
                            <h2 className="text-4xl font-black tracking-tight leading-tight text-slate-900 mt-2">{currentQuestion?.text}</h2>
                        </div>
                        <div 
                            className="flex flex-col items-center px-6 py-4 bg-gray-100 rounded-2xl min-w-[100px] relative z-10 shrink-0 border border-gray-200"
                            aria-label={`Time remaining: ${timeLeft} seconds`}
                        >
                            <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Time Limit</span>
                            <span className={`text-4xl font-black ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-slate-900'}`}>{timeLeft}</span>
                        </div>
                    </div>

                    {/* Media */}
                    {currentQuestion?.mediaUrl && (
                        <div className="bg-white rounded-3xl overflow-hidden h-[300px] flex items-center justify-center border border-gray-100 shadow-sm">
                            <img src={currentQuestion.mediaUrl} alt="Question Media" className="h-full w-full object-contain" />
                        </div>
                    )}

                    {/* Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence mode='wait'>
                            {currentQuestion?.options.map((option, i) => {
                                const isSelected = selectedOption === option;
                                const isSubmitting = isSelected && !myResult;
                                return (
                                    <motion.button
                                        key={option}
                                        aria-label={`Select option ${option}`}
                                        aria-pressed={isSelected}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1, type: 'spring' }}
                                        onClick={() => submitAnswer(option)}
                                        disabled={!!selectedOption || timeLeft === 0}
                                        className={`group px-8 pt-10 pb-8 text-center text-xl font-bold rounded-[2rem] border-2 transition-all min-h-[9rem] flex flex-col items-center justify-center relative focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white
                                            ${isSelected ? 'border-green-500 bg-green-50 scale-[0.98]' : 'border-gray-100 bg-white hover:bg-gray-50'}
                                            ${selectedOption && !isSelected ? 'opacity-50' : 'opacity-100'}
                                        `}
                                    >
                                        <div className={`absolute top-4 left-6 px-3 py-1 text-xs font-black rounded-full flex items-center gap-1 ${isSelected ? 'bg-green-500 text-white' : 'bg-slate-800 text-white'}`}>
                                            OPTION {i + 1} {isSelected && <CheckCircle2 size={14} className="ml-1" />}
                                        </div>
                                        <span className="relative z-10 w-full break-words text-slate-900 mt-2">{option}</span>
                                        {isSubmitting && <Loader2 className="text-indigo-600 relative z-10 animate-spin absolute right-6 top-6" size={24} />}
                                    </motion.button>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Result Feedback */}
                    <AnimatePresence>
                        {myResult && (
                            <motion.div
                                role="status"
                                aria-live="polite"
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 50, opacity: 0 }}
                                className={`bg-white rounded-3xl p-8 text-center space-y-2 border-2 shadow-sm ${myResult.isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}
                            >
                                <div className={`flex items-center justify-center gap-4 ${myResult.isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                                    {myResult.isCorrect ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
                                    <span className="text-4xl font-black tracking-tighter uppercase">
                                        {myResult.isCorrect ? `AWESOME! +${myResult.score}` : 'WRONG ANSWER'}
                                    </span>
                                </div>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Waiting for the next question...</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Leaderboard Sidebar */}
                <div className="space-y-6 max-h-[35vh] lg:max-h-none overflow-y-auto w-full scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-2 pb-2">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="text-2xl font-black flex items-center gap-3 mb-6 font-sans text-slate-900">
                            <Trophy className="text-yellow-500" /> Rank Rush
                        </h3>
                        <div className="space-y-4">
                            {leaderboard.map((entry, i) => (
                                <motion.div
                                    layout
                                    key={entry.name}
                                    className={`flex justify-between items-center bg-gray-50 rounded-xl p-4 border border-gray-100 ${entry.name === user.name ? 'border-indigo-500 bg-indigo-50 shadow-md' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={`font-black text-xl ${i < 3 ? 'text-indigo-600' : 'text-slate-400'}`}>#{i + 1}</span>
                                        <span className="font-bold tracking-tight text-sm text-slate-900 truncate max-w-[100px]">{entry.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-black text-lg text-indigo-700">{entry.score}</span>
                                        <div className="h-1.5 w-full bg-gray-200 rounded-full mt-1 overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500"
                                                style={{ width: `${(entry.score / (leaderboard[0]?.score || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default QuizRoom;
