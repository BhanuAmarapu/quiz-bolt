import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('participant');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(name, email, password, role);
            if (role === 'organizer') navigate('/organizer-dashboard');
            else navigate('/join');
        } catch (err) {
            const msg = err?.response?.data?.message || 'Registration failed. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
            <div className="bg-white p-10 w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom duration-500 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="text-center space-y-3">
                    <h1 className="text-4xl font-black text-slate-900 uppercase">Create Studio</h1>
                    <p className="text-slate-500 font-bold">Join the ultimate global quiz platform</p>
                </div>

                {error && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold">
                        <AlertCircle size={18} className="shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-4 top-3.5 text-slate-400" size={18} />
                            <input
                                id="register-name"
                                type="text"
                                placeholder="John Doe"
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-900 font-medium outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                            <input
                                id="register-email"
                                type="email"
                                placeholder="name@company.com"
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-900 font-medium outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
                            <input
                                id="register-password"
                                type="password"
                                placeholder="••••••••"
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-900 font-medium outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Role</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                id="role-participant"
                                onClick={() => setRole('participant')}
                                className={`flex-1 py-3 px-4 rounded-xl border transition-all text-sm font-bold ${role === 'participant'
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                                    : 'bg-white border-gray-200 text-slate-500 hover:bg-gray-50'
                                    }`}
                            >
                                Participant
                            </button>
                            <button
                                type="button"
                                id="role-organizer"
                                onClick={() => setRole('organizer')}
                                className={`flex-1 py-3 px-4 rounded-xl border transition-all text-sm font-bold ${role === 'organizer'
                                    ? 'bg-yellow-50 border-yellow-200 text-yellow-700 shadow-sm'
                                    : 'bg-white border-gray-200 text-slate-500 hover:bg-gray-50'
                                    }`}
                            >
                                Organizer
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 text-sm font-bold text-white bg-indigo-600 rounded-xl mt-6 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors shadow-sm uppercase tracking-widest"
                    >
                        {loading ? 'INITIALIZING...' : 'GET STARTED FOR FREE'}
                    </button>
                </form>

                <p className="text-center text-slate-500 font-bold text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="text-indigo-600 font-black hover:underline">Sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
