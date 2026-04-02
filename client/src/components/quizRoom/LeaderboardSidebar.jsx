import { memo } from 'react';
import { Trophy } from 'lucide-react';

const LeaderboardSidebar = ({ leaderboard }) => {
    return (
        <div className="space-y-6 max-h-[35vh] lg:max-h-none overflow-y-auto w-full scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-2 pb-2">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <h3 className="text-2xl font-black flex items-center gap-3 mb-6 font-sans text-slate-900">
                    <Trophy className="text-yellow-500" /> Leaderboard
                </h3>
                <div className="space-y-4">
                    {leaderboard.map((entry, i) => (
                        <div
                            key={entry._id || entry.userId || `${entry.name}-${i}`}
                            className={`flex justify-between items-center p-4 rounded-2xl border ${
                                i === 0
                                    ? 'bg-yellow-50 border-yellow-300 shadow-lg'
                                    : i === 1
                                    ? 'bg-gray-50 border-gray-200'
                                    : i === 2
                                    ? 'bg-orange-50 border-orange-200'
                                    : 'bg-white border-gray-100'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`text-lg font-black w-6 ${
                                    i === 0
                                        ? 'text-yellow-500'
                                        : i === 1
                                        ? 'text-gray-400'
                                        : i === 2
                                        ? 'text-orange-500'
                                        : 'text-slate-400'
                                }`}>
                                    #{i + 1}
                                </span>
                                <span className="font-bold text-slate-800 text-sm">{entry.name}</span>
                            </div>
                            <span className="font-black text-indigo-600 text-lg">{entry.score}</span>
                        </div>
                    ))}
                    {leaderboard.length === 0 && (
                        <p className="text-center py-8 text-slate-400 font-bold text-sm">
                            No scores yet...
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(LeaderboardSidebar);
