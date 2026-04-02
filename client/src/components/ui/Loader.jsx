const Loader = ({ className = '' }) => {
    return (
        <div className={className}>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
        </div>
    );
};

export default Loader;
