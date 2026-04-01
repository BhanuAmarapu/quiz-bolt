const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const {
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
} = require('../controllers/quizController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', [
    protect,
    authorize('organizer', 'admin'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('type').isIn(['quiz', 'subject']).withMessage('Invalid quiz type'),
    body('price').custom((value, { req }) => {
        if (req.body.isPaid && (value === undefined || value < 0)) {
            throw new Error('Valid price is required for paid quizzes');
        }
        return true;
    }),
    validate
], createQuiz);
router.get('/my-quizzes', protect, authorize('organizer', 'admin'), getMyQuizzes);
router.get('/subject/:subjectId/leaderboard', protect, getSubjectLeaderboard);
router.get('/organizer/history', protect, authorize('organizer', 'admin'), getOrganizerStats);
router.get('/user/history', protect, getUserHistory);

router.put('/:id', protect, authorize('organizer', 'admin'), updateQuiz);
router.post('/:id/start', protect, authorize('organizer', 'admin'), startQuizSession);
router.delete('/:id', protect, authorize('organizer', 'admin'), deleteQuiz);

router.post('/:id/questions', [
    protect,
    authorize('organizer', 'admin'),
    body('text').trim().notEmpty().withMessage('Question text is required'),
    body('options').isArray({ min: 4, max: 4 }).withMessage('Exactly 4 options are required'),
    body('correctOption').isInt({ min: 0, max: 3 }).withMessage('Correct option must be between 0 and 3'),
    validate
], addQuestion);
router.put('/:quizId/questions/:questionId', protect, authorize('organizer', 'admin'), updateQuestion);
router.delete('/:quizId/questions/:questionId', protect, authorize('organizer', 'admin'), deleteQuestion);

router.get('/:id/leaderboard', protect, getQuizLeaderboard);

router.get('/:roomCode', protect, getQuizByCode);

module.exports = router;
