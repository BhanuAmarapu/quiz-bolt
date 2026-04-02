import { useEffect, useState } from 'react';
import { Trophy, BarChart2, Users, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';

const optionColors = [
    { bg: 'bg-blue-100', bar: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-violet-100', bar: 'bg-violet-500', text: 'text-violet-700', border: 'border-violet-200' },
    { bg: 'bg-amber-100', bar: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-rose-100', bar: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-200' },
];

const LiveResult = ({ activeQuiz, leaderboard, navigate, sessionCode }) => {
    const topThree = leaderboard.slice(0, 3);
    const others = leaderboard.slice(3, 10); // top 10 only

    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'stats'

    useEffect(() => {
        const code = sessionCode || activeQuiz?.roomCode;
        if (!code) return;
        setLoadingStats(true);
        api.get(`/quiz/session/${code}/results`)
            .then(r => setStats(r.data))
            .catch(() => setStats(null))
            .finally(() => setLoadingStats(false));
    }, [sessionCode, activeQuiz]);

    return (
        <div className="p-8 mx-auto max-w-5xl space-y-10 animate-in fade-in zoom-in duration-700">
            {/* Header */}
            <div className="text-center space-y-3">
                <div className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold tracking-widest rounded-full border border-emerald-200 uppercase">
                    Session Complete
                </div>
                <h1 className="text-5xl font-black text-slate-900 uppercase">Final Results</h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                    {activeQuiz?.title} &middot; Code: {sessionCode || activeQuiz?.roomCode}
                </p>
            </div>

            {/* Podium */}
            <div className="grid grid-cols-3 gap-4 items-end pb-10">
                {/* 2nd */}
                <div className="h-56 bg-white p-6 rounded-4xl shadow-sm flex flex-col items-center justify-end relative border-t-4 border-slate-300">
                    <div className="absolute -top-10 w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-2xl shadow-sm">2</div>
                    <p className="text-base font-black uppercase truncate w-full text-center text-slate-900">{topThree[1]?.name || '—'}</p>
                    <p className="text-3xl font-black text-slate-700">{topThree[1]?.score || 0}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-400 mt-1">Points</p>
                </div>
                {/* 1st */}
                <div className="h-72 bg-gradient-to-t from-yellow-50 to-white p-6 rounded-4xl shadow-md flex flex-col items-center justify-end relative border-t-4 border-yellow-400 scale-105 z-10">
                    <Trophy className="absolute -top-14 text-yellow-500 w-28 h-28" />
                    <p className="text-lg font-black uppercase truncate w-full text-center text-slate-900">{topThree[0]?.name || '—'}</p>
                    <p className="text-5xl font-black text-yellow-500">{topThree[0]?.score || 0}</p>
                    <p className="text-[10px] font-bold uppercase text-yellow-600/70 mt-1">Points</p>
                </div>
                {/* 3rd */}
                <div className="h-44 bg-white p-6 rounded-4xl shadow-sm flex flex-col items-center justify-end relative border-t-4 border-amber-500">
                    <div className="absolute -top-9 w-18 h-18 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-black text-2xl shadow-sm px-4 py-3">3</div>
                    <p className="text-base font-black uppercase truncate w-full text-center text-slate-900">{topThree[2]?.name || '—'}</p>
                    <p className="text-3xl font-black text-slate-700">{topThree[2]?.score || 0}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-400 mt-1">Points</p>
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-2 bg-gray-100 rounded-2xl p-1 w-fit">
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        activeTab === 'leaderboard' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <span className="flex items-center gap-2"><Users size={12} /> Top 10</span>
                </button>
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        activeTab === 'stats' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <span className="flex items-center gap-2"><BarChart2 size={12} /> Question Stats</span>
                </button>
            </div>

            {/* Leaderboard tab */}
            {activeTab === 'leaderboard' && (
                <div className="bg-white rounded-4xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-black text-slate-900 uppercase text-sm">Full Leaderboard</h3>
                        <span className="px-3 py-1 bg-white text-xs font-bold text-slate-500 uppercase rounded-full shadow-sm">
                            {leaderboard.length} Participants
                        </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {[...topThree, ...others].map((p, i) => (
                            <div key={p.name || i} className="flex justify-between items-center px-8 py-4 hover:bg-gray-50 transition-all">
                                <div className="flex items-center gap-5">
                                    <span className={`font-black text-xl w-8 ${
                                        i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : 'text-slate-300'
                                    }`}>#{i + 1}</span>
                                    <span className="font-bold text-lg uppercase tracking-tight text-slate-900">{p.name}</span>
                                </div>
                                <span className="text-2xl font-black text-indigo-600">{p.score}</span>
                            </div>
                        ))}
                        {leaderboard.length === 0 && (
                            <p className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest text-xs">
                                No participants recorded
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Question stats tab */}
            {activeTab === 'stats' && (
                <div className="space-y-6">
                    {loadingStats && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={32} className="text-indigo-500 animate-spin" />
                        </div>
                    )}
                    {!loadingStats && !stats && (
                        <div className="bg-white rounded-4xl p-12 text-center text-slate-400 font-bold border border-gray-100">
                            Stats not available for this session.
                        </div>
                    )}
                    {!loadingStats && stats?.questionStats?.map((q, qi) => (
                        <div key={q.questionId || qi} className="bg-white rounded-4xl border border-gray-100 shadow-sm p-8 space-y-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Q{qi + 1}</span>
                                    <p className="text-xl font-black text-slate-900 leading-snug">{q.text}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-2xl font-black text-slate-900">{q.totalAnswered}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">answered</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {q.options.map((opt, oi) => {
                                    const colors = optionColors[oi % optionColors.length];
                                    return (
                                        <div key={oi} className={`rounded-2xl border p-4 space-y-2 ${
                                            opt.isCorrect
                                                ? 'bg-emerald-50 border-emerald-200'
                                                : `${colors.bg} ${colors.border}`
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {opt.isCorrect
                                                        ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                                        : <XCircle size={14} className={`${colors.text} shrink-0`} />
                                                    }
                                                    <span className={`text-sm font-bold ${opt.isCorrect ? 'text-emerald-800' : colors.text}`}>
                                                        {opt.option}
                                                    </span>
                                                    {opt.isCorrect && (
                                                        <span className="text-[9px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase">
                                                            Correct
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-lg font-black ${opt.isCorrect ? 'text-emerald-700' : colors.text}`}>
                                                        {opt.percentage}%
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium ml-1">({opt.count})</span>
                                                </div>
                                            </div>
                                            {/* Percentage bar */}
                                            <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${opt.isCorrect ? 'bg-emerald-500' : colors.bar}`}
                                                    style={{ width: `${opt.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Correct stat summary */}
                            <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 w-fit">
                                <CheckCircle2 size={14} />
                                {q.correctPercentage}% selected the correct answer
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex justify-center pt-4">
                <button
                    onClick={() => navigate('/organizer-dashboard')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-16 py-4 text-lg font-bold rounded-2xl transition-all"
                >
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
};

export default LiveResult;
