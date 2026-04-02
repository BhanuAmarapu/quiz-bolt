import { memo } from 'react';
import { Trophy } from 'lucide-react';

const FinishedScreen = ({ leaderboard }) => {
    return (
        <div className="max-w-4xl mx-auto p-8 text-center space-y-12 animate-in zoom-in duration-700">
            <div className="space-y-4">
                <h1 className="text-7xl font-black tracking-tighter text-indigo-600">
                    QUIZ COMPLETE
                </h1>
                <p className="text-slate-500 text-xl font-bold">Final Standings</p>
            </div>

            <div className="bg-white p-10 space-y-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500" />
                <h2 className="text-3xl font-bold flex items-center justify-center gap-3 text-slate-900">
                    <Trophy className="text-yellow-500" size={32} /> Top Participants
                </h2>
                <div className="space-y-4">
                    {leaderboard.map((entry, i) => (
                        <div
                            key={entry._id || entry.userId || `${entry.name}-${i}`}
                            className={`flex justify-between items-center p-6 rounded-2xl ${
                                i === 0
                                    ? 'bg-yellow-50 border-2 border-yellow-400 scale-105 shadow-xl'
                                    : 'bg-gray-50 border border-gray-100'
                            }`}
                        >
                            <div className="flex items-center gap-6">
                                <span className={`text-3xl font-black w-10 ${
                                    i === 0 ? 'text-yellow-500' : 'text-slate-400'
                                }`}>
                                    {i + 1}
                                </span>
                                <span className="font-black text-2xl tracking-tight text-slate-900">
                                    {entry.name}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black text-indigo-600">{entry.score}</p>
                                <p className="text-xs text-slate-400 font-bold uppercase">
                                    {entry.time?.toFixed(2)}s Response
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default memo(FinishedScreen);
