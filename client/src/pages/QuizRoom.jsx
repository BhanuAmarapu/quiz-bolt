import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Timer, Trophy, Users, CheckCircle2, XCircle, PlayCircle, AlertCircle } from 'lucide-react';
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
                        <div className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-black tracking-widest rounded-full border border-primary/20 uppercase animate-pulse">Waiting for host</div>
                        <h1 className="text-6xl font-black tracking-tight text-white italic uppercase line-through decoration-primary decoration-4">{quizTitle || 'Joining Session...'}</h1>
                        <p className="text-gray-400 text-lg font-medium tracking-wide">The arena is being prepared. Stand by for activation.</p>
                    </div>

                    <div className="glass p-8 w-full max-w-md border-primary/20">
                        <div className="flex items-center gap-3 mb-6 text-primary border-b border-white/10 pb-4">
                            <Users size={24} />
                            <h3 className="text-xl font-bold uppercase tracking-widest">Lobby ({participants.length})</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                            {participants.map((p, i) => (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    key={p._id || i}
                                    className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-center font-bold"
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
                    <h1 className="text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-white to-orange-500">
                        GAME OVER
                    </h1>
                    <p className="text-gray-400 text-xl">Final Standings</p>
                </div>

                <div className="glass p-10 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
                    <h2 className="text-3xl font-bold flex items-center justify-center gap-3">
                        <Trophy className="text-yellow-400" size={32} /> The Champions
                    </h2>
                    <div className="space-y-4">
                        {leaderboard.map((entry, i) => (
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                key={entry.name}
                                className={`flex justify-between items-center p-6 rounded-2xl ${i === 0 ? 'bg-yellow-400/20 border-2 border-yellow-400/50 scale-105' : 'bg-white/5 border border-white/10'}`}
                            >
                                <div className="flex items-center gap-6">
                                    <span className={`text-3xl font-black w-10 ${i === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>{i + 1}</span>
                                    <span className="font-black text-2xl uppercase tracking-tight">{entry.name}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-black text-primary">{entry.score}</p>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest">{entry.time?.toFixed(2)}s Response</p>
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
            <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8 mt-4">
                <div className="lg:col-span-3 space-y-8">
                    {/* Header with timer */}
                    <div className="flex justify-between items-start glass p-6 border-white/10 relative overflow-hidden">
                        <div
                            className="absolute top-0 left-0 h-full bg-primary/10 transition-all duration-1000"
                            style={{ width: `${(timeLeft / currentQuestion?.timeLimit) * 100}%` }}
                        />
                        <div className="space-y-2 relative z-10">
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-primary text-white text-[10px] font-black rounded-full uppercase tracking-tighter">
                                    Q{currentQuestion?.index + 1} / {currentQuestion?.total}
                                </span>
                                <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">
                                    {currentQuestion?.questionType?.replace('-', ' ')}
                                </span>
                            </div>
                            <h2 className="text-4xl font-black tracking-tight leading-tight">{currentQuestion?.text}</h2>
                        </div>
                        <div className="flex flex-col items-center px-6 py-4 glass bg-dark border-primary/30 min-w-[100px] relative z-10">
                            <Timer className={`${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-primary'}`} size={24} />
                            <span className={`text-4xl font-black ${timeLeft < 10 ? 'text-red-500' : 'text-white'}`}>{timeLeft}</span>
                        </div>
                    </div>

                    {/* Media */}
                    {currentQuestion?.mediaUrl && (
                        <div className="glass overflow-hidden h-[300px] flex items-center justify-center bg-black/40">
                            <img src={currentQuestion.mediaUrl} alt="Question Media" className="h-full w-full object-contain" />
                        </div>
                    )}

                    {/* Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence mode='wait'>
                            {currentQuestion?.options.map((option, i) => (
                                <motion.button
                                    key={option}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1, type: 'spring' }}
                                    onClick={() => submitAnswer(option)}
                                    disabled={!!selectedOption || timeLeft === 0}
                                    className={`group p-8 text-left text-2xl font-black rounded-[2rem] border-2 transition-all h-36 flex items-center justify-between relative overflow-hidden
                                        ${selectedOption === option ? 'border-primary bg-primary/20 scale-[0.98]' : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'}
                                        ${selectedOption && selectedOption !== option ? 'opacity-30 blur-[1px]' : 'opacity-100'}
                                    `}
                                >
                                    <span className="relative z-10">{option}</span>
                                    {selectedOption === option && <CheckCircle2 className="text-primary relative z-10" size={32} />}
                                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <PlayCircle size={120} />
                                    </div>
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Result Feedback */}
                    <AnimatePresence>
                        {myResult && (
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 50, opacity: 0 }}
                                className={`glass p-8 text-center space-y-2 border-2 ${myResult.isCorrect ? 'border-green-500/50 bg-green-500/20' : 'border-red-500/50 bg-red-500/20'}`}
                            >
                                <div className={`flex items-center justify-center gap-4 ${myResult.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                    {myResult.isCorrect ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
                                    <span className="text-4xl font-black tracking-tighter uppercase">
                                        {myResult.isCorrect ? `AWESOME! +${myResult.score}` : 'WRONG ANSWER'}
                                    </span>
                                </div>
                                <p className="text-white/60 font-bold uppercase tracking-widest text-xs">Waiting for the next question...</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Leaderboard Sidebar */}
                <div className="space-y-6">
                    <div className="glass p-6 border-white/10">
                        <h3 className="text-2xl font-black flex items-center gap-3 mb-6 tracking-tighter uppercase italic">
                            <Trophy className="text-yellow-500" /> Rank Rush
                        </h3>
                        <div className="space-y-4">
                            {leaderboard.map((entry, i) => (
                                <motion.div
                                    layout
                                    key={entry.name}
                                    className={`flex justify-between items-center glass p-4 border-white/5 ${entry.name === user.name ? 'border-primary/50 bg-primary/10' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={`font-black text-xl italic ${i < 3 ? 'text-primary' : 'text-gray-600'}`}>#{i + 1}</span>
                                        <span className="font-bold tracking-tight text-sm uppercase truncate max-w-[100px]">{entry.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-black text-lg text-white">{entry.score}</span>
                                        <div className="h-1 w-full bg-white/10 rounded-full mt-1 overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
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
