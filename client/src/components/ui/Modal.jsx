const Modal = ({ open, children, className = '' }) => {
    if (!open) return null;

    return (
        <div className={className}>
            {children}
        </div>
    );
};

export default Modal;
