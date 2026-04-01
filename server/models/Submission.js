const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    roomCode: { type: String, required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedOption: { type: String, required: true },
    timeTaken: { type: Number, required: true },
    score: { type: Number, default: 0 },
}, { timestamps: true });

// Index for quick leaderboard retrieval
SubmissionSchema.index({ quizId: 1, userId: 1 });

module.exports = mongoose.model('Submission', SubmissionSchema);
