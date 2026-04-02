import { memo } from 'react';
import { Users } from 'lucide-react';

const WaitingLobby = ({ quizTitle, participants }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-6">
                <div className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 text-[10px] font-black tracking-widest rounded-full border border-indigo-200 uppercase animate-pulse">
                    Waiting for host
                </div>
                <h1 className="text-6xl font-black tracking-tight text-slate-900 uppercase">
                    {quizTitle || 'Joining Session...'}
                </h1>
                <p className="text-slate-500 text-lg font-medium tracking-wide">
                    The quiz session is being prepared. Please wait for the host to begin.
                </p>
            </div>

            <div className="bg-white p-8 w-full max-w-md border border-gray-100 rounded-3xl shadow-sm">
                <div className="flex items-center gap-3 mb-6 text-indigo-600 border-b border-gray-100 pb-4">
                    <Users size={24} />
                    <h3 className="text-xl font-bold uppercase tracking-widest text-slate-900">
                        Lobby ({participants.length})
                    </h3>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                    {participants.map((p, i) => (
                        <div
                            key={p._id || i}
                            className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-center font-bold text-slate-800 transition-transform duration-200 hover:scale-[1.02]"
                        >
                            {p.name}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default memo(WaitingLobby);
