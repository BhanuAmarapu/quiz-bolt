import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser as apiLogin, registerUser as apiRegister, logoutUser as apiLogout, updateMyProfile as apiUpdateProfile } from '../services/api';

const AuthContext = createContext();

const readStoredUser = () => {
    try {
        const raw = localStorage.getItem('quizbolt_user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        localStorage.removeItem('quizbolt_user');
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const saved = readStoredUser();
        if (saved) {
            setUser(saved);
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

    const updateProfile = async (payload) => {
        const updated = await apiUpdateProfile(payload);
        const merged = {
            ...user,
            ...updated,
            token: user?.token,
        };
        setUser(merged);
        localStorage.setItem('quizbolt_user', JSON.stringify(merged));
        return merged;
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
