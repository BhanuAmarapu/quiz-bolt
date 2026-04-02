import { useState, useEffect, useCallback } from 'react';
import { Plus, Play, Trash2, X, Check, Zap, Folder, ChevronLeft, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import {
    createQuiz as apiCreateQuiz,
    deleteQuiz as apiDeleteQuiz,
    updateQuiz as apiUpdateQuiz
} from '../services/api';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/common/Toast';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import useToast from '../hooks/useToast';

const OrganizerDashboard = () => {
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newQuizTitle, setNewQuizTitle] = useState('');
    const [activeQuiz, setActiveQuiz] = useState(null);

    // Hierarchical Management
    const [currentSubject, setCurrentSubject] = useState(null);
    const [quizType, setQuizType] = useState('quiz');

    // UI state
    const [confirmDialog, setConfirmDialog] = useState(null);

    // Inline rename state
    const [editingQuizId, setEditingQuizId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');

    const { user } = useAuth();
    const { getQuizzesForParent, setQuizzesForParent } = useAppData();
    const { toast, showToast, clearToast } = useToast();

    // Payment / monetization state
    const [isPaid, setIsPaid] = useState(false);
    const [quizPrice, setQuizPrice] = useState('');

    const showConfirm = (message, onConfirm) => {
        setConfirmDialog({ message, onConfirm });
    };

    const fetchQuizzes = useCallback(async () => {
        try {
            const parentId = currentSubject ? currentSubject._id : 'none';
            const data = await getQuizzesForParent(parentId);
            setQuizzes(data);
        } catch {
            showToast('Failed to load quizzes');
        }
    }, [currentSubject, showToast, getQuizzesForParent]);

    useEffect(() => {
        fetchQuizzes();
    }, [fetchQuizzes]);

    const handleRenameQuiz = async (quizId) => {
        if (!editingTitle.trim()) {
            setEditingQuizId(null);
            return;
        }
        try {
            const updated = await apiUpdateQuiz(quizId, { title: editingTitle.trim() });
            const next = quizzes.map(q => q._id === updated._id ? updated : q);
            setQuizzes(next);
            const parentId = currentSubject ? currentSubject._id : 'none';
            setQuizzesForParent(parentId, next);
            if (activeQuiz && activeQuiz._id === updated._id) setActiveQuiz(updated);
            showToast('Title updated!', 'success');
        } catch {
            showToast('Failed to rename');
        } finally {
            setEditingQuizId(null);
            setEditingTitle('');
        }
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
            const next = [data, ...quizzes];
            setQuizzes(next);
            const parentId = currentSubject ? currentSubject._id : 'none';
            setQuizzesForParent(parentId, next);
            setNewQuizTitle('');
            setShowCreate(false);
            setIsPaid(false);
            setQuizPrice('');
            if (data.type === 'quiz') {
                setActiveQuiz(data);
                navigate(`/edit/${data._id}`);
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
                const next = quizzes.filter(q => q._id !== quizId);
                setQuizzes(next);
                const parentId = currentSubject ? currentSubject._id : 'none';
                setQuizzesForParent(parentId, next);
                showToast('Project deleted', 'success');
            } catch {
                showToast('Failed to delete project');
            }
        });
    };

    // ─── List View (Main Dashboard) ────────────────────────────────────────────
    return (
        <>
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
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

            <div className="p-8 space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900">STUDIO</h1>
                        <p className="text-slate-500 font-medium">Welcome back, <span className="text-indigo-600 font-bold">{user.name}</span></p>
                    </div>
                    {!currentSubject && (
                        <button onClick={() => setShowCreate(!showCreate)} className="btn-premium px-8 py-4 group">
                            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                            {showCreate ? 'Close Menu' : 'New Project'}
                        </button>
                    )}
                </div>

                {currentSubject && (
                    <div className="flex items-center gap-6 p-4 bg-white rounded-3xl animate-in slide-in-from-left shadow-sm border border-gray-100">
                        <button onClick={() => setCurrentSubject(null)} className="p-4 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all text-slate-600">
                            <ChevronLeft />
                        </button>
                        <div>
                            <h2 className="text-3xl font-black text-indigo-700 leading-none">{currentSubject.title}</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Management Chamber // Sub-directory</p>
                        </div>
                        <button
                            onClick={() => { setQuizType('quiz'); setShowCreate(!showCreate); }}
                            className="ml-auto bg-indigo-600 text-white rounded-2xl px-6 py-3 text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
                        >
                            <Plus size={16} /> {showCreate ? 'CANCEL' : 'ADD QUIZ'}
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes.map((quiz) => (
                        <div key={quiz._id} className={`bg-white rounded-4xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden group ${quiz.type === 'subject' ? 'border-l-4 border-l-indigo-400' : ''}`}>
                            <div className="p-8 space-y-6 relative">
                                {quiz.type === 'subject' ? (
                                    <>
                                        <div className="flex justify-between items-start">
                                            <div className="p-3 bg-indigo-50 rounded-2xl">
                                                <Folder className="text-indigo-600" size={24} />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingQuizId(quiz._id); setEditingTitle(quiz.title); }}
                                                    className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
                                                    title="Rename"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteQuiz(quiz._id); }}
                                                    className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full uppercase">Folder</span>
                                            </div>
                                        </div>
                                        {editingQuizId === quiz._id ? (
                                            <div className="flex items-center gap-2 w-full mt-2" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    autoFocus
                                                    className="w-full text-base font-bold py-2 px-4 bg-gray-50 border border-indigo-200 rounded-xl flex-1 text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
                                                    value={editingTitle}
                                                    onChange={(e) => setEditingTitle(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleRenameQuiz(quiz._id);
                                                        if (e.key === 'Escape') setEditingQuizId(null);
                                                    }}
                                                />
                                                <button onClick={() => handleRenameQuiz(quiz._id)} className="p-2.5 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-all"><Check size={16} /></button>
                                                <button onClick={() => setEditingQuizId(null)} className="p-2.5 bg-gray-100 text-slate-500 rounded-xl hover:bg-gray-200 transition-all"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <h3
                                                className="text-2xl font-black text-slate-900 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                                                onDoubleClick={() => { setEditingQuizId(quiz._id); setEditingTitle(quiz.title); }}
                                                title="Double-click to rename"
                                            >{quiz.title}</h3>
                                        )}
                                        <p className="text-xs font-bold text-slate-500">Container for nested quizzes.</p>
                                        <button
                                            onClick={() => setCurrentSubject(quiz)}
                                            className="w-full py-4 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-2xl text-xs font-bold transition-all"
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
                                                        className="w-full text-base font-bold py-2 px-4 bg-gray-50 border border-indigo-200 rounded-xl flex-1 text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
                                                        value={editingTitle}
                                                        onChange={(e) => setEditingTitle(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleRenameQuiz(quiz._id);
                                                            if (e.key === 'Escape') setEditingQuizId(null);
                                                        }}
                                                    />
                                                    <button onClick={() => handleRenameQuiz(quiz._id)} className="p-2.5 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-all"><Check size={16} /></button>
                                                    <button onClick={() => setEditingQuizId(null)} className="p-2.5 bg-gray-100 text-slate-500 rounded-xl hover:bg-gray-200 transition-all"><X size={16} /></button>
                                                </div>
                                            ) : (
                                                <h3
                                                    className="text-2xl font-black text-slate-900 w-3/4 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                                                    onDoubleClick={() => { setEditingQuizId(quiz._id); setEditingTitle(quiz.title); }}
                                                    title="Double-click to rename"
                                                >{quiz.title}</h3>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleDeleteQuiz(quiz._id)}
                                                    className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 text-xs font-bold text-slate-500">
                                            <span className="flex items-center gap-1.5"><Zap size={12} className="text-indigo-500" /> {quiz.questions?.length || 0} Slides</span>
                                            <span>Status: <span className="text-slate-900 capitalize">{quiz.status}</span></span>
                                            {quiz.isPaid && <span className="text-emerald-600 font-black">₹{quiz.price}</span>}
                                        </div>
                                        <div className="flex gap-3 pt-4">
                                            <button
                                                onClick={() => navigate(`/edit/${quiz._id}`, { state: { quiz } })}
                                                className="p-3 bg-gray-50 hover:bg-gray-100 text-slate-600 rounded-xl text-xs font-bold transition-all"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => navigate(`/live/${quiz._id}`, { state: { quiz } })}
                                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm group/btn"
                                            >
                                                <Play size={12} fill="currentColor" /> Go Live
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {showCreate && (
                    <div className="bg-white p-8 space-y-6 mt-12 animate-in slide-in-from-bottom duration-300 border border-gray-100 rounded-4xl shadow-sm">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-black text-slate-900 uppercase">
                                {currentSubject ? `New Quiz in ${currentSubject.title}` : 'New Project Configuration'}
                            </h3>
                            {!currentSubject && (
                                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                                    <button
                                        onClick={() => setQuizType('quiz')}
                                        className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${quizType === 'quiz' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Single Blitz
                                    </button>
                                    <button
                                        onClick={() => setQuizType('subject')}
                                        className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${quizType === 'subject' ? 'bg-yellow-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Multi-Quiz Subject
                                    </button>
                                </div>
                            )}
                            {currentSubject && (
                                <span className="px-4 py-2 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg uppercase">Sub-Directory Quiz</span>
                            )}
                        </div>
                        <div className="flex gap-4">
                            <input
                                className="w-full flex-1 bg-gray-50 border border-gray-200 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-400"
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
                                        className={`relative w-12 h-6 rounded-full transition-colors border ${isPaid ? 'bg-emerald-500 border-emerald-500' : 'bg-gray-200 border-gray-300'}`}
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
                                            className="w-32 bg-gray-50 border border-gray-200 text-slate-900 text-center py-2 px-4 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
                                            placeholder="Price"
                                            value={quizPrice}
                                            onChange={(e) => setQuizPrice(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <p className="text-xs font-bold text-slate-500 uppercase">
                            {quizType === 'quiz' ? 'Creates a standalone high-speed competitive quiz.' : 'Creates a collaborative folder to group multiple quizzes with a cumulative leaderboard.'}
                        </p>
                    </div>
                )}

                {/* Leaderboard modal removed as requested */}
            </div>
        </>
    );
};

export default OrganizerDashboard;
