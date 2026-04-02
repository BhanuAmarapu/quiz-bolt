import { memo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';

const ResultFeedback = ({ myResult }) => {
    return (
        <AnimatePresence>
            {myResult && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`bg-white rounded-3xl p-8 text-center space-y-2 border-2 shadow-sm ${
                        myResult.isCorrect
                            ? 'border-green-500 bg-green-50'
                            : 'border-red-500 bg-red-50'
                    }`}
                >
                    <div
                        className={`flex items-center justify-center gap-4 ${
                            myResult.isCorrect ? 'text-green-600' : 'text-red-500'
                        }`}
                    >
                        {myResult.isCorrect ? (
                            <CheckCircle2 size={40} />
                        ) : (
                            <XCircle size={40} />
                        )}
                        <span className="text-4xl font-black tracking-tighter uppercase">
                            {myResult.isCorrect ? `AWESOME! +${myResult.score}` : 'WRONG ANSWER'}
                        </span>
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                        Waiting for the next question...
                    </p>
                </div>
            )}
        </AnimatePresence>
    );
};

export default memo(ResultFeedback);
