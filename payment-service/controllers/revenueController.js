const Payment = require('../models/Payment');
const logger = require('../utils/logger');

/**
 * Calculate total revenue for given quiz IDs
 * POST /payment/revenue/total
 */
exports.getTotalRevenue = async (req, res) => {
  try {
    const { quizIds } = req.body;

    if (!quizIds || !Array.isArray(quizIds) || quizIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'quizIds array is required'
      });
    }

    // Calculate total revenue from completed payments
    const result = await Payment.aggregate([
      {
        $match: {
          quizId: { $in: quizIds.map(id => require('mongoose').Types.ObjectId(id)) },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' }
        }
      }
    ]);

    const totalRevenue = result.length > 0 ? result[0].totalRevenue : 0;

    res.json({
      totalRevenue,
      currency: 'INR'
    });
  } catch (error) {
    logger.error('Error calculating total revenue', { error: error.message });
    res.status(500).json({
      error: 'Failed to calculate total revenue',
      message: error.message
    });
  }
};

/**
 * Get revenue breakdown by quiz
 * POST /payment/revenue/by-quiz
 */
exports.getRevenueByQuiz = async (req, res) => {
  try {
    const { quizIds } = req.body;

    if (!quizIds || !Array.isArray(quizIds) || quizIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'quizIds array is required'
      });
    }

    // Calculate revenue per quiz
    const result = await Payment.aggregate([
      {
        $match: {
          quizId: { $in: quizIds.map(id => require('mongoose').Types.ObjectId(id)) },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$quizId',
          revenue: { $sum: '$amount' },
          participantCount: { $sum: 1 }
        }
      }
    ]);

    // Format response
    const quizzes = result.map(item => ({
      quizId: item._id.toString(),
      revenue: item.revenue,
      participantCount: item.participantCount
    }));

    res.json({
      quizzes,
      currency: 'INR'
    });
  } catch (error) {
    logger.error('Error calculating revenue by quiz', { error: error.message });
    res.status(500).json({
      error: 'Failed to calculate revenue by quiz',
      message: error.message
    });
  }
};

/**
 * Get revenue by time period
 * POST /payment/revenue/by-period
 */
exports.getRevenueByPeriod = async (req, res) => {
  try {
    const { quizIds, period } = req.body;

    if (!quizIds || !Array.isArray(quizIds) || quizIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'quizIds array is required'
      });
    }

    if (!period || !['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({
        error: 'Invalid period',
        message: 'Period must be one of: daily, weekly, monthly'
      });
    }

    // Determine date grouping format based on period
    let dateFormat;
    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        dateFormat = '%Y-W%V'; // ISO week
        break;
      case 'monthly':
        dateFormat = '%Y-%m';
        break;
    }

    // Calculate revenue by period
    const result = await Payment.aggregate([
      {
        $match: {
          quizId: { $in: quizIds.map(id => require('mongoose').Types.ObjectId(id)) },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: '$createdAt'
            }
          },
          revenue: { $sum: '$amount' },
          paymentCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Format response
    const data = result.map(item => ({
      period: item._id,
      revenue: item.revenue,
      paymentCount: item.paymentCount
    }));

    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

    res.json({
      data,
      totalRevenue,
      currency: 'INR'
    });
  } catch (error) {
    logger.error('Error calculating revenue by period', { error: error.message });
    res.status(500).json({
      error: 'Failed to calculate revenue by period',
      message: error.message
    });
  }
};
