const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { registerUser, loginUser, refresh, logoutUser } = require('../controllers/authController');

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

module.exports = router;
