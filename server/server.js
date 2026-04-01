require('dotenv').config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const config = require('./config/env');
const { quizHandler, rebootQuizzes } = require('./sockets/quizHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const quizRoutes = require('./routes/quizRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Initialize Express
const app = express();
const server = http.createServer(app);

const io = socketio(server, {
    cors: {
        origin: config.clientUrl,
        methods: ['GET', 'POST'],
    },
});

// ── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(cors({
    origin: config.clientUrl,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// ── Rate Limiting ───────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// ── Bootstrap ───────────────────────────────────────────────────────────────
const bootstrap = async () => {
    // Connect Database
    await connectDB();

    // Connect Redis & attach adapter to Socket.io
    try {
        const pubClient = createClient({ url: config.redisUrl });
        const subClient = pubClient.duplicate();
        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        console.log('[Redis] Socket.io adapter connected');

        // Also initialize the shared Redis client for session storage
        await connectRedis();

        // Resume any ongoing quizzes (Resilience)
        await rebootQuizzes(io);
    } catch (err) {
        console.warn('[Redis] Failed to connect, falling back to in-memory:', err.message);
    }

    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/quiz', quizRoutes);
    app.use('/api/payment', paymentRoutes);

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'healthy',
            service: 'quiz-server',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    });

    // Socket logic
    io.on('connection', (socket) => {
        console.log('[Socket] New connection:', socket.id);

        quizHandler(io, socket);

        socket.on('disconnect', () => {
            console.log('[Socket] Disconnected:', socket.id);
        });
    });

    server.listen(config.port, () => console.log(`[Server] Running in ${config.nodeEnv} mode on port ${config.port}`));
};

bootstrap().catch((err) => {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
});

// ── Graceful Shutdown ───────────────────────────────────────────────────────
const shutdown = (signal) => {
    console.log(`[Server] ${signal} received, shutting down...`);
    server.close(() => {
        console.log('[Server] HTTP server closed');
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

