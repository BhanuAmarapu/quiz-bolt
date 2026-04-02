const Card = ({ children, className = '' }) => {
    return (
        <div className={`rounded-3xl border border-gray-100 bg-white shadow-sm ${className}`}>
            {children}
        </div>
    );
};

export default Card;
