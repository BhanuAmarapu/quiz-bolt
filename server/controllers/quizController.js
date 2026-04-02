const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');
const Submission = require('../models/Submission');
const { hashAnswer } = require('../utils/crypto');
const { generateCode } = require('../utils/codeGenerator');

const createQuiz = async (req, res) => {
    try {
        const { title, type, parentId, isPaid, price } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Title is required' });
        }

        let quiz;
        let attempts = 0;

        // Always assign a room code. This avoids duplicate-null index failures
        // on older databases where roomCode may have a non-sparse unique index.
        while (!quiz && attempts < 5) {
            attempts += 1;
            const roomCode = generateCode();

            try {
                quiz = await Quiz.create({
                    title: title.trim(),
                    organizerId: req.user._id,
                    roomCode,
                    type: type || 'quiz',
                    parentId: parentId || null,
                    isPaid: isPaid || false,
                    price: isPaid ? (price || 0) : 0,
                    shuffleQuestions: false,
                    questions: [],
                });
            } catch (err) {
                if (err?.code === 11000 && err?.keyPattern?.roomCode) {
                    continue;
                }
                throw err;
            }
        }

        if (!quiz) {
            return res.status(409).json({ message: 'Unable to allocate unique room code. Please try again.' });
        }

        res.status(201).json(quiz);
    } catch (error) {
        console.error('[Controller Error] Create Quiz:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const addQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { text, options, correctOption, timeLimit, shuffleOptions } = req.body;

        if (!text || !options || options.length < 2 || correctOption === undefined) {
            return res.status(400).json({ message: 'Question text, at least 2 options, and a correct option index are required' });
        }

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Hashing the correct answer from the selected option index
        const hashedCorrectAnswer = hashAnswer(options[correctOption]);

        quiz.questions.push({ text, options, correctOption, hashedCorrectAnswer, timeLimit, shuffleOptions: !!shuffleOptions });
        await quiz.save();

        res.json(quiz);
    } catch (error) {
        console.error('[Controller Error] Add Question:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getQuizByCode = async (req, res) => {
    try {
        const { roomCode } = req.params;
        const quiz = await Quiz.findOne({ roomCode }).select('-questions.hashedCorrectAnswer -questions.correctOption');

        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        res.json(quiz);
    } catch (error) {
        console.error('[Controller Error] Get Quiz By Code:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getMyQuizzes = async (req, res) => {
    try {
        const { parentId } = req.query;
        const query = { organizerId: req.user._id };

        if (parentId === 'none') {
            query.parentId = null;
        } else if (parentId) {
            query.parentId = parentId;
        }

        const quizzes = await Quiz.find(query).sort('-createdAt');
        const quizIds = quizzes.map(q => q._id);

        // Count distinct live sessions per quiz from Submission
        const sessionCounts = await Submission.aggregate([
            { $match: { quizId: { $in: quizIds } } },
            { $group: { _id: { quizId: '$quizId', roomCode: '$roomCode' } } },
            { $group: { _id: '$_id.quizId', sessionCount: { $sum: 1 } } }
        ]);
        const sessionCountMap = Object.fromEntries(
            sessionCounts.map(s => [s._id.toString(), s.sessionCount])
        );

        // Count child quizzes for subject-type folders
        const subjectIds = quizzes.filter(q => q.type === 'subject').map(q => q._id);
        const subDirCounts = subjectIds.length > 0
            ? await Quiz.aggregate([
                { $match: { parentId: { $in: subjectIds } } },
                { $group: { _id: '$parentId', count: { $sum: 1 } } }
            ])
            : [];
        const subDirCountMap = Object.fromEntries(
            subDirCounts.map(s => [s._id.toString(), s.count])
        );

        const enriched = quizzes.map(q => ({
            ...q.toObject(),
            sessionCount: sessionCountMap[q._id.toString()] || 0,
            subDirectoryCount: subDirCountMap[q._id.toString()] || 0,
        }));

        res.json(enriched);
    } catch (error) {
        console.error('[Controller Error] Get My Quizzes:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getSubjectLeaderboard = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const quizzes = await Quiz.find({ parentId: subjectId });
        const quizIds = quizzes.map(q => q._id);

        const leaderboard = await Submission.aggregate([
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

        res.json(leaderboard);
    } catch (error) {
        console.error('[Controller Error] Get Subject Leaderboard:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getUserHistory = async (req, res) => {
    try {
        const submissions = await Submission.find({ userId: req.user._id })
            .populate('quizId', 'title roomCode status questions')
            .sort('-createdAt');

        console.log(`[DB Debug] Found ${submissions.length} submissions for user ${req.user._id}`);

        // Group submissions by roomCode (session)
        const history = submissions.reduce((acc, sub) => {
            if (!sub.quizId) return acc;

            const sessionKey = sub.roomCode ? `${sub.quizId._id}_${sub.roomCode}` : sub.quizId._id.toString();
            if (!acc[sessionKey]) {
                acc[sessionKey] = {
                    quizTitle: sub.quizId.title,
                    quizId: sub.quizId._id,
                    roomCode: sub.roomCode,
                    date: sub.createdAt,
                    totalScore: 0,
                    totalTime: 0,
                    answers: []
                };
            }

            // Find the question for this submission to get correct answer
            const question = sub.quizId.questions.find(
                q => q._id.toString() === sub.questionId.toString()
            );

            acc[sessionKey].totalScore += sub.score;
            acc[sessionKey].totalTime += sub.timeTaken;
            acc[sessionKey].answers.push({
                questionText: question ? question.text : 'Deleted Question',
                selected: sub.selectedOption,
                score: sub.score,
                isCorrect: sub.score > 0
            });

            return acc;
        }, {});

        console.log(`[DB Debug] Grouped into ${Object.values(history).length} unique sessions for user`);
        res.json(Object.values(history));
    } catch (error) {
        console.error('[Controller Error] Get User History:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getQuizLeaderboard = async (req, res) => {
    try {
        const { id } = req.params;
        const leaderboard = await Submission.aggregate([
            { $match: { quizId: new mongoose.Types.ObjectId(id) } },
            {
                $group: {
                    _id: "$userId",
                    totalScore: { $sum: "$score" },
                    totalTime: { $sum: "$timeTaken" }
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
                    time: "$totalTime"
                }
            },
            { $sort: { score: -1, time: 1 } },
            { $limit: 10 }
        ]);
        res.json(leaderboard);
    } catch (error) {
        console.error('[Controller Error] Get Quiz Leaderboard:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getOrganizerStats = async (req, res) => {
    try {
        const quizzes = await Quiz.find({ organizerId: req.user._id });
        // Get all unique sessions for this organizer's quizzes
        const quizIds = quizzes.map(q => q._id);
        const sessions = await Submission.aggregate([
            { $match: { quizId: { $in: quizIds } } },
            {
                $group: {
                    _id: "$roomCode",
                    quizId: { $first: "$quizId" },
                    participantCount: { $addToSet: "$userId" },
                    totalAnswers: { $count: {} },
                    firstSubmission: { $min: "$createdAt" }
                }
            },
            {
                $lookup: {
                    from: 'quizzes',
                    localField: 'quizId',
                    foreignField: '_id',
                    as: 'quiz'
                }
            },
            { $unwind: "$quiz" },
            { $sort: { firstSubmission: -1 } }
        ]);

        const stats = sessions.map(s => ({
            _id: s._id,
            quizId: s.quizId,
            title: s.quiz.title,
            roomCode: s._id,
            status: 'completed', // If it's in submission history, it's basically done or ongoing
            participantCount: s.participantCount.length,
            totalAnswers: s.totalAnswers,
            createdAt: s.firstSubmission
        }));

        res.json(stats);
    } catch (error) {
        console.error('[Controller Error] Get Organizer Stats:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const updateQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, status, shuffleQuestions } = req.body;
        const updateData = {};

        if (title !== undefined) updateData.title = title;
        if (status !== undefined) updateData.status = status;
        if (shuffleQuestions !== undefined) updateData.shuffleQuestions = shuffleQuestions;
        const quiz = await Quiz.findOneAndUpdate(
            { _id: id, organizerId: req.user._id },
            updateData,
            { returnDocument: 'after' }
        );
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        res.json(quiz);
    } catch (error) {
        console.error('[Controller Error] Update Quiz:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await Quiz.findOne({ _id: id, organizerId: req.user._id });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Cascade delete children if it's a subject
        if (quiz.type === 'subject') {
            const childQuizzes = await Quiz.find({ parentId: id });
            const childIds = childQuizzes.map(q => q._id);
            await Submission.deleteMany({ quizId: { $in: childIds } });
            await Quiz.deleteMany({ parentId: id });
        } else {
            await Submission.deleteMany({ quizId: id });
        }

        await Quiz.deleteOne({ _id: id });
        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        console.error('[Controller Error] Delete Quiz:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const updateQuestion = async (req, res) => {
    try {
        const { quizId, questionId } = req.params;
        const { text, options, correctOption, timeLimit, shuffleOptions } = req.body;

        const quiz = await Quiz.findOne({ _id: quizId, organizerId: req.user._id });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        const question = quiz.questions.id(questionId);
        if (!question) return res.status(404).json({ message: 'Question not found' });

        if (text) question.text = text;
        if (options) question.options = options;
        if (correctOption !== undefined) {
            question.correctOption = correctOption;
            // Use provided options or existing ones to hash the correct answer
            const targetOptions = options || question.options;
            question.hashedCorrectAnswer = hashAnswer(targetOptions[correctOption]);
        }
        if (timeLimit) question.timeLimit = timeLimit;
        if (shuffleOptions !== undefined) question.shuffleOptions = shuffleOptions;

        await quiz.save();
        res.json(quiz);
    } catch (error) {
        console.error('[Controller Error] Update Question:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const deleteQuestion = async (req, res) => {
    try {
        const { quizId, questionId } = req.params;
        const quiz = await Quiz.findOne({ _id: quizId, organizerId: req.user._id });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        quiz.questions.pull(questionId);
        await quiz.save();
        res.json(quiz);
    } catch (error) {
        console.error('[Controller Error] Delete Question:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const startQuizSession = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await Quiz.findOne({ _id: id, organizerId: req.user._id });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // The quiz is a permanent template — generate a fresh unique session code
        let session;
        let attempts = 0;
        while (!session && attempts < 5) {
            attempts++;
            const sessionCode = generateCode();
            try {
                session = await QuizSession.create({
                    quizId: quiz._id,
                    sessionCode,
                    status: 'ongoing',
                    startedAt: new Date(),
                });
            } catch (err) {
                if (err?.code === 11000) continue; // duplicate code, retry
                throw err;
            }
        }
        if (!session) return res.status(409).json({ message: 'Unable to allocate unique session code' });

        // Return quiz data + the live session code so frontend can use it
        res.json({
            ...quiz.toObject(),
            sessionCode: session.sessionCode,
            sessionId: session._id,
        });
    } catch (error) {
        console.error('[Controller Error] Start Session:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const abortSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { sessionCode } = req.body;

        // Verify ownership via quiz template
        const quiz = await Quiz.findOne({ _id: id, organizerId: req.user._id });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Mark the active session as aborted
        if (sessionCode) {
            await QuizSession.findOneAndUpdate(
                { sessionCode, quizId: id },
                { status: 'aborted', endedAt: new Date() }
            );
        }

        res.json({ message: 'Session aborted' });
    } catch (error) {
        console.error('[Controller Error] Abort Session:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Per-question option distribution stats for a completed session
const getSessionResults = async (req, res) => {
    try {
        const { sessionCode } = req.params;

        // Load the session to get quizId
        const session = await QuizSession.findOne({ sessionCode });
        if (!session) return res.status(404).json({ message: 'Session not found' });

        // Load the quiz template (questions + correct answers)
        const quiz = await Quiz.findById(session.quizId);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Get all submissions for this session
        const submissions = await Submission.find({ roomCode: sessionCode });
        const totalParticipants = new Set(submissions.map(s => s.userId.toString())).size;

        // Build per-question stats
        const questionStats = quiz.questions.map(q => {
            const qSubs = submissions.filter(s => s.questionId.toString() === q._id.toString());
            const optionCounts = {};
            q.options.forEach(opt => { optionCounts[opt] = 0; });
            qSubs.forEach(s => {
                if (optionCounts[s.selectedOption] !== undefined) {
                    optionCounts[s.selectedOption]++;
                }
            });
            const correctOption = q.options[q.correctOption];
            const optionStats = q.options.map((opt, idx) => ({
                option: opt,
                count: optionCounts[opt] || 0,
                percentage: qSubs.length > 0
                    ? Math.round(((optionCounts[opt] || 0) / qSubs.length) * 100)
                    : 0,
                isCorrect: idx === q.correctOption,
            }));

            return {
                questionId: q._id,
                text: q.text,
                totalAnswered: qSubs.length,
                correctOption,
                options: optionStats,
                correctPercentage: qSubs.length > 0
                    ? Math.round(((optionCounts[correctOption] || 0) / qSubs.length) * 100)
                    : 0,
            };
        });

        res.json({
            session,
            quizTitle: quiz.title,
            totalParticipants,
            topWinners: session.topWinners,
            questionStats,
        });
    } catch (error) {
        console.error('[Controller Error] Get Session Results:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// All sessions run for a quiz template (organizer history per quiz)
const getQuizSessions = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await Quiz.findOne({ _id: id, organizerId: req.user._id });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        const sessions = await QuizSession.find({ quizId: id }).sort('-startedAt');
        res.json({ quizTitle: quiz.title, sessions });
    } catch (error) {
        console.error('[Controller Error] Get Quiz Sessions:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const scheduleQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const { scheduledAt } = req.body;

        if (!scheduledAt) {
            return res.status(400).json({ message: 'scheduledAt date-time is required' });
        }

        const scheduled = new Date(scheduledAt);
        if (isNaN(scheduled.getTime()) || scheduled <= new Date()) {
            return res.status(400).json({ message: 'scheduledAt must be a valid future date-time' });
        }

        // Keep the existing roomCode — the permanent join link must not change
        const quiz = await Quiz.findOneAndUpdate(
            { _id: id, organizerId: req.user._id },
            { scheduledAt: scheduled, status: 'upcoming' },
            { returnDocument: 'after' }
        );
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        res.json(quiz);
    } catch (error) {
        console.error('[Controller Error] Schedule Quiz:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Participant registers/joins a scheduled session — recorded with timestamp
const joinScheduledSession = async (req, res) => {
    try {
        const { roomCode } = req.params;
        const userId = req.user._id;
        const userName = req.user.name;

        const quiz = await Quiz.findOne({ roomCode });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Prevent duplicate registrations
        const alreadyJoined = quiz.joinedParticipants.some(
            p => p.userId.toString() === userId.toString()
        );
        if (!alreadyJoined) {
            quiz.joinedParticipants.push({ userId, name: userName, joinedAt: new Date() });
            await quiz.save();
        }

        res.json({
            quizId: quiz._id,
            title: quiz.title,
            roomCode: quiz.roomCode,
            scheduledAt: quiz.scheduledAt,
            joinedAt: quiz.joinedParticipants.find(p => p.userId.toString() === userId.toString())?.joinedAt,
        });
    } catch (error) {
        console.error('[Controller Error] Join Scheduled Session:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get all scheduled sessions a participant has joined
const getMyScheduledJoins = async (req, res) => {
    try {
        const userId = req.user._id;
        const quizzes = await Quiz.find(
            { 'joinedParticipants.userId': userId },
            { title: 1, roomCode: 1, scheduledAt: 1, status: 1, organizerId: 1, 'joinedParticipants.$': 1 }
        ).sort({ scheduledAt: 1 });

        const result = quizzes.map(q => ({
            quizId: q._id,
            title: q.title,
            roomCode: q.roomCode,
            scheduledAt: q.scheduledAt,
            status: q.status,
            joinedAt: q.joinedParticipants[0]?.joinedAt,
        }));

        res.json(result);
    } catch (error) {
        console.error('[Controller Error] Get Scheduled Joins:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createQuiz,
    addQuestion,
    getQuizByCode,
    getMyQuizzes,
    getUserHistory,
    getOrganizerStats,
    getSubjectLeaderboard,
    getQuizLeaderboard,
    updateQuiz,
    deleteQuiz,
    updateQuestion,
    deleteQuestion,
    startQuizSession,
    abortSession,
    scheduleQuiz,
    joinScheduledSession,
    getMyScheduledJoins,
    getSessionResults,
    getQuizSessions,
};
