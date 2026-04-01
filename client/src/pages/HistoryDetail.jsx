import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Award, Clock, Users, Download, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HistoryDetail = () => {
    const { roomCode } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // We expect the selected record to be passed via router state for instant load
    const selectedQuiz = location.state?.record;

    useEffect(() => {
        if (!selectedQuiz) {
            // Ideally we'd fetch the specific record, but history stats are batched.
            // For now, if no state is present (e.g. deep link or refresh), redirect back to history list.
            navigate('/history');
        }
    }, [selectedQuiz, navigate]);

    if (!selectedQuiz) return null;

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

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <button 
                onClick={() => navigate('/history')}
                className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors"
            >
                <ArrowLeft size={20} /> Back to History
            </button>

            <div className="bg-white border border-gray-100 shadow-sm p-8 rounded-[2rem] space-y-8 animate-in slide-in-from-bottom duration-500">
                <div className="flex justify-between items-start border-b border-gray-100 pb-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900">
                            {selectedQuiz.quizTitle || selectedQuiz.title}
                        </h2>
                        <p className="text-slate-500 font-bold text-sm mt-1 uppercase">Room: {selectedQuiz.roomCode}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-[10px] text-slate-500 font-black uppercase">Status</p>
                            <p className="text-xs font-bold text-indigo-600 uppercase">{selectedQuiz.status || 'Completed'}</p>
                        </div>
                        <button
                            onClick={() => exportToCSV(selectedQuiz)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                            title="Export as CSV"
                        >
                            <Download size={14} /> Export CSV
                        </button>
                    </div>
                </div>

                {user.role === 'participant' ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="border border-gray-100 p-6 rounded-2xl bg-indigo-50 flex flex-col items-center">
                                <Award className="text-indigo-600 mb-2" size={32} />
                                <p className="text-2xl font-black text-slate-900">{selectedQuiz.totalScore}</p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Total Score</p>
                            </div>
                            <div className="border border-gray-100 p-6 rounded-2xl bg-gray-50 flex flex-col items-center">
                                <Clock className="text-slate-600 mb-2" size={32} />
                                <p className="text-2xl font-black text-slate-900">{selectedQuiz.totalTime?.toFixed(1)}s</p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Total Speed</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-bold uppercase text-slate-400">Answer Breakdown</h4>
                            <div className="space-y-3">
                                {selectedQuiz.answers?.map((ans, idx) => (
                                    <div key={idx} className="border border-gray-100 bg-gray-50 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                                        <div className="flex items-start gap-4">
                                            {ans.isCorrect
                                                ? <CheckCircle2 className="text-emerald-500 mt-1" size={20} />
                                                : <XCircle className="text-red-500 mt-1" size={20} />
                                            }
                                            <div>
                                                <p className="font-bold text-slate-900">{ans.questionText}</p>
                                                <p className="text-xs text-slate-600 mt-1">
                                                    Your answer: <span className={`font-bold ${ans.isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>{ans.selected}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-black text-slate-900">{ans.score}</span>
                                            <p className="text-xs font-bold text-slate-500">Points</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="border border-gray-100 bg-gray-50 p-6 rounded-2xl flex flex-col items-center">
                                <Users className="text-indigo-600 mb-2" size={24} />
                                <p className="text-xl font-black text-slate-900">{selectedQuiz.participantCount ?? '—'}</p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Participants</p>
                            </div>
                            <div className="border border-gray-100 bg-gray-50 p-6 rounded-2xl flex flex-col items-center">
                                <Award className="text-indigo-600 mb-2" size={24} />
                                <p className="text-xl font-black text-slate-900">{selectedQuiz.totalAnswers ?? '—'}</p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Answers</p>
                            </div>
                            <div className="border border-gray-100 bg-gray-50 p-6 rounded-2xl flex flex-col items-center col-span-2">
                                <Clock className="text-slate-600 mb-2" size={24} />
                                <p className="text-xl font-black text-slate-900">
                                    {new Date(selectedQuiz.createdAt || selectedQuiz.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Session Held</p>
                            </div>
                        </div>

                        <div className="p-8 border border-gray-100 bg-white rounded-[2rem] shadow-sm space-y-4">
                            <h4 className="text-sm font-bold uppercase text-slate-400">Session Summary</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex justify-between p-4 bg-gray-50 rounded-xl">
                                    <span className="text-slate-500 font-bold uppercase text-xs">Room Code</span>
                                    <span className="font-black text-indigo-600">{selectedQuiz.roomCode}</span>
                                </div>
                                <div className="flex justify-between p-4 bg-gray-50 rounded-xl">
                                    <span className="text-slate-500 font-bold uppercase text-xs">Status</span>
                                    <span className="font-black capitalize text-slate-900">{selectedQuiz.status || 'completed'}</span>
                                </div>
                                <div className="flex justify-between p-4 bg-gray-50 rounded-xl col-span-2">
                                    <span className="text-slate-500 font-bold uppercase text-xs">Avg Answers / Participant</span>
                                    <span className="font-black text-slate-900">
                                        {selectedQuiz.participantCount && selectedQuiz.totalAnswers
                                            ? (selectedQuiz.totalAnswers / selectedQuiz.participantCount).toFixed(1)
                                            : '—'}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 pt-2 font-medium">
                                Individual per-participant breakdown with correct/wrong answers is planned for the Studio Pro analytics update.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryDetail;
