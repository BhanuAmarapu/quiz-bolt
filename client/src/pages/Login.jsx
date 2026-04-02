import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Github, Linkedin } from 'lucide-react';

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
        <div 
            className="min-h-screen flex items-center justify-center px-6 py-12 sm:px-8"
            style={{
                backgroundImage: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
                backgroundAttachment: 'fixed'
            }}
        >
            <div className="w-full max-w-md space-y-8 bg-white rounded-2xl shadow-2xl p-8 sm:p-10 animate-in fade-in zoom-in duration-500">
                    <div className="space-y-3">
                        <h2 className="text-4xl font-black text-gray-900">Sign In</h2>
                        <p className="text-gray-600 font-medium">
                            Welcome back! Please sign in to your account
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold">
                            <AlertCircle size={18} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                <input
                                    id="login-email"
                                    type="email"
                                    placeholder="name@company.com"
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-400"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                <input
                                    id="login-password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-400"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm uppercase tracking-widest"
                        >
                            {loading ? 'SIGNING IN...' : 'SIGN IN'}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-gray-50 text-gray-500 font-medium">Or continue with</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Google
                        </button>
                        <button
                            type="button"
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
                        >
                            <Github className="w-5 h-5" />
                            GitHub
                        </button>
                    </div>

                    <p className="text-center text-gray-600 font-medium text-sm">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-indigo-600 font-bold hover:text-indigo-700">
                            Sign up
                        </Link>
                    </p>
            </div>
        </div>
    );
};

export default Login;
