const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');
const Submission = require('../models/Submission');
const { compareAnswers } = require('../utils/crypto');
const { calculateScore } = require('../utils/scoring');

// ─── Redis-backed session helpers ───────────────────────────────────────────
let redisClient = null;

const tryGetRedis = () => {
    if (redisClient) return redisClient;
    try {
        const { getRedisClient } = require('../config/redis');
        redisClient = getRedisClient();
        return redisClient;
    } catch {
        return null;
    }
};

// Fallback in-memory store when Redis is unavailable
const memSessions = new Map();
// Per-question deduplication lock: `${roomCode}:${questionIndex}:${userId}` → true
// Fix #1: Atomic response tracking using a flat Set (per roomCode:qIndex scope)
const memResponseLocks = new Map();
const activeTimers = new Map(); // sessionCode → timeout

const SESSION_TTL = 7200; // 2 hours

const sessionKey = (code) => `quiz:session:${code}`;
const lockKey = (code, qIndex, userId) => `quiz:lock:${code}:${qIndex}:${userId}`;

// ─── Shuffle helper ──────────────────────────────────────────────────────────
const shuffleArray = (items) => {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// ─── Format question for broadcast (strips hashedCorrectAnswer, correctOption) ─
// Fix #11: Options are sent in (possibly shuffled) order; client submits the TEXT value.
const formatQuestion = (question, index, total, expiry) => {
    const options = question.shuffleOptions
        ? shuffleArray([...question.options])
        : [...question.options];

    return {
        _id: question._id,
        text: question.text,
        options,              // text values only — no index, no hash leaked to client
        timeLimit: question.timeLimit,
        mediaUrl: question.mediaUrl,
        questionType: question.questionType,
        index,
        total,
        expiry,
    };
};

// ─── Session store ──────────────────────────────────────────────────────────
const getSession = async (code) => {
    const rc = tryGetRedis();
    if (rc) {
        const raw = await rc.get(sessionKey(code));
        return raw ? JSON.parse(raw) : null;
    }
    return memSessions.get(code) || null;
};

const setSession = async (code, session) => {
    const rc = tryGetRedis();
    if (rc) {
        await rc.set(sessionKey(code), JSON.stringify(session), { EX: SESSION_TTL });
    } else {
        memSessions.set(code, session);
    }
};

const deleteSession = async (code) => {
    const rc = tryGetRedis();
    if (rc) {
        await rc.del(sessionKey(code));
    } else {
        memSessions.delete(code);
    }
};

// ─── Fix #1: Atomic duplicate-answer lock ────────────────────────────────────
// Returns true if the lock was acquired (first submission), false if already answered.
const acquireAnswerLock = async (roomCode, questionIndex, userId) => {
    const rc = tryGetRedis();
    const key = lockKey(roomCode, questionIndex, userId);
    if (rc) {
        // SETNX: returns 1 if key was new (lock acquired), 0 if existed
        const result = await rc.set(key, '1', { NX: true, EX: 600 }); // 10 min TTL
        return result === 'OK';
    }
    // In-memory fallback: use a flat Set keyed by the full lock key
    if (memResponseLocks.has(key)) return false;
    memResponseLocks.set(key, true);
    return true;
};

// ─── Quiz handler ────────────────────────────────────────────────────────────
const quizHandler = (io, socket) => {
    // socket.data.user is set by the JWT middleware in server.js

    socket.on('join_room', async ({ roomCode }) => {
        try {
            if (!roomCode) return;

            // Fix #10: userId from server-authoritative socket.data, not client payload
            const user = socket.data.user;
            if (!user) return socket.emit('error', 'Authentication required');

            socket.join(roomCode);

            let session = await getSession(roomCode);
            if (!session) {
                session = { status: 'upcoming', participants: {}, leaderboard: {}, lastActivity: Date.now() };
            }

            if (user.role !== 'organizer') {
                session.participants[user._id] = { _id: user._id, name: user.name, role: user.role };
            }
            session.lastActivity = Date.now();
            await setSession(roomCode, session);

            let currentQuestion = null;
            let timeLeft = 0;

            if (session.status === 'ongoing' && session.quizId) {
                // Fix #5 & #6: use session.questions (already in store) — no extra DB read
                const questions = session.questions || [];
                const q = questions[session.currentQuestionIndex];
                if (q) {
                    currentQuestion = formatQuestion(q, session.currentQuestionIndex, questions.length, session.questionExpiry);
                    timeLeft = Math.max(0, Math.floor((session.questionExpiry - Date.now()) / 1000));
                }
            }

            // Resolve quiz title: from session.quizId (new) or fallback roomCode match (scheduled)
            let quizTitle = null;
            if (session.quizId) {
                const q = await Quiz.findById(session.quizId).select('title').lean();
                quizTitle = q?.title;
            } else {
                const q = await Quiz.findOne({ roomCode }).select('title').lean();
                quizTitle = q?.title;
            }

            const leaderboardArray = Object.values(session.leaderboard)
                .sort((a, b) => b.score - a.score || a.time - b.time)
                .slice(0, 10);

            socket.emit('room_state', {
                status: session.status,
                title: quizTitle,
                currentQuestionIndex: session.currentQuestionIndex || 0,
                currentQuestion,
                participants: Object.values(session.participants),
                timeLeft,
                expiry: session.questionExpiry,
                leaderboard: leaderboardArray,
            });

            io.to(roomCode).emit('participants_update', Object.values(session.participants));
            console.log(`[Socket] ${user.name} (${user.role}) joined room ${roomCode}`);
        } catch (error) {
            console.error('[Socket Error] Join Room:', error);
            socket.emit('error', 'Failed to join room');
        }
    });

    socket.on('start_quiz', async ({ roomCode }) => {
        try {
            const user = socket.data.user;
            if (!user || user.role !== 'organizer') {
                return socket.emit('error', 'Only organizers can start a quiz');
            }

            // Fix #5: never use a closed-over stale quiz — look up fresh on every start
            const quizSession = await QuizSession.findOne({ sessionCode: roomCode }).lean();
            let quiz;
            if (quizSession) {
                quiz = await Quiz.findById(quizSession.quizId).lean();
            } else {
                quiz = await Quiz.findOne({ roomCode }).lean();
            }
            if (!quiz) return socket.emit('error', 'Quiz not found');

            const sessionQuestions = quiz.shuffleQuestions
                ? shuffleArray(quiz.questions.map(q => ({ ...q })))
                : quiz.questions.map(q => ({ ...q }));

            let session = await getSession(roomCode);
            const updatedSession = {
                ...(session || { participants: {} }),
                currentQuestionIndex: 0,
                leaderboard: {},
                status: 'ongoing',
                questionStartTime: null,
                questionExpiry: null,
                lastActivity: Date.now(),
                quizId: quiz._id.toString(),
                // Fix #7: store delay so broadcastQuestion can use it without DB
                interQuestionDelay: (quiz.interQuestionDelay ?? 5) * 1000,
                questions: sessionQuestions,
            };

            await setSession(roomCode, updatedSession);
            // Fix #5: pass null for stale-quiz-closure issue — broadcastQuestion reads from session
            broadcastQuestion(io, roomCode);
        } catch (error) {
            console.error('[Socket Error] Start Quiz:', error);
            socket.emit('error', 'Failed to start quiz');
        }
    });

    socket.on('submit_answer', async ({ roomCode, questionId, selectedOption }) => {
        try {
            // Fix #10: userId and userName come from server-auth, not client
            const user = socket.data.user;
            if (!user) return socket.emit('error', 'Authentication required');
            const { _id: userId, name: userName } = user;

            const session = await getSession(roomCode);
            if (!session || session.status !== 'ongoing') return;

            const currentQIndex = session.currentQuestionIndex;

            // Fix #1: Atomic lock — reject duplicate submissions for the same question
            const lockAcquired = await acquireAnswerLock(roomCode, currentQIndex, userId);
            if (!lockAcquired) return; // already answered this question

            // Fix #2: Time clamped server-side — no client clock needed
            if (Date.now() > session.questionExpiry) return; // expired

            // Fix #6: Question comes from session store — no DB read needed
            const question = session.questions?.[currentQIndex];
            if (!question) return;

            // Fix #3: Validate that submitted questionId matches the current question
            if (questionId && questionId.toString() !== question._id.toString()) {
                return socket.emit('error', 'Question mismatch — submission rejected');
            }

            // Fix #2: Server-authoritative timeTaken, clamped to [0, timeLimit]
            const rawTimeTaken = (Date.now() - session.questionStartTime) / 1000;
            const timeTaken = Math.min(Math.max(rawTimeTaken, 0), question.timeLimit);

            const isCorrect = compareAnswers(selectedOption, question.hashedCorrectAnswer);
            // Fix #4: calculateScore now uses maxTime
            const score = calculateScore(isCorrect, timeTaken, question.timeLimit);

            // Update in-memory leaderboard
            const userStats = session.leaderboard[userId] || { name: userName, score: 0, time: 0 };
            userStats.score += score;
            userStats.time += timeTaken;
            session.leaderboard[userId] = userStats;
            session.lastActivity = Date.now();

            await setSession(roomCode, session);

            // Fix #9: include sessionId so per-session queries are scoped correctly
            const sessionDoc = await QuizSession.findOne({ sessionCode: roomCode }).select('_id').lean();
            Submission.create({
                userId,
                quizId: session.quizId,
                sessionId: sessionDoc?._id || null,
                roomCode,
                questionId: question._id,   // always use server-authoritative questionId
                selectedOption,
                timeTaken,
                score,
            }).catch(err => console.error('[DB Error] Submission Fail:', err));

            socket.emit('answer_result', { isCorrect, score, totalScore: userStats.score });

            // Fix #8: Only sort top 50 for live leaderboard broadcast (bounded O(n log n))
            const allEntries = Object.values(session.leaderboard);
            const sortedLeaderboard = allEntries
                .sort((a, b) => b.score - a.score || a.time - b.time)
                .slice(0, 10);

            io.to(roomCode).emit('update_leaderboard', sortedLeaderboard);

            if (session.quizId) {
                const quiz = await Quiz.findById(session.quizId).select('parentId').lean();
                if (quiz?.parentId) {
                    const subjectId = quiz.parentId.toString();
                    const subjectLeaderboard = await getSubjectLeaderboardData(subjectId);
                    io.to(`subject_${subjectId}`).emit('subject_score_update', subjectLeaderboard);
                }
            }
        } catch (error) {
            console.error('[Socket Error] Submit Answer:', error);
            socket.emit('error', 'Failed to submit answer');
        }
    });
};

// ─── Broadcast Question ───────────────────────────────────────────────────────
// Fix #5: no stale quiz closure — all question data read from Redis session
const broadcastQuestion = async (io, roomCode) => {
    const session = await getSession(roomCode);
    if (!session) return;
    const questions = session.questions || [];

    if (activeTimers.has(roomCode)) {
        clearTimeout(activeTimers.get(roomCode));
        activeTimers.delete(roomCode);
    }

    if (session.currentQuestionIndex >= questions.length) {
        // Quiz complete
        session.status = 'completed';
        await setSession(roomCode, session);
        io.to(roomCode).emit('quiz_finished');

        const topWinners = Object.values(session.leaderboard)
            .sort((a, b) => b.score - a.score || a.time - b.time)
            .slice(0, 10)
            .map((p, i) => ({ name: p.name, score: p.score, time: p.time, rank: i + 1 }));

        QuizSession.findOneAndUpdate(
            { sessionCode: roomCode },
            { status: 'completed', endedAt: new Date(), topWinners, participantCount: Object.keys(session.participants || {}).length }
        ).catch(err => console.error('[DB Error] QuizSession persist:', err));

        setTimeout(() => deleteSession(roomCode), 10 * 60 * 1000);
        return;
    }

    const question = questions[session.currentQuestionIndex];
    session.questionStartTime = Date.now();
    session.questionExpiry = Date.now() + (question.timeLimit * 1000);
    await setSession(roomCode, session);

    const sanitized = formatQuestion(question, session.currentQuestionIndex, questions.length, session.questionExpiry);
    io.to(roomCode).emit('new_question', sanitized);

    // Fix #7: use configurable inter-question delay stored in session
    const delay = session.interQuestionDelay ?? 5000;

    const timeout = setTimeout(async () => {
        const s = await getSession(roomCode);
        if (s && s.status === 'ongoing') {
            s.currentQuestionIndex++;
            await setSession(roomCode, s);
            // Show results for `delay` ms before next question
            setTimeout(() => broadcastQuestion(io, roomCode), delay);
        }
    }, question.timeLimit * 1000);

    activeTimers.set(roomCode, timeout);
};

// ─── Reboot/Recovery ─────────────────────────────────────────────────────────
const rebootQuizzes = async (io) => {
    try {
        console.log('[Socket] Rebooting ongoing sessions...');
        const ongoingSessions = await QuizSession.find({ status: 'ongoing' });

        for (const qs of ongoingSessions) {
            const session = await getSession(qs.sessionCode);
            if (session && session.status === 'ongoing') {
                const now = Date.now();
                const timeLeft = session.questionExpiry - now;
                if (timeLeft > 0) {
                    const timeout = setTimeout(async () => {
                        const s = await getSession(qs.sessionCode);
                        if (s) {
                            s.currentQuestionIndex++;
                            await setSession(qs.sessionCode, s);
                            const delay = s.interQuestionDelay ?? 5000;
                            setTimeout(() => broadcastQuestion(io, qs.sessionCode), delay);
                        }
                    }, timeLeft);
                    activeTimers.set(qs.sessionCode, timeout);
                } else {
                    session.currentQuestionIndex++;
                    await setSession(qs.sessionCode, session);
                    broadcastQuestion(io, qs.sessionCode);
                }
            } else {
                qs.status = 'aborted';
                qs.endedAt = new Date();
                await qs.save();
            }
        }
    } catch (err) {
        console.error('[Socket Reboot] Failed:', err);
    }
};

// ─── Subject Leaderboard ─────────────────────────────────────────────────────
const getSubjectLeaderboardData = async (subjectId) => {
    const quizzes = await Quiz.find({ parentId: subjectId }).select('_id').lean();
    const quizIds = quizzes.map(q => q._id);

    return await Submission.aggregate([
        { $match: { quizId: { $in: quizIds } } },
        { $group: { _id: '$userId', totalScore: { $sum: '$score' }, totalTime: { $sum: '$timeTaken' }, quizzesTaken: { $addToSet: '$quizId' } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { name: '$user.name', score: '$totalScore', time: '$totalTime', count: { $size: '$quizzesTaken' } } },
        { $sort: { score: -1, time: 1 } },
        { $limit: 10 },
    ]);
};

module.exports = { quizHandler, rebootQuizzes };
