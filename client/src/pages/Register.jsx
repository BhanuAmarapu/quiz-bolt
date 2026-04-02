import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, Github } from 'lucide-react';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('participant');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!termsAccepted) {
            setError('Please agree to the Terms of Service and Privacy Policy');
            return;
        }
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
        <div 
            className="min-h-screen flex items-center justify-center px-6 py-12 sm:px-8"
            style={{
                backgroundImage: `linear-gradient(135deg, #f093fb 0%, #f5576c 100%)`,
                backgroundAttachment: 'fixed'
            }}
        >
            <div className="w-full max-w-md space-y-8 bg-white rounded-2xl shadow-2xl p-8 sm:p-10 animate-in fade-in slide-in-from-bottom duration-500">
                    <div className="space-y-3">
                        <h2 className="text-4xl font-black text-gray-900">Create Account</h2>
                        <p className="text-gray-600 font-medium">
                            Start your learning journey today
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-bold">
                            <AlertCircle size={18} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                <input
                                    id="register-name"
                                    type="text"
                                    placeholder="Enter your name"
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-400"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoComplete="name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                <input
                                    id="register-email"
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
                                    id="register-password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-400"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Account Type</label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    id="role-participant"
                                    onClick={() => setRole('participant')}
                                    className={`flex-1 py-3 px-3 rounded-lg border transition-all text-sm font-bold ${
                                        role === 'participant'
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    Participant
                                </button>
                                <button
                                    type="button"
                                    id="role-organizer"
                                    onClick={() => setRole('organizer')}
                                    className={`flex-1 py-3 px-3 rounded-lg border transition-all text-sm font-bold ${
                                        role === 'organizer'
                                            ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    Organizer
                                </button>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 pt-2">
                            <input
                                id="terms"
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <label htmlFor="terms" className="text-sm text-gray-600 font-medium leading-6 cursor-pointer">
                                I agree to the <a href="#" className="text-indigo-600 font-bold hover:text-indigo-700">Terms of Service</a> and{' '}
                                <a href="#" className="text-indigo-600 font-bold hover:text-indigo-700">Privacy Policy</a>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm uppercase tracking-widest mt-2"
                        >
                            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-gray-50 text-gray-500 font-medium">Or sign up with</span>
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
                        Already have an account?{' '}
                        <Link to="/login" className="text-indigo-600 font-bold hover:text-indigo-700">
                            Sign in
                        </Link>
                    </p>
            </div>
        </div>
    );
};

export default Register;
