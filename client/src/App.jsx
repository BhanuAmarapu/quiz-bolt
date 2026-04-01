import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import OrganizerDashboard from './pages/OrganizerDashboard';
import OrganizerEdit from './pages/OrganizerEdit';
import OrganizerLive from './pages/OrganizerLive';
import JoinRoom from './pages/JoinRoom';
import QuizRoom from './pages/QuizRoom';
import History from './pages/History';
import HistoryDetail from './pages/HistoryDetail';
import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
  </div>
);

const Home = () => (
  <div className="flex flex-col items-center justify-center min-h-[85vh] text-center space-y-12 px-6">
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="inline-block px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-bold tracking-widest text-indigo-600 uppercase mb-4 shadow-sm">
        Ignite Your Learning
      </div>
      <h1 className="text-7xl md:text-9xl font-black tracking-tight leading-none text-slate-900 drop-shadow-sm">
        ELEVATE <br />
        <span className="text-indigo-600">YOUR QUIZ</span> <br />
        <span className="text-slate-800">EXPERIENCE</span>
      </h1>
    </div>

    <p className="text-xl text-slate-500 max-w-2xl leading-relaxed animate-in fade-in duration-1000 delay-300">
      The world's most sophisticated real-time quiz platform.
      Engineered for speed, designed for engagement, and built for the future of interactive learning.
    </p>

    <div className="flex flex-col sm:flex-row gap-6 animate-in fade-in duration-1000 delay-500">
      <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg px-12 py-5 min-w-[200px] rounded-2xl shadow-sm transition-all flex items-center justify-center">Create Studio</Link>
      <Link to="/join" className="px-12 py-5 bg-white text-slate-900 text-lg font-bold border border-gray-200 hover:bg-gray-50 transition-all min-w-[200px] rounded-2xl flex items-center justify-center gap-2 shadow-sm">
        <Zap size={20} className="text-indigo-600 fill-indigo-600" /> Join Arena
      </Link>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 pt-12 opacity-50">
      {['Real-time', 'Security', 'Analytics', 'Premium UI'].map(feature => (
        <span key={feature} className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{feature}</span>
      ))}
    </div>
  </div>
);

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
};

const AuthRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) {
    if (user.role === 'organizer') return <Navigate to="/organizer-dashboard" />;
    return <Navigate to="/join" />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <SocketProvider>
            <div className="min-h-screen bg-[var(--bg-base)] text-[var(--color-text)] overflow-x-hidden transition-colors duration-500">
              <Navbar />
              <main className="max-w-7xl mx-auto">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
                  <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
                  <Route path="/join" element={<ProtectedRoute><JoinRoom /></ProtectedRoute>} />
                  <Route path="/quiz/:roomCode" element={<ProtectedRoute><QuizRoom /></ProtectedRoute>} />
                  <Route path="/organizer-dashboard" element={<ProtectedRoute role="organizer"><OrganizerDashboard /></ProtectedRoute>} />
                  <Route path="/edit/:id" element={<ProtectedRoute role="organizer"><OrganizerEdit /></ProtectedRoute>} />
                  <Route path="/live/:id" element={<ProtectedRoute role="organizer"><OrganizerLive /></ProtectedRoute>} />
                  <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                  <Route path="/history/:roomCode" element={<ProtectedRoute><HistoryDetail /></ProtectedRoute>} />
                </Routes>
              </main>
            </div>
          </SocketProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
