import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Zap, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const initials = user?.name
        ? user.name
            .split(' ')
            .map(part => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : 'U';

    return (
        <nav className="sticky top-0 z-50">
            <div className="mx-auto bg-white  px-8 py-4 flex items-center justify-between border border-gray-100">
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="p-2 bg-indigo-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <Zap className="fill-indigo-600 text-indigo-100" size={24} />
                    </div>
                    <span className="text-2xl font-black tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                        QUIZ<span className="text-indigo-600 font-black">BOLT</span>
                    </span>
                </Link>

                <div className="flex items-center gap-8">
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 bg-gray-50 rounded-xl text-slate-500 hover:text-indigo-600 transition-all border border-gray-100"
                        title="Toggle Light/Dark Mode"
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {user ? (
                        <div className="flex items-center gap-6">
                            <Link to={user.role === 'organizer' ? "/organizer-dashboard" : "/join"} className="text-sm font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-all">
                                Dashboard
                            </Link>
                            <Link to="/history" className="text-sm font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-all">
                                History
                            </Link>
                            <div className="h-4 w-px bg-gray-200 hidden md:block"></div>
                            <div className="flex items-center gap-3">
                                <Link
                                    to="/profile"
                                    className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-indigo-50 flex items-center justify-center text-xs font-black text-indigo-600 hover:ring-2 hover:ring-indigo-200 transition-all"
                                    title="Open profile"
                                >
                                    {user.profilePhoto ? (
                                        <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{initials}</span>
                                    )}
                                </Link>
                                <button onClick={logout} className="p-2.5 bg-red-50 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-100 transition-all border border-red-100">
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-6">
                            <Link to="/login" className="text-sm font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">Login</Link>
                            <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-colors shadow-sm uppercase tracking-widest">Get Started</Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
