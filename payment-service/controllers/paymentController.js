const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @desc    Create payment order
// @route   POST /payment/create-order
// @access  Public
const createOrder = async (req, res) => {
  try {
    const { quizId, amount } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!quizId || !amount) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please provide quizId, and amount',
          details: { correlationId: req.correlationId }
        }
      });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({
      userId,
      quizId,
      status: 'completed'
    });

    if (existingPayment) {
      return res.status(409).json({
        error: {
          code: 'PAYMENT_EXISTS',
          message: 'Payment already completed for this quiz',
          details: {
            correlationId: req.correlationId,
            paymentId: existingPayment._id
          }
        }
      });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `quiz_${quizId}_user_${userId}_${Date.now()}`
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Save payment record
    const payment = await Payment.create({
      userId,
      quizId,
      amount,
      currency: 'INR',
      razorpayOrderId: razorpayOrder.id,
      status: 'created'
    });

    logger.info('Payment order created', { orderId: razorpayOrder.id, quizId, userId, amount });

    res.status(201).json({
      success: true,
      data: {
        orderId: razorpayOrder.id,
        amount: amount,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    logger.error('Create order error', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Error creating payment order',
        details: { correlationId: req.correlationId }
      }
    });
  }
};

// @desc    Verify payment
// @route   POST /payment/verify
// @access  Public
const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature, userId, quizId } = req.body;

    // Validate required fields
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please provide orderId, paymentId, and signature',
          details: { correlationId: req.correlationId }
        }
      });
    }

    // Find payment record
    const payment = await Payment.findOne({ razorpayOrderId: orderId });

    if (!payment) {
      return res.status(404).json({
        error: {
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment record not found',
          details: { correlationId: req.correlationId }
        }
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      logger.error('Payment verification failed', { orderId });
      return res.status(400).json({
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Payment verification failed. Invalid signature',
          details: { correlationId: req.correlationId }
        }
      });
    }

    // Update payment record
    payment.razorpayPaymentId = paymentId;
    payment.razorpaySignature = signature;
    payment.status = 'completed';
    await payment.save();

    logger.info('Payment verified', { paymentId, orderId, status: 'completed' });

    res.status(200).json({
      success: true,
      data: {
        paymentId: payment._id,
        razorpayPaymentId: paymentId,
        status: 'completed'
      }
    });
  } catch (error) {
    logger.error('Verify payment error', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Error verifying payment',
        details: { correlationId: req.correlationId }
      }
    });
  }
};

// @desc    Get payment status
// @route   GET /payment/status/:userId/:quizId
// @access  Public
const getPaymentStatus = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user._id;

    const payment = await Payment.findOne({
      userId,
      quizId,
      status: 'completed'
    });

    if (!payment) {
      return res.status(200).json({
        success: true,
        data: {
          paid: false
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        paid: true,
        paymentId: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        paidAt: payment.updatedAt
      }
    });
  } catch (error) {
    logger.error('Get payment status error', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Error fetching payment status',
        details: { correlationId: req.correlationId }
      }
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentStatus
};

// @desc    Batch payment status check
// @route   POST /payment/status/batch
// @access  Internal (backend service)
const getBatchPaymentStatus = async (req, res) => {
  try {
    const { quizIds } = req.body;
    const userId = req.user._id;

    if (!quizIds || !Array.isArray(quizIds)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please provide quizIds array',
          details: { correlationId: req.correlationId }
        }
      });
    }

    // Single query for all quizzes
    const payments = await Payment.find({
      userId,
      quizId: { $in: quizIds },
      status: 'completed'
    }).select('quizId amount currency updatedAt');

    // Build lookup map
    const statusMap = {};
    for (const quizId of quizIds) {
      statusMap[quizId] = { paid: false };
    }
    for (const payment of payments) {
      statusMap[payment.quizId.toString()] = {
        paid: true,
        paymentId: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        paidAt: payment.updatedAt
      };
    }

    res.status(200).json({
      success: true,
      data: statusMap
    });
  } catch (error) {
    logger.error('Batch payment status error', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Error fetching batch payment status',
        details: { correlationId: req.correlationId }
      }
    });
  }
};

// @desc    Handle Razorpay webhook
// @route   POST /payment/webhook
// @access  Public (Razorpay only)
const handleWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSignature) {
      logger.error('Webhook signature missing');
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Webhook signature missing'
        }
      });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      logger.error('Invalid webhook signature');
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid webhook signature'
        }
      });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload.payment.entity;

    logger.info('Webhook received', { event, paymentId: paymentEntity.id, orderId: paymentEntity.order_id });

    // Handle payment.captured event
    if (event === 'payment.captured') {
      const payment = await Payment.findOne({
        razorpayOrderId: paymentEntity.order_id
      });

      if (payment && payment.status !== 'completed') {
        payment.razorpayPaymentId = paymentEntity.id;
        payment.status = 'completed';
        await payment.save();
        logger.info('Payment marked as completed via webhook', { paymentId: paymentEntity.id, orderId: paymentEntity.order_id });
      }
    }

    // Handle payment.failed event
    if (event === 'payment.failed') {
      const payment = await Payment.findOne({
        razorpayOrderId: paymentEntity.order_id
      });

      if (payment && payment.status !== 'failed') {
        payment.razorpayPaymentId = paymentEntity.id;
        payment.status = 'failed';
        await payment.save();
        logger.info('Payment marked as failed via webhook', { paymentId: paymentEntity.id, orderId: paymentEntity.order_id });
      }
    }

    // Return 200 to acknowledge receipt
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Webhook handler error', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Error processing webhook'
      }
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  getBatchPaymentStatus,
  handleWebhook
};
