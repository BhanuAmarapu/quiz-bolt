const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');
const { hashAnswer } = require('../utils/crypto');
const { generateCode } = require('../utils/codeGenerator');

const createQuiz = async (req, res) => {
    try {
        const { title, type, parentId, isPaid, price } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Title is required' });
        }

        let roomCode = null;
        if (type !== 'subject') {
            roomCode = generateCode();
        }

        const quiz = await Quiz.create({
            title: title.trim(),
            organizerId: req.user._id,
            roomCode,
            type: type || 'quiz',
            parentId: parentId || null,
            isPaid: isPaid || false,
            price: isPaid ? (price || 0) : 0,
            questions: [],
        });

        res.status(201).json(quiz);
    } catch (error) {
        console.error('[Controller Error] Create Quiz:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const addQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { text, options, correctOption, timeLimit } = req.body;

        if (!text || !options || options.length < 2 || correctOption === undefined) {
            return res.status(400).json({ message: 'Question text, at least 2 options, and a correct option index are required' });
        }

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Hashing the correct answer from the selected option index
        const hashedCorrectAnswer = hashAnswer(options[correctOption]);

        quiz.questions.push({ text, options, correctOption, hashedCorrectAnswer, timeLimit });
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
        res.json(quizzes);
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
        const { title, status } = req.body;
        const quiz = await Quiz.findOneAndUpdate(
            { _id: id, organizerId: req.user._id },
            { title, status },
            { new: true }
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
        const { text, options, correctOption, timeLimit } = req.body;

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

        // Generate a fresh session code
        const newCode = generateCode();
        quiz.roomCode = newCode;
        quiz.status = 'ongoing';
        await quiz.save();

        res.json(quiz);
    } catch (error) {
        console.error('[Controller Error] Start Session:', error);
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
    startQuizSession
};
