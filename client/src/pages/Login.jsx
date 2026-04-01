import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Zap, AlertCircle } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(email, password);
            if (user.role === 'organizer') navigate('/organizer-dashboard');
            else navigate('/join');
        } catch {
            setError('Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="bg-white p-10 w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="text-center space-y-4">
                    <div className="inline-flex p-4 rounded-[2rem] bg-indigo-50 text-indigo-600 mb-2 shadow-sm border border-indigo-100">
                        <Zap size={36} fill="currentColor" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 uppercase">Welcome Back</h1>
                    <p className="text-slate-500 font-bold">Access your global quiz studio</p>
                </div>

                {error && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold">
                        <AlertCircle size={18} className="shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                            <input
                                id="login-email"
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
                                id="login-password"
                                type="password"
                                placeholder="••••••••"
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-900 font-medium outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 text-sm font-bold text-white bg-indigo-600 rounded-xl mt-4 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors shadow-sm uppercase tracking-widest"
                    >
                        {loading ? 'AUTHENTICATING...' : 'SIGN IN TO STUDIO'}
                    </button>
                </form>

                <p className="text-center text-slate-500 font-bold text-sm">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-indigo-600 font-black hover:underline">Sign up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
