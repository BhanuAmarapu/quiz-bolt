import { Trophy } from 'lucide-react';

const LiveResult = ({ activeQuiz, leaderboard, navigate }) => {
    const topThree = leaderboard.slice(0, 3);
    const others = leaderboard.slice(3);

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-12 animate-in fade-in zoom-in duration-700">
            <div className="text-center space-y-4">
                <div className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold tracking-widest rounded-full border border-emerald-100 uppercase">Session Complete</div>
                <h1 className="text-5xl font-black text-slate-900 uppercase">Final Results</h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Summary for {activeQuiz?.title}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end pb-12">
                <div className="order-2 md:order-1 h-64 bg-white p-8 rounded-4xl shadow-sm flex flex-col items-center justify-end relative border-t-4 border-slate-300">
                    <div className="absolute -top-12 w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-3xl">2</div>
                    <p className="text-xl font-bold uppercase mb-2 truncate w-full text-center text-slate-900">{topThree[1]?.name || '—'}</p>
                    <p className="text-3xl font-black text-slate-700">{topThree[1]?.score || 0}</p>
                    <p className="text-xs font-bold uppercase text-slate-400">Points</p>
                </div>

                <div className="order-1 md:order-2 h-80 bg-linear-to-t from-yellow-50 to-white p-8 rounded-4xl shadow-md flex flex-col items-center justify-end relative border-t-4 border-yellow-400 scale-105 z-10">
                    <Trophy className="absolute -top-16 text-yellow-500 w-32 h-32" />
                    <p className="text-2xl font-bold uppercase mb-2 truncate w-full text-center text-slate-900">{topThree[0]?.name || '—'}</p>
                    <p className="text-5xl font-black text-yellow-500">{topThree[0]?.score || 0}</p>
                    <p className="text-xs font-bold uppercase text-yellow-600/60">Points</p>
                </div>

                <div className="order-3 h-52 bg-white p-8 rounded-4xl shadow-sm flex flex-col items-center justify-end relative border-t-4 border-amber-600">
                    <div className="absolute -top-12 w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-black text-2xl">3</div>
                    <p className="text-xl font-bold uppercase mb-2 truncate w-full text-center text-slate-900">{topThree[2]?.name || '—'}</p>
                    <p className="text-3xl font-black text-slate-700">{topThree[2]?.score || 0}</p>
                    <p className="text-xs font-bold uppercase text-slate-400">Points</p>
                </div>
            </div>

            <div className="bg-white rounded-4xl shadow-sm overflow-hidden border border-gray-100">
                <div className="p-8 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 uppercase text-sm">Full Leaderboard</h3>
                    <span className="px-3 py-1 bg-white text-xs font-bold text-slate-500 uppercase rounded-full shadow-sm">{leaderboard.length} Participants</span>
                </div>
                <div className="max-h-[40vh] overflow-y-auto p-4 space-y-2">
                    {others.map((p, i) => (
                        <div key={p.name || i} className="flex justify-between items-center p-6 rounded-2xl hover:bg-gray-50 transition-all">
                            <div className="flex items-center gap-6">
                                <span className="font-black text-slate-400 w-8 text-xl">#{i + 4}</span>
                                <span className="font-bold text-xl uppercase tracking-tight text-slate-900">{p.name}</span>
                            </div>
                            <span className="text-2xl font-black text-indigo-600">{p.score}</span>
                        </div>
                    ))}
                    {others.length === 0 && (
                        <p className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest text-xs">No additional participants</p>
                    )}
                </div>
            </div>

            <div className="flex justify-center pt-8">
                <button
                    onClick={() => navigate('/organizer-dashboard')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-16 py-5 text-lg font-bold rounded-2xl transition-all"
                >
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
};

export default LiveResult;
