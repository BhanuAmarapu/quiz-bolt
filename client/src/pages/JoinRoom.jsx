import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, AlertCircle, CreditCard } from 'lucide-react';
import { getQuizByCode, getPaymentStatus, createPaymentOrder, verifyPayment } from '../services/api';
import { useAuth } from '../context/AuthContext';

const JoinRoom = () => {
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [paymentQuiz, setPaymentQuiz] = useState(null); // quiz requiring payment
    const [paying, setPaying] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleJoin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const quiz = await getQuizByCode(roomCode);

            // If paid quiz, check payment status
            if (quiz.isPaid && quiz.price > 0 && user?.role !== 'organizer') {
                const status = await getPaymentStatus(quiz._id);
                if (status?.data?.paid) {
                    navigate(`/quiz/${roomCode}`);
                } else {
                    setPaymentQuiz(quiz);
                }
            } else {
                navigate(`/quiz/${roomCode}`);
            }
        } catch {
            setError('Room not found. Please check the code and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!paymentQuiz) return;
        setPaying(true);
        setError('');
        try {
            const order = await createPaymentOrder(paymentQuiz._id, paymentQuiz.price);

            const options = {
                key: order.data.key,
                amount: order.data.amount * 100,
                currency: order.data.currency,
                name: 'QuizBolt',
                description: `Payment for: ${paymentQuiz.title}`,
                order_id: order.data.orderId,
                handler: async (response) => {
                    try {
                        await verifyPayment(
                            response.razorpay_order_id,
                            response.razorpay_payment_id,
                            response.razorpay_signature,
                            paymentQuiz._id
                        );
                        navigate(`/quiz/${roomCode}`);
                    } catch {
                        setError('Payment verification failed. Please contact support.');
                    }
                },
                prefill: {
                    name: user?.name || '',
                    email: user?.email || '',
                },
                theme: { color: '#6366f1' },
            };

            if (window.Razorpay) {
                const rzp = new window.Razorpay(options);
                rzp.open();
            } else {
                setError('Payment gateway not loaded. Please refresh and try again.');
            }
        } catch {
            setError('Failed to initiate payment. Please try again.');
        } finally {
            setPaying(false);
        }
    };

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4">
            <div className="glass p-10 w-full max-w-md text-center space-y-8">
                <div className="space-y-3">
                    <h2 className="text-4xl font-black italic tracking-tighter text-gradient uppercase">Ready to Rush?</h2>
                    <p className="text-slate-400 font-medium">Enter the room code shared by your organizer</p>
                </div>

                {error && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-left">
                        <AlertCircle size={18} className="shrink-0" />
                        {error}
                    </div>
                )}

                {/* Payment required overlay */}
                {paymentQuiz && (
                    <div className="space-y-6 p-8 glass-bright border-yellow-500/20 rounded-[2rem] animate-in zoom-in duration-300">
                        <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold">
                            <CreditCard size={20} />
                            <span>Payment Required</span>
                        </div>
                        <p className="text-gray-300 text-sm">
                            <span className="font-bold">{paymentQuiz.title}</span> requires a payment of{' '}
                            <span className="text-yellow-400 font-black">₹{paymentQuiz.price}</span> to join.
                        </p>
                        <button
                            onClick={handlePayment}
                            disabled={paying}
                            className="btn-premium w-full py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {paying ? 'Processing...' : `PAY ₹${paymentQuiz.price} & JOIN`}
                        </button>
                        <button
                            onClick={() => setPaymentQuiz(null)}
                            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {!paymentQuiz && (
                    <form onSubmit={handleJoin} className="space-y-4">
                        <div className="relative">
                            <Hash className="absolute left-4 top-4 text-primary" size={24} />
                            <input
                                id="room-code-input"
                                type="text"
                                placeholder="ENTER CODE"
                                className="input-premium pl-14 text-center text-2xl font-black tracking-widest uppercase placeholder:normal-case placeholder:font-medium placeholder:text-gray-600"
                                maxLength={6}
                                value={roomCode}
                                onChange={(e) => {
                                    setError('');
                                    setRoomCode(e.target.value.toUpperCase());
                                }}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            id="join-room-btn"
                            disabled={loading || roomCode.length < 6}
                            className="btn-premium w-full py-4 text-xl disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Verifying...' : 'JOIN ROOM'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default JoinRoom;
