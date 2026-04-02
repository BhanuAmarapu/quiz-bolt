const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: [true, 'Quiz ID is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
    trim: true,
    enum: ['INR']
  },
  razorpayOrderId: {
    type: String,
    required: [true, 'Razorpay order ID is required'],
    unique: true,
    trim: true
  },
  razorpayPaymentId: {
    type: String,
    trim: true,
    default: null
  },
  razorpaySignature: {
    type: String,
    trim: true,
    default: null,
    select: false
  },
  status: {
    type: String,
    enum: ['created', 'completed', 'failed'],
    default: 'created'
  }
}, { timestamps: true });

paymentSchema.path('quizId').index(true);
paymentSchema.path('userId').index(true);

paymentSchema.pre('validate', function normalizeAmount(next) {
  if (typeof this.amount === 'number') {
    this.amount = Number(this.amount.toFixed(2));
  }
  next();
});

// Indexes
paymentSchema.index({ userId: 1, quizId: 1 });
paymentSchema.index({ razorpayOrderId: 1 }, { unique: true });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
