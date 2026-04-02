const InputField = ({ className = '', ...props }) => {
    return (
        <input
            className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${className}`}
            {...props}
        />
    );
};

export default InputField;
