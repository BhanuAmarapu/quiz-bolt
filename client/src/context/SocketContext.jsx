import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../services/api';

const SocketContext = createContext(null);

// Read the JWT from the same key AuthContext uses when storing the logged-in user
const getAuthToken = () => {
    try {
        const raw = localStorage.getItem('quizbolt_user');
        if (!raw) return null;
        const user = JSON.parse(raw);
        return user?.token || null;
    } catch {
        return null;
    }
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const token = getAuthToken();

        const newSocket = io(getSocketUrl(), {
            // Fix #10: send JWT in handshake so server can verify it server-side
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected:', newSocket.id);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        newSocket.on('connect_error', (err) => {
            console.error('[Socket] Connection error:', err.message);
        });

        setSocket(newSocket);

        return () => newSocket.disconnect();
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
