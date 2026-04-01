import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Zap, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <nav className="sticky top-0 z-50 px-6 py-4">
            <div className="max-w-7xl mx-auto glass rounded-2xl px-8 py-4 flex items-center justify-between border-white/5 shadow-2xl">
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="p-2 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <Zap className="fill-primary text-secondary" size={24} />
                    </div>
                    <span className="text-2xl font-black tracking-tighter italic text-[var(--color-text)] group-hover:text-primary transition-colors">
                        QUIZ<span className="text-primary font-black">BOLT</span>
                    </span>
                </Link>

                <div className="flex items-center gap-8">
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 glass-bright rounded-xl text-slate-400 hover:text-primary transition-all border-white/5"
                        title="Toggle Light/Dark Mode"
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {user ? (
                        <div className="flex items-center gap-6">
                            <Link to={user.role === 'organizer' ? "/organizer-dashboard" : "/join"} className="text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-all">
                                Dashboard
                            </Link>
                            <Link to="/history" className="text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-all">
                                History
                            </Link>
                            <div className="h-4 w-px bg-white/10 hidden md:block"></div>
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden md:block">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter leading-none">Logged in as</p>
                                    <p className="text-sm font-bold text-[var(--color-text)] leading-tight">{user.name}</p>
                                </div>
                                <button onClick={logout} className="p-2.5 glass-dark rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all border-white/5">
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-6">
                            <Link to="/login" className="text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Login</Link>
                            <Link to="/register" className="btn-shimmer py-2.5 px-6 text-sm">Get Started</Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
