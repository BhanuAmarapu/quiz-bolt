const mongoose = require('mongoose');

const QuizSessionSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    sessionCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    status: { type: String, enum: ['ongoing', 'completed', 'aborted'], default: 'ongoing' },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    participantCount: { type: Number, default: 0 },
    topWinners: [
        {
            name: { type: String },
            score: { type: Number },
            time: { type: Number },
            rank: { type: Number },
        }
    ],
}, { timestamps: true });

QuizSessionSchema.index({ quizId: 1, createdAt: -1 });
// Note: sessionCode index is created by the unique:true on the field definition above

module.exports = mongoose.model('QuizSession', QuizSessionSchema);
