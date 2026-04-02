import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import Button from '../ui/Button';

const ConfirmationDialog = ({ open, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }) => {
    return (
        <div className={`fixed inset-0 z-150 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm ${open ? '' : 'hidden'}`}>
            <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className="mx-4 w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl"
            >
                <div className="flex items-start gap-4 p-6 pb-4">
                    <div className="rounded-2xl bg-amber-50 p-3 text-amber-500">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-black tracking-tight text-slate-900">Confirm action</h3>
                        <p className="mt-1 text-sm text-slate-500">{message}</p>
                    </div>
                    <button onClick={onCancel} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-700" aria-label="Close confirmation dialog">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex gap-3 border-t border-gray-100 bg-gray-50 p-4">
                    <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button type="button" variant="danger" size="md" className="flex-1" onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
};

export default ConfirmationDialog;