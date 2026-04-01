import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Award, Users, Search, Clock, Zap, Trophy, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserHistory, getOrganizerHistory, getQuizLeaderboard } from '../services/api';

const History = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    // Leaderboard State
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [subjectLeaderboard, setSubjectLeaderboard] = useState([]);
    const [leaderboardMeta, setLeaderboardMeta] = useState({ title: '', sub: '', accent: 'primary' });

    const openLeaderboard = async (e, record) => {
        e.stopPropagation(); // prevent card click
        try {
            // Note: If user is participant, they might just see their own points or we show top 10 for that session's quizId
            // The record should have quizId from our backend adjustment for organizers
            // For participants, user history might not have quizId currently, but let's try
            const qId = record.quizId || record.quiz?._id || record._id; // Fallbacks
            if (!qId) {
                alert('Cannot fetch standings for this record.');
                return;
            }
            const data = await getQuizLeaderboard(qId);
            setSubjectLeaderboard(data);
            setLeaderboardMeta({
                title: record.title || record.quizTitle || 'Quiz',
                sub: 'Top Legends',
                accent: 'primary'
            });
            setIsLeaderboardOpen(true);
        } catch (err) {
            console.error(err);
        }
    };

    const filteredHistory = history.filter(record => 
        (record.title || record.quizTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.roomCode || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

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
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="bg-white p-8 text-center space-y-4 max-w-sm rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-red-400 font-bold">{error}</p>
                <button onClick={() => window.location.reload()} className="btn-premium text-sm px-6 py-2">
                    Retry
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 uppercase">History</h1>
                    <p className="text-slate-500 font-bold mt-1 tracking-tight">
                        {user.role === 'organizer' ? 'Archive of your conducted sessions' : 'Recap of your quiz performances'}
                    </p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by title or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-indigo-500 transition-colors shadow-sm placeholder:text-slate-400 placeholder:font-medium"
                    />
                </div>
            </div>

            {history.length === 0 ? (
                <div className="bg-white p-20 flex flex-col items-center justify-center text-center space-y-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <div className="p-6 bg-gray-50 rounded-full shadow-sm text-slate-400">
                        <Clock size={48} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase">No Battles Fought Yet</h3>
                        <p className="text-slate-500 font-bold max-w-xs text-sm mt-2">Your legacy awaits in the arena. Participate in or host a quiz to see it here.</p>
                    </div>
                </div>
            ) : filteredHistory.length === 0 ? (
                <div className="bg-white p-12 text-center text-slate-500 rounded-[2rem] border border-gray-100 shadow-sm">
                    <p className="font-bold text-lg uppercase">No matching records found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredHistory.map((record, i) => (
                        <div 
                            key={record.roomCode || i} 
                            onClick={() => navigate(`/history/${record.roomCode}`, { state: { record } })}
                            className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-1 hover:border-indigo-200 cursor-pointer transition-all duration-300"
                        >
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <h3 
                                        className="text-xl font-black text-slate-900 w-3/4 truncate"
                                    >
                                        {record.quizTitle || record.title}
                                    </h3>
                                    <span className="text-[10px] bg-gray-100 px-2 flex items-center justify-center py-1 rounded-md font-bold text-slate-500 uppercase tracking-widest">{record.roomCode}</span>
                                </div>
                                
                                <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                                    <span className="flex items-center gap-1.5 border border-gray-100 px-2 py-1 rounded-lg">
                                        <Calendar size={14} className="text-indigo-500" /> {new Date(record.date || record.createdAt).toLocaleDateString()}
                                    </span>
                                    {user.role === 'participant' ? (
                                        <span className="flex items-center gap-1.5 border border-indigo-100 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">
                                            <Award size={14} /> {record.totalScore || 0} pts
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-2 py-1 rounded-lg">
                                            <Users size={14} className="text-indigo-600" /> {record.participantCount || 0} users
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-indigo-600 tracking-widest flex items-center gap-1 group-hover:text-indigo-700">
                                    View Details <Zap size={10} className="fill-indigo-600" />
                                </span>
                                <button
                                    onClick={(e) => openLeaderboard(e, record)}
                                    className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all"
                                    title="View Standings"
                                >
                                    <Trophy size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Leaderboard Modal */}
            {isLeaderboardOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
                    <div className={`bg-white w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col rounded-[2rem] shadow-2xl animate-in zoom-in duration-300`}>
                        <div className={`p-10 border-b border-gray-100 flex justify-between items-center bg-gray-50`}>
                            <div>
                                <h2 className="text-4xl font-black text-slate-900 uppercase truncate max-w-[400px]">{leaderboardMeta.title}</h2>
                                <p className={`text-xs font-bold text-slate-500 uppercase mt-1`}>{leaderboardMeta.sub}</p>
                            </div>
                            <button onClick={() => setIsLeaderboardOpen(false)} className="p-4 bg-white rounded-2xl hover:bg-gray-100 transition-all border border-gray-100 text-slate-600"><X /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-3">
                            {subjectLeaderboard.map((player, i) => (
                                <div key={player.name || i} className="bg-white shadow-sm p-5 flex items-center justify-between border border-gray-100 rounded-2xl hover:shadow-md transition-all">
                                    <div className="flex items-center gap-5">
                                        <span className={`text-2xl font-black ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : 'text-slate-300'}`}>
                                            #{i + 1}
                                        </span>
                                        <div>
                                            <p className="font-black text-lg uppercase leading-none tracking-tight text-slate-900">{player.name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-2xl font-black leading-none text-slate-900`}>{player.score}</p>
                                        <p className="text-xs font-bold uppercase text-slate-400">
                                            {player.time ? player.time.toFixed(1) + 's avg' : 'Points'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {subjectLeaderboard.length === 0 && (
                                <p className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">No mastery data recorded yet...</p>
                            )}
                        </div>
                        <div className={`p-6 bg-gray-50 text-slate-900 border-t border-gray-100 text-center font-black uppercase`}>
                            Top {subjectLeaderboard.length} Legends
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default History;
