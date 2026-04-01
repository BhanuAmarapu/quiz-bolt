const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');

const PAYMENT_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:5001';

// Helper to forward requests to payment-service
const proxy = async (req, res, method, path, data) => {
    try {
        const config = {
            method,
            url: `${PAYMENT_URL}${path}`,
            headers: {
                'Content-Type': 'application/json',
                'X-Correlation-ID': req.headers['x-correlation-id'] || `${Date.now()}`,
            },
        };
        if (data) config.data = data;

        const response = await axios(config);
        res.status(response.status).json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        const body = error.response?.data || { error: { code: 'PROXY_ERROR', message: 'Payment service unavailable' } };
        res.status(status).json(body);
    }
};

// @route   POST /api/payment/create-order
// @desc    Create a Razorpay order (authed user)
router.post('/create-order', protect, (req, res) => {
    const { quizId, amount } = req.body;
    proxy(req, res, 'post', '/payment/create-order', {
        userId: req.user._id.toString(),
        quizId,
        amount,
    });
});

// @route   POST /api/payment/verify
// @desc    Verify a completed payment
router.post('/verify', protect, (req, res) => {
    const { orderId, paymentId, signature, quizId } = req.body;
    proxy(req, res, 'post', '/payment/verify', {
        orderId,
        paymentId,
        signature,
        userId: req.user._id.toString(),
        quizId,
    });
});

// @route   GET /api/payment/status/:quizId
// @desc    Check if current user paid for a quiz
router.get('/status/:quizId', protect, (req, res) => {
    proxy(req, res, 'get', `/payment/status/${req.user._id}/${req.params.quizId}`);
});

// @route   POST /api/payment/status/batch
// @desc    Batch check payment status for multiple quizzes
router.post('/status/batch', protect, (req, res) => {
    const { quizIds } = req.body;
    proxy(req, res, 'post', '/payment/status/batch', {
        userId: req.user._id.toString(),
        quizIds,
    });
});

// @route   POST /api/payment/revenue/total
// @desc    Get total organizer revenue
router.post('/revenue/total', protect, (req, res) => {
    proxy(req, res, 'post', '/payment/revenue/total', req.body);
});

// @route   POST /api/payment/revenue/by-quiz
// @desc    Get revenue breakdown per quiz
router.post('/revenue/by-quiz', protect, (req, res) => {
    proxy(req, res, 'post', '/payment/revenue/by-quiz', req.body);
});

// @route   GET /api/payment/health
// @desc    Check payment service health
router.get('/health', async (req, res) => {
    try {
        const response = await axios.get(`${PAYMENT_URL}/payment/health`);
        res.json(response.data);
    } catch {
        res.status(503).json({ status: 'unhealthy', message: 'Payment service unavailable' });
    }
});

module.exports = router;
