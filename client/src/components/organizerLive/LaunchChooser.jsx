import { useState } from 'react';
import { Zap, CalendarClock, ChevronLeft, Clock, Play } from 'lucide-react';

/**
 * LaunchChooser — shown when a quiz has never been started.
 * Lets the organizer choose between:
 *   • Go Live Now   → instant session (roomCode may change)
 *   • Schedule      → permanent link/QR, future date-time
 */
const LaunchChooser = ({ activeQuiz, navigate, onGoLiveNow, onSchedule, showToast }) => {
    const [mode, setMode] = useState(null); // null | 'instant' | 'schedule'
    const [scheduledAt, setScheduledAt] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const joinUrl = `${window.location.origin}/quiz/${activeQuiz.roomCode}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(joinUrl)}&bgcolor=e0e7ff&color=4f46e5&margin=10`;

    // Minimum allowed datetime = now + 5 min
    const minDatetime = new Date(Date.now() + 5 * 60 * 1000)
        .toISOString()
        .slice(0, 16);

    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        if (!scheduledAt) { showToast('Pick a date & time'); return; }
        setSubmitting(true);
        try {
            await onSchedule(scheduledAt);
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoLive = async () => {
        setSubmitting(true);
        try { await onGoLiveNow(); } finally { setSubmitting(false); }
    };

    return (
        <div className="p-8 mx-auto max-w-4xl space-y-8 animate-in fade-in zoom-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/organizer-dashboard')}
                    className="p-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-slate-500 shadow-sm"
                >
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-4xl font-black text-slate-900 uppercase leading-none">Launch Quiz</h1>
                    <p className="text-slate-500 font-bold text-sm mt-1">
                        <span className="text-indigo-600">{activeQuiz.title}</span> &middot; {activeQuiz.questions?.length || 0} slides
                    </p>
                </div>
            </div>

            {/* Mode picker */}
            {!mode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Instant */}
                    <button
                        onClick={() => setMode('instant')}
                        className="group bg-white border-2 border-gray-100 hover:border-indigo-400 rounded-4xl p-10 text-left space-y-4 transition-all hover:shadow-lg hover:-translate-y-1 duration-300"
                    >
                        <div className="p-4 bg-indigo-50 rounded-2xl w-fit group-hover:bg-indigo-100 transition-colors">
                            <Zap size={28} className="text-indigo-600 fill-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">Instant Live</h2>
                            <p className="text-slate-500 text-sm font-medium mt-1 leading-relaxed">
                                Start right now. Participants join using a session code or QR. Best for in-person or same-day sessions.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest">
                            <Play size={12} fill="currentColor" /> Go Live Now
                        </div>
                    </button>

                    {/* Scheduled */}
                    <button
                        onClick={() => setMode('schedule')}
                        className="group bg-white border-2 border-gray-100 hover:border-violet-400 rounded-4xl p-10 text-left space-y-4 transition-all hover:shadow-lg hover:-translate-y-1 duration-300"
                    >
                        <div className="p-4 bg-violet-50 rounded-2xl w-fit group-hover:bg-violet-100 transition-colors">
                            <CalendarClock size={28} className="text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">Schedule for Later</h2>
                            <p className="text-slate-500 text-sm font-medium mt-1 leading-relaxed">
                                Pick a future date &amp; time. The permanent join link &amp; QR code are shared now — participants register in advance.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-violet-600 font-bold text-xs uppercase tracking-widest">
                            <Clock size={12} /> Pick Date &amp; Time
                        </div>
                    </button>
                </div>
            )}

            {/* Instant confirm */}
            {mode === 'instant' && (
                <div className="bg-white border border-gray-100 rounded-4xl p-10 shadow-sm space-y-8 animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 rounded-2xl">
                            <Zap size={24} className="text-indigo-600 fill-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">Ready to Launch?</h2>
                            <p className="text-slate-500 text-sm font-medium">
                                {activeQuiz.questions?.length || 0} slides · Participants join via session code
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div className="space-y-3">
                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-200">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Session Code</p>
                                <p className="text-4xl font-black text-slate-900 tracking-widest">{activeQuiz.roomCode}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                                <p className="text-[10px] font-bold text-slate-500">Direct Entry Link</p>
                                <p className="text-[11px] font-bold text-slate-900 truncate">{joinUrl}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <img src={qrUrl} alt="Join QR" className="w-40 h-40 rounded-2xl" />
                            <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest">Scan to Join</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setMode(null)}
                            className="px-6 py-3 bg-gray-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleGoLive}
                            disabled={submitting}
                            className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-sm disabled:opacity-60"
                        >
                            <Play size={20} fill="white" />
                            {submitting ? 'Launching...' : 'START QUIZ SESSION'}
                        </button>
                    </div>
                </div>
            )}

            {/* Schedule form */}
            {mode === 'schedule' && (
                <div className="bg-white border border-gray-100 rounded-4xl p-10 shadow-sm space-y-8 animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-violet-50 rounded-2xl">
                            <CalendarClock size={24} className="text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">Schedule Your Session</h2>
                            <p className="text-slate-500 text-sm font-medium">
                                The join link &amp; QR code are permanent — share them now. The quiz goes live at your chosen time.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <form onSubmit={handleScheduleSubmit} className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
                                    Session Date &amp; Time
                                </label>
                                <input
                                    type="datetime-local"
                                    min={minDatetime}
                                    value={scheduledAt}
                                    onChange={e => setScheduledAt(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 text-slate-900 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-violet-400 transition-colors"
                                    required
                                />
                            </div>

                            {/* Permanent link preview */}
                            <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl space-y-1">
                                <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Permanent Join Link</p>
                                <p className="text-xs font-bold text-slate-700 break-all">{joinUrl}</p>
                                <p className="text-[10px] text-slate-400 font-medium">This link never changes — safe to share ahead of time.</p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setMode(null)}
                                    className="px-6 py-3 bg-gray-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !scheduledAt}
                                    className="flex-1 py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60"
                                >
                                    <CalendarClock size={16} />
                                    {submitting ? 'Scheduling...' : 'CONFIRM SCHEDULE'}
                                </button>
                            </div>
                        </form>

                        <div className="flex flex-col items-center gap-3">
                            <img src={qrUrl} alt="Permanent Join QR" className="w-44 h-44 rounded-2xl border border-gray-100 shadow-sm" />
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center">
                                Permanent QR — will not change
                            </p>
                            <p className="text-[11px] font-bold text-violet-600 text-center">
                                Code: <span className="tracking-widest text-slate-900">{activeQuiz.roomCode}</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaunchChooser;
