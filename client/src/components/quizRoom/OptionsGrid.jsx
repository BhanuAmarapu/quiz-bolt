import { memo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';

const OptionsGrid = ({ options, selectedOption, timeLeft, onSubmitAnswer, myResult }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="wait">
                {options.map((option, i) => {
                    const isSelected = selectedOption === option;
                    const isSubmitting = isSelected && !myResult;
                    return (
                        <button
                            key={`${option}-${i}`}
                            aria-label={`Select option ${option}`}
                            aria-pressed={isSelected}
                            onClick={() => onSubmitAnswer(option)}
                            disabled={!!selectedOption || timeLeft === 0}
                            className={`group px-8 pt-10 pb-8 text-center text-xl font-bold rounded-4xl border-2 transition-all min-h-36 flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white
                                ${
                                    isSelected
                                        ? 'border-green-500 bg-green-50 scale-[0.98]'
                                        : 'border-gray-100 bg-white hover:bg-gray-50'
                                }
                                ${selectedOption && !isSelected ? 'opacity-50' : 'opacity-100'}
                            `}
                        >
                            <div
                                className={`absolute top-4 left-6 px-3 py-1 text-xs font-black rounded-full flex items-center gap-1 ${
                                    isSelected ? 'bg-green-500 text-white' : 'bg-slate-800 text-white'
                                }`}
                            >
                                OPTION {i + 1} {isSelected && <CheckCircle2 size={14} className="ml-1" />}
                            </div>
                            <span className="w-full wrap-break-word text-slate-900 mt-2">
                                {option}
                            </span>
                            {isSubmitting && (
                                <Loader2 className="mt-4 animate-spin text-indigo-600" size={24} />
                            )}
                        </button>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default memo(OptionsGrid);
