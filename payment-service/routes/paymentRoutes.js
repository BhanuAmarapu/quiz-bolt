const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  getBatchPaymentStatus,
  handleWebhook
} = require('../controllers/paymentController');
const revenueController = require('../controllers/revenueController');

// Payment routes
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.get('/status/:quizId', protect, getPaymentStatus);
router.post('/status/batch', protect, getBatchPaymentStatus);
router.post('/webhook', handleWebhook); // Webhook usually uses signature, not JWT

// Revenue routes
router.post('/revenue/total', protect, revenueController.getTotalRevenue);
router.post('/revenue/by-quiz', protect, revenueController.getRevenueByQuiz);
router.post('/revenue/by-period', protect, revenueController.getRevenueByPeriod);

module.exports = router;
