const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2';

const variantClasses = {
    default: 'bg-transparent text-inherit',
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-gray-100 text-slate-700 hover:bg-gray-200',
    danger: 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100',
    ghost: 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-gray-100',
};

const sizeClasses = {
    none: '',
    sm: 'px-3 py-2 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-2xl',
};

const Button = ({
    children,
    className = '',
    type = 'button',
    variant = 'default',
    size = 'none',
    ...props
}) => {
    return (
        <button
            type={type}
            className={`${baseClasses} ${variantClasses[variant] || variantClasses.default} ${sizeClasses[size] || sizeClasses.md} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
