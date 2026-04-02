import { Zap } from 'lucide-react';

const LiveView = ({ activeQuiz, currentQuestion, timeLeft, participants, leaderboard, navigate, onAbort }) => {
    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-white p-6 rounded-4xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-4xl font-black text-slate-900">LIVE SESSION</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Room Code // {activeQuiz?.roomCode}</p>
                </div>
                <button onClick={onAbort} className="px-6 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all">
                    END SESSION
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-4xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 font-black text-6xl text-slate-100">#{(currentQuestion?.index || 0) + 1}</div>
                        <h2 className="text-xs font-bold text-indigo-600 uppercase mb-2">Current Question</h2>
                        <p className="text-3xl font-black text-slate-900 leading-tight">{currentQuestion?.text || 'Waiting for question...'}</p>

                        <div className="mt-8 space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase">
                                <span className="text-slate-500">Time Remaining</span>
                                <span className={timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-indigo-600'}>{timeLeft}s</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-1000"
                                    style={{ width: `${(timeLeft / (currentQuestion?.timeLimit || 30)) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Participants</p>
                            <p className="text-3xl font-black text-slate-900">{participants.length}</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Progress</p>
                            <p className="text-3xl font-black text-slate-900">{(currentQuestion?.index || 0) + 1} / {activeQuiz?.questions?.length || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <Zap size={20} className="text-yellow-500 fill-yellow-500" /> LIVE LEADERBOARD
                    </h3>
                    <div className="space-y-3">
                        {leaderboard.map((player, i) => (
                            <div key={player.name || i} className="bg-white shadow-sm p-4 rounded-2xl flex justify-between items-center border-l-4 border-l-indigo-500 animate-in slide-in-from-right" style={{ animationDelay: `${i * 50}ms` }}>
                                <div className="flex items-center gap-3">
                                    <span className="font-black text-slate-400">#{i + 1}</span>
                                    <span className="font-bold text-slate-900">{player.name}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-indigo-600 leading-none">{player.score}</p>
                                    <p className="text-xs text-slate-400 font-bold">{player.time?.toFixed?.(1) || 0}s</p>
                                </div>
                            </div>
                        ))}
                        {leaderboard.length === 0 && <p className="text-slate-400 font-bold text-center py-8 bg-gray-50 rounded-2xl">Tracking progress...</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveView;
