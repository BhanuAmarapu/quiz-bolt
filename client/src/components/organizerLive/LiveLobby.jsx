import { useState, useEffect } from 'react';
import { Play, Zap, CalendarClock, Clock, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

// Formats ms remaining into HH:MM:SS
const formatCountdown = (ms) => {
    if (ms <= 0) return '00:00:00';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
};

const LiveLobby = ({ activeQuiz, participants, navigate, startQuizBroadcast, showToast, onAbort }) => {
    const isScheduled = !!activeQuiz?.scheduledAt;
    const scheduledDate = isScheduled ? new Date(activeQuiz.scheduledAt) : null;

    const joinUrl = `${window.location.origin}/quiz/${activeQuiz.roomCode}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}&bgcolor=e0e7ff&color=4f46e5&margin=10`;

    const [copied, setCopied] = useState(false);
    const [countdown, setCountdown] = useState(scheduledDate ? scheduledDate - Date.now() : 0);
    const [canLaunch, setCanLaunch] = useState(!isScheduled || (scheduledDate && scheduledDate <= new Date()));

    // Countdown timer for scheduled sessions
    useEffect(() => {
        if (!isScheduled) return;
        const tick = () => {
            const remain = scheduledDate - Date.now();
            setCountdown(remain);
            if (remain <= 0) setCanLaunch(true);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [isScheduled, scheduledDate]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(joinUrl);
        setCopied(true);
        showToast('Link copied!', 'success');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(activeQuiz.roomCode);
        showToast('Code copied!', 'success');
    };

    return (
        <div className="p-8 mx-auto space-y-10 animate-in fade-in zoom-in duration-500">
            {/* Header bar */}
            <div className="flex justify-between items-center bg-white p-8 rounded-4xl shadow-sm border border-gray-100">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        {isScheduled ? (
                            <span className="px-3 py-1 bg-violet-100 text-violet-700 text-[10px] font-bold tracking-widest rounded-full uppercase flex items-center gap-1.5">
                                <CalendarClock size={10} /> Scheduled
                            </span>
                        ) : (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold tracking-widest rounded-full uppercase animate-pulse">
                                Live Lobby
                            </span>
                        )}
                        <h1 className="text-4xl font-black text-slate-900 uppercase">Control Room</h1>
                    </div>
                    <p className="text-slate-500 font-bold">Active: {activeQuiz.title}</p>
                    {isScheduled && scheduledDate && (
                        <p className="text-xs font-bold text-violet-600">
                            Scheduled for {scheduledDate.toLocaleString('en-IN', {
                                weekday: 'short', day: '2-digit', month: 'short',
                                year: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                        </p>
                    )}
                </div>
                <div className="text-right flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Participant Count</p>
                        <div className="text-6xl font-black text-indigo-600 tabular-nums flex items-center justify-end gap-3">
                            {participants.length}
                            <div className="w-4 h-4 bg-green-500 rounded-full animate-ping opacity-50" />
                        </div>
                    </div>
                    <button
                        onClick={onAbort}
                        className="px-6 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all ml-4"
                    >
                        ABORT
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left panel */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Launch card */}
                    <div className="bg-white shadow-sm p-10 rounded-[2.5rem] space-y-8 border border-gray-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[100px] -mr-32 -mt-32" />

                        {/* Scheduled countdown */}
                        {isScheduled && !canLaunch && (
                            <div className="relative flex flex-col items-center gap-3 p-8 bg-violet-50 rounded-3xl border border-violet-100">
                                <div className="flex items-center gap-2 text-violet-600">
                                    <Clock size={16} />
                                    <p className="text-xs font-bold uppercase tracking-widest">Starts In</p>
                                </div>
                                <p className="text-6xl font-black text-violet-700 tabular-nums tracking-tight">
                                    {formatCountdown(countdown)}
                                </p>
                                <p className="text-xs text-slate-400 font-medium">
                                    The START button activates when the scheduled time arrives.
                                </p>
                            </div>
                        )}

                        {/* Ready message */}
                        {(!isScheduled || canLaunch) && (
                            <div className="relative space-y-4">
                                <h2 className="text-3xl font-black flex items-center gap-4 text-slate-900">
                                    <Play className="text-indigo-600 fill-indigo-600" /> READY TO LAUNCH?
                                </h2>
                                <p className="text-slate-500 text-lg leading-relaxed max-w-xl">
                                    Final check: {activeQuiz.questions?.length || 0} slides ready.
                                    Instruct your audience to scan the QR or use the {isScheduled ? 'permanent join link' : 'session code'} below.
                                </p>
                            </div>
                        )}

                        {/* Code / Link row */}
                        <div
                            className="flex items-center gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-200 cursor-copy hover:border-indigo-300 transition-colors group/code"
                            onClick={handleCopyCode}
                        >
                            <div className="space-y-1 flex-1">
                                <p className="text-xs font-bold text-slate-500 uppercase">
                                    {isScheduled ? 'Permanent Code' : 'Session Code'}
                                </p>
                                <p className="text-5xl font-black text-slate-900 group-hover/code:text-indigo-600 transition-colors uppercase tracking-widest">
                                    {activeQuiz.roomCode}
                                </p>
                            </div>
                            <div className="h-12 w-px bg-gray-300" />
                            <div className="p-4 rounded-2xl bg-white shadow-sm">
                                <div className="grid grid-cols-2 gap-1">
                                    {[1, 2, 3, 4].map(i => <div key={i} className="w-2 h-2 bg-indigo-200 rounded-full" />)}
                                </div>
                            </div>
                        </div>

                        {/* Copy permanent link (scheduled only) */}
                        {isScheduled && (
                            <button
                                onClick={handleCopyLink}
                                className="w-full flex items-center justify-center gap-3 py-4 bg-violet-50 hover:bg-violet-100 rounded-2xl text-sm font-bold text-violet-700 transition-all border border-violet-100"
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'Copied!' : 'Copy Permanent Join Link'}
                            </button>
                        )}

                        {/* Start button */}
                        <button
                            onClick={startQuizBroadcast}
                            disabled={isScheduled && !canLaunch}
                            className="w-full py-6 text-xl font-black flex items-center justify-center gap-4 shadow-xl group/start bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-2xl transition-all"
                        >
                            START QUIZ SESSION <Zap className="group-hover:rotate-12 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Right panel: QR + participants */}
                <div className="space-y-6">
                    <div className="bg-white shadow-sm p-8 rounded-[2.5rem] flex flex-col items-center text-center space-y-6 border border-gray-100">
                        <p className="text-xs font-bold text-slate-500 uppercase">
                            {isScheduled ? 'Permanent QR (Never Changes)' : 'Scan to Join'}
                        </p>
                        <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm relative group/qr overflow-hidden">
                            <img
                                src={qrUrl}
                                alt="Quiz QR Code"
                                className="w-48 h-48 rounded-2xl relative z-10"
                            />
                            <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm z-20">
                                <Zap className="text-indigo-600 animate-bounce" size={48} />
                            </div>
                        </div>
                        <div className="space-y-1 w-full bg-gray-50 p-3 rounded-xl border border-gray-100 overflow-hidden">
                            <p className="text-xs font-bold text-slate-500">Direct Entry Link</p>
                            <p className="text-[10px] font-bold text-slate-900 truncate w-full">{joinUrl}</p>
                        </div>
                        {isScheduled && (
                            <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">
                                This QR &amp; link never change — safe to share publicly
                            </p>
                        )}
                    </div>

                    {/* Participant list */}
                    <div className="bg-white shadow-sm p-8 rounded-[2.5rem] flex-1 border border-gray-100">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                            <h3 className="text-sm font-black uppercase text-slate-900">
                                Participants ({participants.length})
                            </h3>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {participants.map((p, i) => (
                                <motion.div
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    key={p._id || i}
                                    className="px-5 py-3 bg-gray-50 rounded-2xl font-bold text-sm flex items-center gap-3 text-slate-900"
                                >
                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                    {p.name}
                                </motion.div>
                            ))}
                            {participants.length === 0 && (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center space-y-3">
                                    <div className="w-12 h-12 border-2 border-dashed border-slate-300 rounded-full animate-spin" />
                                    <p className="text-xs font-bold uppercase">Waiting For Participants...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveLobby;