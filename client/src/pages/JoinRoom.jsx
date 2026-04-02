import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import { getPaymentStatus, createPaymentOrder, verifyPayment } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import InputField from '../components/ui/InputField';

const JoinRoom = () => {
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [paymentQuiz, setPaymentQuiz] = useState(null); // quiz requiring payment
    const [paying, setPaying] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();
    const { getQuizByCodeCached, setQuizByCodeCached } = useAppData();

    const handleJoin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const quiz = await getQuizByCodeCached(roomCode);

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
                        setQuizByCodeCached(roomCode, paymentQuiz);
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
        <div className="min-h-[85vh] flex items-center justify-center p-4">
            <Card className="bg-white p-10 w-full max-w-md text-center space-y-8 rounded-4xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="space-y-3">
                    <h2 className="text-4xl font-black italic tracking-tighter text-slate-900 uppercase">Ready to Join?</h2>
                    <p className="text-slate-500 font-medium">Enter the room code shared by your organizer</p>
                </div>

                {error && (
                    <div role="alert" aria-live="assertive" className="flex items-center gap-3 px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-left">
                        <AlertCircle size={18} className="shrink-0" />
                        {error}
                    </div>
                )}

                {/* Payment required overlay */}
                {paymentQuiz && (
                    <div className="space-y-6 p-8 bg-yellow-50 border border-yellow-200 rounded-4xl animate-in zoom-in duration-300 shadow-sm">
                        <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold">
                            <CreditCard size={20} />
                            <span>Payment Required</span>
                        </div>
                        <p className="text-slate-600 text-sm">
                            <span className="font-bold text-slate-900">{paymentQuiz.title}</span> requires a payment of{' '}
                            <span className="text-indigo-600 font-black">₹{paymentQuiz.price}</span> to join.
                        </p>
                        <Button
                            onClick={handlePayment}
                            disabled={paying}
                            aria-label={paying ? 'Processing payment' : `Pay ₹${paymentQuiz.price} and Join`}
                            className="btn-premium w-full py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#111827]"
                        >
                            {paying ? <><Loader2 className="animate-spin" size={20} /> Processing...</> : `PAY ₹${paymentQuiz.price} & JOIN`}
                        </Button>
                        <Button
                            onClick={() => setPaymentQuiz(null)}
                            className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-bold"
                        >
                            Cancel
                        </Button>
                    </div>
                )}

                {!paymentQuiz && (
                    <form onSubmit={handleJoin} className="space-y-4">
                        <div className="relative">
                            <Hash className="absolute left-4 top-4 text-indigo-500" size={24} />
                            <InputField
                                id="room-code-input"
                                type="text"
                                aria-label="Room Code"
                                placeholder="ENTER CODE"
                                className="w-full pl-14 pr-4 py-4 text-center text-2xl font-black tracking-widest uppercase bg-gray-50 border border-gray-200 rounded-2xl text-slate-900 placeholder:normal-case placeholder:font-medium placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                                maxLength={6}
                                value={roomCode}
                                onChange={(e) => {
                                    setError('');
                                    setRoomCode(e.target.value.toUpperCase());
                                }}
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            id="join-room-btn"
                            disabled={loading || roomCode.length < 6}
                            aria-label={loading ? 'Verifying room code' : 'Join Room'}
                            className="btn-premium flex items-center justify-center gap-3 w-full py-4 text-xl disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#111827]"
                        >
                            {loading ? <><Loader2 className="animate-spin" size={24} /> Verifying...</> : 'JOIN ROOM'}
                        </Button>
                    </form>
                )}
            </Card>
        </div>
    );
};

export default JoinRoom;
