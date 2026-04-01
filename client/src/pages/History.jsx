import { useState, useEffect } from 'react';
import { Calendar, Award, Clock, CheckCircle2, XCircle, Users, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserHistory, getOrganizerHistory } from '../services/api';

const History = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const { user } = useAuth();

    const exportToCSV = (record) => {
        const isOrganizer = user.role === 'organizer';
        let csvContent = '';

        if (isOrganizer) {
            csvContent = 'Quiz Title,Room Code,Date,Participants,Total Answers\n';
            csvContent += `"${record.title}",${record.roomCode},${new Date(record.createdAt).toLocaleDateString()},${record.participantCount},${record.totalAnswers}\n`;
        } else {
            csvContent = 'Question,Your Answer,Correct,Points\n';
            (record.answers || []).forEach(ans => {
                csvContent += `"${ans.questionText}","${ans.selected}",${ans.isCorrect},${ans.score}\n`;
            });
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${(record.quizTitle || record.title || 'quiz').replace(/\s+/g, '_')}_results.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = user.role === 'organizer'
                    ? await getOrganizerHistory()
                    : await getUserHistory();
                setHistory(data);
            } catch {
                setError('Failed to load history. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchHistory();
    }, [user]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="glass p-8 text-center space-y-4 max-w-sm">
                <p className="text-red-400 font-bold">{error}</p>
                <button onClick={() => window.location.reload()} className="btn-premium text-sm px-6 py-2">
                    Retry
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-5xl font-black italic tracking-tighter uppercase line-through decoration-primary decoration-4">HISTORY</h1>
                    <p className="text-slate-400 font-medium tracking-wide uppercase text-xs mt-2">
                        {user.role === 'organizer' ? 'Archive of your conducted sessions' : 'Recap of your quiz performances'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* History List */}
                <div className="lg:col-span-1 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {history.length === 0 ? (
                        <div className="glass p-12 text-center text-slate-500 italic rounded-2xl">
                            No history found yet.
                        </div>
                    ) : (
                        history.map((record, i) => (
                            <button
                                key={record.roomCode || i}
                                onClick={() => setSelectedQuiz(record)}
                                className={`w-full text-left glass p-6 rounded-2xl border-l-4 transition-all duration-300 ${selectedQuiz === record
                                    ? 'border-l-primary bg-primary/5 translate-x-1'
                                    : 'border-l-transparent hover:border-l-primary/30'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-black italic tracking-tight text-lg line-clamp-1 truncate w-40">
                                        {record.quizTitle || record.title}
                                    </h3>
                                    <span className="text-[10px] bg-white/5 px-2 py-1 rounded-md font-bold text-slate-400">{record.roomCode}</span>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={12} /> {new Date(record.date || record.createdAt).toLocaleDateString()}
                                    </span>
                                    {user.role === 'participant' ? (
                                        <span className="flex items-center gap-1.5 text-primary">
                                            <Award size={12} /> {record.totalScore} pts
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-secondary">
                                            <Users size={12} /> {record.participantCount} users
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Detail View */}
                <div className="lg:col-span-2">
                    {selectedQuiz ? (
                        <div className="glass p-8 rounded-2xl space-y-8 animate-in slide-in-from-right duration-500">
                            <div className="flex justify-between items-start border-b border-white/5 pb-6">
                                <div>
                                    <h2 className="text-3xl font-black italic tracking-tighter uppercase">
                                        {selectedQuiz.quizTitle || selectedQuiz.title}
                                    </h2>
                                    <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest">Room: {selectedQuiz.roomCode}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500 font-black tracking-[0.2em] uppercase">Status</p>
                                        <p className="text-xs font-bold text-primary italic uppercase">{selectedQuiz.status || 'Completed'}</p>
                                    </div>
                                    <button
                                        onClick={() => exportToCSV(selectedQuiz)}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold hover:bg-primary/30 transition-all"
                                        title="Export as CSV"
                                    >
                                        <Download size={14} /> Export CSV
                                    </button>
                                </div>
                            </div>

                            {user.role === 'participant' ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="glass p-6 rounded-2xl bg-primary/5 flex flex-col items-center">
                                            <Award className="text-primary mb-2" size={32} />
                                            <p className="text-2xl font-black italic">{selectedQuiz.totalScore}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Score</p>
                                        </div>
                                        <div className="glass p-6 rounded-2xl flex flex-col items-center">
                                            <Clock className="text-secondary mb-2" size={32} />
                                            <p className="text-2xl font-black italic">{selectedQuiz.totalTime?.toFixed(1)}s</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Speed</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Answer Breakdown</h4>
                                        <div className="space-y-3">
                                            {selectedQuiz.answers?.map((ans, idx) => (
                                                <div key={idx} className="glass p-5 flex items-center justify-between border-white/5">
                                                    <div className="flex items-start gap-4">
                                                        {ans.isCorrect
                                                            ? <CheckCircle2 className="text-emerald-500 mt-1" size={20} />
                                                            : <XCircle className="text-red-500 mt-1" size={20} />
                                                        }
                                                        <div>
                                                            <p className="font-bold text-slate-200">{ans.questionText}</p>
                                                            <p className="text-xs text-slate-500 mt-1">
                                                                Your answer: <span className={ans.isCorrect ? 'text-emerald-400' : 'text-red-400'}>{ans.selected}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-lg font-black italic">{ans.score}</span>
                                                        <p className="text-[8px] font-black uppercase text-slate-500">Points</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="glass p-6 rounded-2xl flex flex-col items-center">
                                            <Users className="text-primary mb-2" size={24} />
                                            <p className="text-xl font-black">{selectedQuiz.participantCount ?? '—'}</p>
                                            <p className="text-[8px] font-black uppercase text-slate-500">Participants</p>
                                        </div>
                                        <div className="glass p-6 rounded-2xl flex flex-col items-center">
                                            <Award className="text-secondary mb-2" size={24} />
                                            <p className="text-xl font-black italic">{selectedQuiz.totalAnswers ?? '—'}</p>
                                            <p className="text-[8px] font-black uppercase text-slate-500">Answers Submitted</p>
                                        </div>
                                        <div className="glass p-6 rounded-2xl flex flex-col items-center col-span-2">
                                            <Clock className="text-secondary mb-2" size={24} />
                                            <p className="text-xl font-black italic">
                                                {new Date(selectedQuiz.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </p>
                                            <p className="text-[8px] font-black uppercase text-slate-500">Session Held</p>
                                        </div>
                                    </div>

                                    <div className="p-8 glass border border-white/5 rounded-2xl space-y-4">
                                        <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Session Summary</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                                                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Room Code</span>
                                                <span className="font-black text-primary">{selectedQuiz.roomCode}</span>
                                            </div>
                                            <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                                                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Status</span>
                                                <span className="font-black capitalize text-white">{selectedQuiz.status || 'completed'}</span>
                                            </div>
                                            <div className="flex justify-between p-3 bg-white/5 rounded-xl col-span-2">
                                                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Avg Answers / Participant</span>
                                                <span className="font-black text-white">
                                                    {selectedQuiz.participantCount && selectedQuiz.totalAnswers
                                                        ? (selectedQuiz.totalAnswers / selectedQuiz.participantCount).toFixed(1)
                                                        : '—'}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-600 italic pt-2">
                                            Individual per-participant breakdown with correct/wrong answers is planned for the Studio Pro analytics update.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="glass p-20 flex flex-col items-center justify-center text-center space-y-6 rounded-3xl opacity-50 grayscale transition-all hover:grayscale-0">
                            <div className="p-6 glass rounded-full ring-4 ring-primary/20">
                                <Clock className="text-primary" size={48} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase">Inspection Chamber</h3>
                                <p className="text-slate-500 max-w-xs text-sm">Select a quiz record from the checklist to initiate post-rush analysis.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default History;
