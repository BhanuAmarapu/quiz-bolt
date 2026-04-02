const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { registerUser, loginUser, refresh, logoutUser, getMyProfile, updateMyProfile } = require('../controllers/authController');

router.post('/register', [
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role').optional().isIn(['participant', 'organizer', 'admin']).withMessage('Invalid role'),
    validate
], registerUser);

router.post('/login', [
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password').exists().withMessage('Password is required'),
    validate
], loginUser);

router.post('/refresh', refresh);
router.post('/logout', logoutUser);
router.get('/me', protect, getMyProfile);
router.put('/me', protect, [
    body('name').optional().isString().trim().notEmpty().withMessage('Name cannot be empty'),
    body('profilePhoto').optional().isString().withMessage('profilePhoto must be a string'),
    validate
], updateMyProfile);

module.exports = router;
