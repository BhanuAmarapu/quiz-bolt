const QuestionHeader = ({ currentQuestion, timeLeft }) => {
    return (
        <div
            className="flex items-center justify-between relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm"
            style={{ minHeight: '140px' }}
            aria-live="polite"
        >
            <div
                className="absolute top-0 left-0 h-1 bg-indigo-500 transition-all duration-1000"
                style={{ width: `${(timeLeft / currentQuestion?.timeLimit) * 100}%` }}
            />
            <div className="space-y-2 relative z-10">
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full uppercase tracking-tighter">
                        Q{currentQuestion?.index + 1} / {currentQuestion?.total}
                    </span>
                    <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">
                        {currentQuestion?.questionType?.replace('-', ' ')}
                    </span>
                </div>
                <h2 className="text-4xl font-black tracking-tight leading-tight text-slate-900 mt-2">
                    {currentQuestion?.text}
                </h2>
            </div>
            <div
                className="relative z-10 flex shrink-0 flex-col items-center rounded-2xl border border-gray-200 bg-gray-100 px-6 py-4"
                style={{ minWidth: '100px' }}
                aria-label={`Time remaining: ${timeLeft} seconds`}
            >
                <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Time Limit</span>
                <span className={`text-4xl font-black ${
                    timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-slate-900'
                }`}>
                    {timeLeft}
                </span>
            </div>
        </div>
    );
};

export default QuestionHeader;
