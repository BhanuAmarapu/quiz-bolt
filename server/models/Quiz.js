const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctOption: { type: Number, default: 0 },
    hashedCorrectAnswer: { type: String, required: true },
    timeLimit: { type: Number, default: 30 },
    mediaUrl: { type: String, default: null },
    questionType: { type: String, enum: ['multiple-choice', 'true-false'], default: 'multiple-choice' },
});

const QuizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roomCode: { type: String, unique: true, sparse: true }, // Sparse allows null/missing for subjects
    type: { type: String, enum: ['quiz', 'subject'], default: 'quiz' },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', default: null },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
    isPaid: { type: Boolean, default: false },
    price: { type: Number, default: 0, min: 0 },
    questions: [QuestionSchema],
}, { timestamps: true });

module.exports = mongoose.model('Quiz', QuizSchema);
