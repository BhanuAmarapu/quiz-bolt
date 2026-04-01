import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser as apiLogin, registerUser as apiRegister, logoutUser as apiLogout } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('quizbolt_user');
        if (saved) {
            setUser(JSON.parse(saved));
        }
        setLoading(false);
    }, []);

    const handleAuthSuccess = (data) => {
        setUser(data);
        localStorage.setItem('quizbolt_user', JSON.stringify(data));
        return data;
    };

    const login = async (email, password) => {
        const data = await apiLogin(email, password);
        return handleAuthSuccess(data);
    };

    const register = async (name, email, password, role) => {
        const data = await apiRegister(name, email, password, role);
        return handleAuthSuccess(data);
    };

    const logout = async () => {
        try {
            await apiLogout();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setUser(null);
            localStorage.removeItem('quizbolt_user');
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
