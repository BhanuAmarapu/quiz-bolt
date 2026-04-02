import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, Trophy, Clock, ExternalLink, Search } from 'lucide-react';
import { getOrganizerHistory } from '../services/api';

const QuizResults = () => {
    const { quizId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const quizTitle = location.state?.quiz?.title || location.state?.quizTitle || 'Quiz Results';

    useEffect(() => {
        const fetchResults = async () => {
            try {
                setLoading(true);
                setError('');
                const data = await getOrganizerHistory();
                const filtered = data.filter((record) => String(record.quizId) === String(quizId));
                setRecords(filtered);
            } catch {
                setError('Failed to load quiz results.');
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [quizId]);

    const filteredRecords = useMemo(() => {
        return records.filter((record) => {
            const q = search.toLowerCase();
            return (
                (record.roomCode || '').toLowerCase().includes(q) ||
                (record.title || record.quizTitle || '').toLowerCase().includes(q)
            );
        });
    }, [records, search]);

    const totalSessions = records.length;
    const totalParticipants = records.reduce((sum, record) => sum + (record.participantCount || 0), 0);
    const totalAnswers = records.reduce((sum, record) => sum + (record.totalAnswers || 0), 0);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <button
                    onClick={() => navigate(`/edit/${quizId}`)}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors"
                >
                    <ArrowLeft size={18} /> Back to Edit
                </button>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by room code..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-indigo-500 transition-colors shadow-sm placeholder:text-slate-400 placeholder:font-medium"
                    />
                </div>
            </div>

            <div className="bg-white border border-gray-100 shadow-sm rounded-4xl p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-gray-100 pb-6">
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Quiz Results</p>
                        <h1 className="text-4xl font-black text-slate-900 mt-2">{quizTitle}</h1>
                        <p className="text-slate-500 font-medium mt-1">All previous attempts for this quiz.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                        <div className="bg-gray-50 rounded-2xl px-4 py-3 text-center border border-gray-100">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sessions</p>
                            <p className="text-2xl font-black text-slate-900">{totalSessions}</p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl px-4 py-3 text-center border border-gray-100">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Participants</p>
                            <p className="text-2xl font-black text-slate-900">{totalParticipants}</p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl px-4 py-3 text-center border border-gray-100">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Answers</p>
                            <p className="text-2xl font-black text-slate-900">{totalAnswers}</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-slate-400 font-bold">Loading results...</div>
                ) : error ? (
                    <div className="py-16 text-center text-red-500 font-bold">{error}</div>
                ) : filteredRecords.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 font-bold">No previous attempts found for this quiz.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredRecords.map((record) => (
                            <button
                                key={record.roomCode}
                                onClick={() => navigate(`/history/${record.roomCode}`, { state: { record } })}
                                className="text-left bg-gray-50 hover:bg-white border border-gray-100 hover:border-indigo-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-lg font-black text-slate-900">{record.roomCode}</p>
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">
                                            {new Date(record.createdAt || record.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                    <ExternalLink size={16} className="text-slate-400 shrink-0 mt-1" />
                                </div>

                                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-white rounded-xl border border-gray-100 py-3">
                                        <Users size={16} className="mx-auto text-indigo-600" />
                                        <p className="text-sm font-black text-slate-900 mt-1">{record.participantCount ?? 0}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Users</p>
                                    </div>
                                    <div className="bg-white rounded-xl border border-gray-100 py-3">
                                        <Trophy size={16} className="mx-auto text-indigo-600" />
                                        <p className="text-sm font-black text-slate-900 mt-1">{record.totalAnswers ?? 0}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Answers</p>
                                    </div>
                                    <div className="bg-white rounded-xl border border-gray-100 py-3">
                                        <Clock size={16} className="mx-auto text-indigo-600" />
                                        <p className="text-sm font-black text-slate-900 mt-1">{record.status || 'completed'}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</p>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    <Calendar size={14} className="text-indigo-500" />
                                    Previous Attempt
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizResults;