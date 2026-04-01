import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Play, Trash2, X, AlertCircle, CheckCircle2, ChevronLeft, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyQuizzes, addQuestion as apiAddQuestion, deleteQuestion as apiDeleteQuestion, updateQuestion as apiUpdateQuestion } from '../services/api';

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

const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-8 rounded-[2rem] max-w-sm w-full mx-4 space-y-6 border border-gray-100 shadow-xl"
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
                    className="flex-1 py-3 bg-gray-50 rounded-xl text-sm font-bold text-slate-700 hover:bg-gray-100 transition-all border border-gray-200"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold transition-all border border-red-200"
                >
                    Delete
                </button>
            </div>
        </motion.div>
    </div>
);

const OrganizerEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [activeQuiz, setActiveQuiz] = useState(location.state?.quiz || null);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [toast, setToast] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [loading, setLoading] = useState(!activeQuiz);

    const showToast = (message, type = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const showConfirm = (message, onConfirm) => {
        setConfirmDialog({ message, onConfirm });
    };

    useEffect(() => {
        if (!activeQuiz) {
            const fetchQuiz = async () => {
                try {
                    const quizzes = await getMyQuizzes(); // Fetch all to find the one we need
                    const found = quizzes.find(q => q._id === id);
                    if (found) {
                        setActiveQuiz(found);
                    } else {
                        navigate('/organizer-dashboard');
                    }
                } catch (err) {
                    navigate('/organizer-dashboard');
                } finally {
                    setLoading(false);
                }
            };
            fetchQuiz();
        }
    }, [activeQuiz, id, navigate]);

    if (loading || !activeQuiz) return <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center font-bold text-slate-400">Loading editor...</div>;

    const questions = activeQuiz.questions || [];
    const activeQuestion = questions[activeQuestionIndex];

    const handleDeleteQuestion = (qId) => {
        if (!qId) {
            showToast('Cannot identify slide to delete');
            return;
        }
        showConfirm('Delete this slide permanently?', async () => {
            try {
                const data = await apiDeleteQuestion(activeQuiz._id, qId);
                setActiveQuiz(data);
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

    return (
        <div className="fixed inset-0 z-[100] bg-[var(--color-dark)] flex flex-col animate-in fade-in duration-300">
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

            <header className="h-16 border-b border-[var(--color-border)] bg-[var(--bg-surface)] backdrop-blur-md flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/organizer-dashboard')} className="p-2 hover:bg-gray-100 rounded-xl transition-all text-slate-900">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="h-6 w-px bg-gray-200"></div>
                    <h1 className="font-black tracking-tight text-lg text-slate-900 truncate max-w-[200px]">{activeQuiz.title}</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button className="px-6 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-white text-indigo-600 shadow-sm border border-gray-200">Create</button>
                        <button className="px-6 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-700 opacity-50 cursor-not-allowed">Results</button>
                    </div>
                    <button onClick={() => navigate(`/live/${activeQuiz._id}`, { state: { quiz: activeQuiz } })} className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full py-2 px-6 text-xs flex items-center gap-2 font-bold shadow-sm transition-all">
                        <Play size={14} fill="currentColor" /> START PRESENTATION
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
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
                            className="w-full py-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl font-bold text-xs tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
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
                                    ${activeQuestionIndex === i ? 'border-indigo-500 bg-white shadow-sm' : 'border-gray-200 bg-gray-50 hover:border-indigo-400'}`}
                                >
                                    <div className="w-full h-1 bg-slate-400 rounded-full"></div>
                                    <div className="w-2/3 h-1 bg-slate-300 rounded-full"></div>
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

                <main className="flex-1 bg-[#c0c2c9] p-12 overflow-y-auto flex flex-col items-center">
                    <div className="w-full max-w-4xl aspect-[16/10] bg-white rounded-[2rem] p-16 flex flex-col shadow-xl relative border-none">
                        <div className="absolute top-8 right-12 opacity-20">
                            <Zap className="fill-indigo-500 text-indigo-500" size={32} />
                        </div>

                        {activeQuestion ? (
                            <div className="flex-1 flex flex-col space-y-12">
                                <textarea
                                    className="bg-transparent border-none outline-none text-4xl font-black text-center w-full resize-none placeholder:text-slate-300 tracking-tight text-slate-900"
                                    placeholder="Type your question here..."
                                    value={activeQuestion.text}
                                    onChange={(e) => {
                                        const updatedQuestions = [...questions];
                                        updatedQuestions[activeQuestionIndex].text = e.target.value;
                                        setActiveQuiz({ ...activeQuiz, questions: updatedQuestions });
                                    }}
                                />

                                <div className="grid grid-cols-2 gap-6 flex-1">
                                    {activeQuestion.options.map((opt, i) => {
                                        const isCorrect = activeQuestion.correctOption === i;
                                        return (
                                        <div key={i} className={`relative flex items-center transition-all duration-300 group`}>
                                            <div className={`absolute -top-3 left-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest z-10 flex items-center gap-1
                                                ${isCorrect ? 'bg-green-500 text-white shadow-sm' : 'bg-slate-700 text-white'}`}>
                                                Option {i + 1} {isCorrect && <CheckCircle2 size={12} />}
                                            </div>
                                            <input
                                                className={`w-full py-6 px-8 rounded-[1.5rem] bg-gray-100 border-2 outline-none transition-all font-bold text-center text-slate-900
                                                    ${isCorrect ? 'border-green-400 bg-white' : 'border-transparent focus:border-indigo-500'}`}
                                                placeholder={`Option ${i + 1}`}
                                                value={opt}
                                                onChange={(e) => {
                                                    const updatedQuestions = [...questions];
                                                    updatedQuestions[activeQuestionIndex].options[i] = e.target.value;
                                                    setActiveQuiz({ ...activeQuiz, questions: updatedQuestions });
                                                }}
                                            />
                                        </div>
                                    )})}
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
                                className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg transition-all"
                            >
                                SAVE SLIDE CONTENT
                            </button>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Question Type</label>
                                <div className="relative">
                                    <select className="w-full px-4 py-3 bg-gray-100 border border-transparent rounded-xl outline-none font-bold text-slate-900 appearance-none">
                                        <option>Multiple Choice</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                        <Zap size={14} className="fill-indigo-500 text-indigo-500" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Time Limit</label>
                                <select
                                    className="w-full px-4 py-3 bg-gray-100 border border-transparent rounded-xl outline-none font-bold text-slate-900"
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
                                    className="w-full px-4 py-3 bg-gray-100 border border-transparent rounded-xl outline-none font-bold text-slate-900"
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
                            className="w-full py-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-xs font-black tracking-widest transition-all border border-red-100 flex items-center justify-center gap-2"
                        >
                            <Trash2 size={16} /> DELETE SLIDE
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default OrganizerEdit;
