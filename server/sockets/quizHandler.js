const Quiz = require('../models/Quiz');
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
const activeTimers = new Map(); // roomCode -> timeout object

const SESSION_TTL = 3600; // 1 hour

const sessionKey = (roomCode) => `quiz:session:${roomCode}`;

const shuffleArray = (items) => {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const getSessionQuestions = (session, quiz) => session?.questions?.length ? session.questions : quiz.questions;

const formatQuestion = (question, index, total, expiry) => {
    const options = question.shuffleOptions ? shuffleArray(question.options) : question.options;

    return {
        _id: question._id,
        text: question.text,
        options,
        timeLimit: question.timeLimit,
        mediaUrl: question.mediaUrl,
        questionType: question.questionType,
        shuffleOptions: !!question.shuffleOptions,
        index,
        total,
        expiry,
    };
};

const getSession = async (roomCode) => {
    const rc = tryGetRedis();
    if (rc) {
        const raw = await rc.get(sessionKey(roomCode));
        return raw ? JSON.parse(raw) : null;
    }
    return memSessions.get(roomCode) || null;
};

const setSession = async (roomCode, session) => {
    const rc = tryGetRedis();
    if (rc) {
        await rc.set(sessionKey(roomCode), JSON.stringify(session), { EX: SESSION_TTL });
    } else {
        memSessions.set(roomCode, session);
    }
};

const deleteSession = async (roomCode) => {
    const rc = tryGetRedis();
    if (rc) {
        await rc.del(sessionKey(roomCode));
    } else {
        memSessions.delete(roomCode);
    }
};

const quizHandler = (io, socket) => {
    // Reconnection & Initial Join
    socket.on('join_room', async ({ roomCode, user }) => {
        try {
            if (!roomCode || !user) return;
            socket.join(roomCode);

            let session = await getSession(roomCode);
            if (!session) {
                session = {
                    status: 'upcoming',
                    participants: {},
                    leaderboard: {},
                    lastActivity: Date.now()
                };
            }

            if (user.role !== 'organizer') {
                session.participants[user._id] = user;
            }
            session.lastActivity = Date.now();
            await setSession(roomCode, session);

            let currentQuestion = null;
            let timeLeft = 0;

            if (session.status === 'ongoing') {
                const quiz = await Quiz.findById(session.quizId);
                const questions = getSessionQuestions(session, quiz || {});
                if (questions && questions[session.currentQuestionIndex]) {
                    currentQuestion = formatQuestion(
                        questions[session.currentQuestionIndex],
                        session.currentQuestionIndex,
                        questions.length,
                        session.questionExpiry
                    );
                    timeLeft = Math.max(0, Math.floor((session.questionExpiry - Date.now()) / 1000));
                }
            }

            const leaderboardArray = Object.values(session.leaderboard)
                .sort((a, b) => b.score - a.score || a.time - b.time)
                .slice(0, 10);

            const quizMetadata = await Quiz.findOne({ roomCode }).select('title');

            socket.emit('room_state', {
                status: session.status,
                title: quizMetadata?.title,
                currentQuestionIndex: session.currentQuestionIndex || 0,
                currentQuestion,
                participants: Object.values(session.participants),
                timeLeft,
                expiry: session.questionExpiry,
                leaderboard: leaderboardArray
            });

            io.to(roomCode).emit('participants_update', Object.values(session.participants));
            console.log(`[Socket] User ${user.name} joined room ${roomCode}`);
        } catch (error) {
            console.error('[Socket Error] Join Room:', error);
            socket.emit('error', 'Failed to join room');
        }
    });

    socket.on('start_quiz', async ({ roomCode }) => {
        try {
            const quiz = await Quiz.findOne({ roomCode });
            if (!quiz) return socket.emit('error', 'Quiz not found');

            quiz.status = 'ongoing';
            await quiz.save();

            const sessionQuestions = quiz.shuffleQuestions
                ? shuffleArray(quiz.questions.map(question => (question.toObject ? question.toObject() : question)))
                : quiz.questions.map(question => (question.toObject ? question.toObject() : question));

            let session = await getSession(roomCode);
            const updatedSession = {
                ...(session || { participants: {} }),
                currentQuestionIndex: 0,
                leaderboard: {},
                responses: [],
                status: 'ongoing',
                questionStartTime: null,
                questionExpiry: null,
                lastActivity: Date.now(),
                quizId: quiz._id.toString(),
                questions: sessionQuestions
            };

            await setSession(roomCode, updatedSession);
            broadcastQuestion(io, roomCode, quiz);
        } catch (error) {
            console.error('[Socket Error] Start Quiz:', error);
            socket.emit('error', 'Failed to start quiz');
        }
    });

    socket.on('submit_answer', async ({ roomCode, userId, userName, questionId, selectedOption }) => {
        try {
            const session = await getSession(roomCode);
            if (!session || session.status !== 'ongoing') return;

            if (session.responses.includes(userId)) return;
            if (Date.now() > session.questionExpiry) return;

            const quiz = await Quiz.findById(session.quizId);
            const questions = getSessionQuestions(session, quiz || {});
            const question = questions[session.currentQuestionIndex];

            const timeTaken = (Date.now() - session.questionStartTime) / 1000;
            const isCorrect = compareAnswers(selectedOption, question.hashedCorrectAnswer);
            const score = calculateScore(isCorrect, timeTaken, question.timeLimit);

            session.responses.push(userId);
            session.lastActivity = Date.now();

            const userStats = session.leaderboard[userId] || { name: userName, score: 0, time: 0 };
            userStats.score += score;
            userStats.time += timeTaken;
            session.leaderboard[userId] = userStats;

            await setSession(roomCode, session);

            Submission.create({
                userId,
                quizId: quiz._id,
                roomCode,
                questionId,
                selectedOption,
                timeTaken,
                score,
            }).then(() => {
                console.log(`[DB Success] Submission stored for user ${userId} in session ${roomCode}`);
            }).catch(err => console.error('[DB Error] Submission Fail:', err));

            socket.emit('answer_result', { isCorrect, score, totalScore: userStats.score });

            const sortedLeaderboard = Object.values(session.leaderboard)
                .sort((a, b) => b.score - a.score || a.time - b.time)
                .slice(0, 10);

            io.to(roomCode).emit('update_leaderboard', sortedLeaderboard);

            if (quiz.parentId) {
                const subjectId = quiz.parentId.toString();
                const subjectLeaderboard = await getSubjectLeaderboardData(subjectId);
                io.to(`subject_${subjectId}`).emit('subject_score_update', subjectLeaderboard);
            }
        } catch (error) {
            console.error('[Socket Error] Submit Answer:', error);
            socket.emit('error', 'Failed to submit answer');
        }
    });
};

const broadcastQuestion = async (io, roomCode, quiz) => {
    const session = await getSession(roomCode);
    if (!session) return;
    const sessionQuestions = getSessionQuestions(session, quiz);

    // Clear existing timer if any
    if (activeTimers.has(roomCode)) {
        clearTimeout(activeTimers.get(roomCode));
        activeTimers.delete(roomCode);
    }

    if (session.currentQuestionIndex >= sessionQuestions.length) {
        session.status = 'completed';
        await setSession(roomCode, session);
        io.to(roomCode).emit('quiz_finished');
        quiz.status = 'completed';
        await quiz.save();
        setTimeout(() => deleteSession(roomCode), 10 * 60 * 1000);
        return;
    }

    const question = sessionQuestions[session.currentQuestionIndex];
    session.responses = [];
    session.questionStartTime = Date.now();
    session.questionExpiry = Date.now() + (question.timeLimit * 1000);
    await setSession(roomCode, session);

    const sanitizedQuestion = formatQuestion(
        question,
        session.currentQuestionIndex,
        sessionQuestions.length,
        session.questionExpiry
    );

    io.to(roomCode).emit('new_question', sanitizedQuestion);

    // Use a single timeout to trigger next phase
    const timeout = setTimeout(async () => {
        const s = await getSession(roomCode);
        if (s && s.status === 'ongoing') {
            s.currentQuestionIndex++;
            await setSession(roomCode, s);
            // Buffer to show results before next question
            setTimeout(() => broadcastQuestion(io, roomCode, quiz), 5000);
        }
    }, question.timeLimit * 1000);

    activeTimers.set(roomCode, timeout);
};

// Reboot/Recovery: Resumes ongoing quizzes on server start
const rebootQuizzes = async (io) => {
    try {
        console.log('[Socket] Rebooting ongoing quizzes...');
        const ongoingQuizzes = await Quiz.find({ status: 'ongoing' });

        for (const quiz of ongoingQuizzes) {
            const session = await getSession(quiz.roomCode);
            if (session && session.status === 'ongoing') {
                const now = Date.now();
                const timeLeft = session.questionExpiry - now;

                if (timeLeft > 0) {
                    // Resume existing question timer
                    const timeout = setTimeout(async () => {
                        const s = await getSession(quiz.roomCode);
                        if (s) {
                            s.currentQuestionIndex++;
                            await setSession(quiz.roomCode, s);
                            setTimeout(() => broadcastQuestion(io, quiz.roomCode, quiz), 5000);
                        }
                    }, timeLeft);
                    activeTimers.set(quiz.roomCode, timeout);
                } else {
                    // Move to next question immediately
                    session.currentQuestionIndex++;
                    await setSession(quiz.roomCode, session);
                    broadcastQuestion(io, quiz.roomCode, quiz);
                }
            } else {
                // If no session but status is ongoing, mark as completed to clean up
                quiz.status = 'completed';
                await quiz.save();
            }
        }
    } catch (err) {
        console.error('[Socket Reboot] Failed:', err);
    }
};

const getSubjectLeaderboardData = async (subjectId) => {
    const quizzes = await Quiz.find({ parentId: subjectId });
    const quizIds = quizzes.map(q => q._id);

    return await Submission.aggregate([
        { $match: { quizId: { $in: quizIds } } },
        {
            $group: {
                _id: "$userId",
                totalScore: { $sum: "$score" },
                totalTime: { $sum: "$timeTaken" },
                quizzesTaken: { $addToSet: "$quizId" }
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: "$user" },
        {
            $project: {
                name: "$user.name",
                score: "$totalScore",
                time: "$totalTime",
                count: { $size: "$quizzesTaken" }
            }
        },
        { $sort: { score: -1, time: 1 } },
        { $limit: 10 }
    ]);
};

module.exports = { quizHandler, rebootQuizzes };
