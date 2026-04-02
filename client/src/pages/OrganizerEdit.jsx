import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Play, Trash2, X, AlertCircle, CheckCircle2, ChevronLeft, Zap, Shuffle, ArrowUp, ArrowDown } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { getMyQuizzes, addQuestion as apiAddQuestion, deleteQuestion as apiDeleteQuestion, updateQuestion as apiUpdateQuestion, updateQuiz as apiUpdateQuiz } from '../services/api';
import ConfirmationDialog from '../components/common/ConfirmationDialog';

const Toast = ({ message, type, onClose }) => {
    if (!message) return null;
    const isError = type === 'error';
    return (
        <div className={`fixed top-4 left-1/2 z-200 -translate-x-1/2 flex items-center gap-3 px-6 py-4 bg-white rounded-2xl font-bold shadow-xl border
            ${isError ? 'border-red-200 text-red-600' : 'border-green-200 text-green-600'}`}>
            {isError ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span>{message}</span>
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={16} /></button>
        </div>
    );
};

const OrganizerEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [activeQuiz, setActiveQuiz] = useState(location.state?.quiz || null);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [toast, setToast] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [loading, setLoading] = useState(!activeQuiz);
    const toastTimeoutRef = useRef(null);

    const showToast = (message, type = 'error') => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }
        setToast({ message, type });
        toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
        };
    }, []);

    const showConfirm = (message, onConfirm) => {
        setConfirmDialog({ message, onConfirm });
    };

    const handleToggleShuffleOptions = () => {
        if (!activeQuestion) return;
        const updatedQuestions = [...questions];
        updatedQuestions[activeQuestionIndex] = {
            ...updatedQuestions[activeQuestionIndex],
            shuffleOptions: !updatedQuestions[activeQuestionIndex].shuffleOptions,
        };
        setActiveQuiz({ ...activeQuiz, questions: updatedQuestions });
    };

    const handleToggleShuffleQuestions = () => {
        setActiveQuiz({
            ...activeQuiz,
            shuffleQuestions: !activeQuiz.shuffleQuestions,
        });
    };

    const handleApplyShuffleToAllSlides = () => {
        if (!activeQuestion) return;
        const updatedQuestions = questions.map((question) => ({
            ...question,
            shuffleOptions: !!activeQuestion.shuffleOptions,
        }));
        setActiveQuiz({ ...activeQuiz, questions: updatedQuestions });
        showToast('Shuffle setting applied to all slides', 'success');
    };

    // Move question up
    const handleMoveQuestionUp = (index) => {
        if (index <= 0) return;
        const updatedQuestions = [...questions];
        [updatedQuestions[index], updatedQuestions[index - 1]] = [updatedQuestions[index - 1], updatedQuestions[index]];
        
        setActiveQuiz({ ...activeQuiz, questions: updatedQuestions });
        setActiveQuestionIndex(index - 1);
    };

    // Move question down
    const handleMoveQuestionDown = (index) => {
        if (index >= questions.length - 1) return;
        const updatedQuestions = [...questions];
        [updatedQuestions[index], updatedQuestions[index + 1]] = [updatedQuestions[index + 1], updatedQuestions[index]];
        
        setActiveQuiz({ ...activeQuiz, questions: updatedQuestions });
        setActiveQuestionIndex(index + 1);
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
                } catch {
                    navigate('/organizer-dashboard');
                } finally {
                    setLoading(false);
                }
            };
            fetchQuiz();
        }
    }, [activeQuiz, id, navigate]);

    if (loading || !activeQuiz) return <div className="min-h-screen bg-(--bg-base) flex flex-col items-center justify-center font-bold text-slate-400">Loading editor...</div>;

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
        <div className="fixed inset-0 z-100 bg-(--color-dark) flex flex-col animate-in fade-in duration-300">
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                {confirmDialog && (
                    <ConfirmationDialog
                        open={!!confirmDialog}
                        message={confirmDialog.message}
                        confirmLabel="Delete"
                        onConfirm={confirmDialog.onConfirm}
                        onCancel={() => setConfirmDialog(null)}
                    />
                )}
            </AnimatePresence>

            <header className="h-16 border-b border-(--color-border) bg-(--bg-surface) backdrop-blur-md flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/organizer-dashboard')} className="p-2 hover:bg-gray-100 rounded-xl transition-all text-slate-900">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="h-6 w-px bg-gray-200"></div>
                    <h1 className="font-black tracking-tight text-lg text-slate-900 truncate max-w-50">{activeQuiz.title}</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button className="px-6 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-white text-indigo-600 shadow-sm border border-gray-200">Edit</button>
                        <button
                            onClick={() => navigate(`/results/${activeQuiz._id}`, { state: { quiz: activeQuiz } })}
                            className="px-6 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-700"
                        >
                            Results
                        </button>
                    </div>
                    <button onClick={() => navigate(`/live/${activeQuiz._id}`, { state: { quiz: activeQuiz } })} className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full py-2 px-6 text-xs flex items-center gap-2 font-bold shadow-sm transition-all">
                        <Play size={14} fill="currentColor" /> START PRESENTATION
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <aside className="w-64 border-r border-(--color-border) bg-(--bg-surface) flex flex-col shrink-0">
                    <div className="p-4">
                        <button
                            onClick={async () => {
                                try {
                                    const data = await apiAddQuestion(activeQuiz._id, {
                                        text: 'New Question: Enter your inquiry here...',
                                        options: ['Classic Option A', 'Vibrant Option B', 'Clear Option C', 'Sharp Option D'],
                                        correctOption: 0,
                                        timeLimit: 15,
                                        shuffleOptions: false
                                    });
                                    setActiveQuiz(data);
                                    setActiveQuestionIndex(data.questions.length - 1);
                                    showToast('New slide added!', 'success');
                                } catch {
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
                                className={`group cursor-pointer flex flex-col gap-2`}
                            >
                                <div className={`flex gap-3 items-center relative pr-8`}>
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

                                {/* Reorder Buttons */}
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pl-4">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleMoveQuestionUp(i);
                                        }}
                                        disabled={i === 0}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-blue-100"
                                    >
                                        <ArrowUp size={12} /> Up
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleMoveQuestionDown(i);
                                        }}
                                        disabled={i === questions.length - 1}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-blue-100"
                                    >
                                        <ArrowDown size={12} /> Down
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="flex-1 bg-[#c0c2c9] p-12 overflow-y-auto flex flex-col items-center">
                    <div className="w-full max-w-4xl aspect-16/10 bg-white rounded-4xl p-16 flex flex-col shadow-xl relative border-none">
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
                                                className={`w-full py-6 px-8 rounded-3xl bg-gray-100 border-2 outline-none transition-all font-bold text-center text-slate-900
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

                <aside className="w-80 border-l border-(--color-border) bg-(--bg-surface) p-6 overflow-y-auto shrink-0 space-y-8">
                    <section className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Configuration</h3>

                        <div className="space-y-4">
                            <button
                                onClick={async () => {
                                    if (!activeQuestion) return;
                                    try {
                                        const questionUpdatedQuiz = await apiUpdateQuestion(activeQuiz._id, activeQuestion._id, {
                                            text: activeQuestion.text,
                                            options: activeQuestion.options,
                                            correctOption: activeQuestion.correctOption ?? 0,
                                            timeLimit: activeQuestion.timeLimit,
                                            shuffleOptions: !!activeQuestion.shuffleOptions,
                                        });
                                        const quizUpdated = await apiUpdateQuiz(activeQuiz._id, {
                                            shuffleQuestions: !!activeQuiz.shuffleQuestions,
                                        });
                                        setActiveQuiz({
                                            ...questionUpdatedQuiz,
                                            shuffleQuestions: quizUpdated.shuffleQuestions ?? activeQuiz.shuffleQuestions,
                                        });
                                        showToast('Slides content updated successfully!', 'success');
                                    } catch (err) {
                                        showToast(err.response?.data?.message || 'Failed to save changes');
                                    }
                                }}
                                className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg transition-all"
                            >
                                SAVE SLIDES CONTENT
                            </button>

                            <div className="space-y-3">
                                <button
                                    onClick={handleToggleShuffleOptions}
                                    disabled={!activeQuestion}
                                    className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${activeQuestion?.shuffleOptions
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                        : 'bg-gray-100 border-transparent text-slate-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <span className="text-xs font-black uppercase tracking-[0.15em]">Shuffle Options</span>
                                    <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${activeQuestion?.shuffleOptions ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${activeQuestion?.shuffleOptions ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </span>
                                </button>

                                <button
                                    onClick={handleToggleShuffleQuestions}
                                    className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl border transition-all ${activeQuiz.shuffleQuestions
                                        ? 'bg-orange-50 border-orange-200 text-orange-700'
                                        : 'bg-gray-100 border-transparent text-slate-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <span className="text-xs font-black uppercase tracking-[0.15em]">Shuffle All Questions</span>
                                    <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${activeQuiz.shuffleQuestions ? 'bg-orange-500' : 'bg-slate-300'}`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${activeQuiz.shuffleQuestions ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </span>
                                </button>

                                <button
                                    onClick={handleApplyShuffleToAllSlides}
                                    disabled={!activeQuestion || questions.length < 2}
                                    className="w-full py-3 bg-purple-50 hover:bg-purple-100 text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-black uppercase tracking-[0.15em] border border-purple-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <Shuffle size={14} /> Apply to All Slides
                                </button>
                            </div>

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

                    <div className="pt-12 border-t border-(--color-border)">
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
