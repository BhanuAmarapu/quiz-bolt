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
            <div className="glass p-10 w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom duration-500">
                <div className="text-center space-y-3">
                    <h1 className="text-4xl font-black italic tracking-tighter text-gradient uppercase">Create Studio</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Join the ultimate global quiz platform</p>
                </div>

                {error && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                        <AlertCircle size={18} className="shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 ml-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-4 top-3.5 text-gray-500" size={18} />
                            <input
                                id="register-name"
                                type="text"
                                placeholder="John Doe"
                                className="input-premium pl-12"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 text-gray-500" size={18} />
                            <input
                                id="register-email"
                                type="email"
                                placeholder="name@company.com"
                                className="input-premium pl-12"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 text-gray-500" size={18} />
                            <input
                                id="register-password"
                                type="password"
                                placeholder="••••••••"
                                className="input-premium pl-12"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 ml-1">Role</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                id="role-participant"
                                onClick={() => setRole('participant')}
                                className={`flex-1 py-3 px-4 rounded-xl border transition-all ${role === 'participant'
                                    ? 'bg-primary/20 border-primary text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400'
                                    }`}
                            >
                                Participant
                            </button>
                            <button
                                type="button"
                                id="role-organizer"
                                onClick={() => setRole('organizer')}
                                className={`flex-1 py-3 px-4 rounded-xl border transition-all ${role === 'organizer'
                                    ? 'bg-secondary/20 border-secondary text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400'
                                    }`}
                            >
                                Organizer
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-shimmer w-full py-4 text-base mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? 'INITIALIZING...' : 'GET STARTED FOR FREE'}
                    </button>
                </form>

                <p className="text-center text-gray-400">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
