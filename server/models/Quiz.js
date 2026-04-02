const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 500 },
    options: {
        type: [{ type: String, required: true, trim: true, maxlength: 250 }],
        validate: {
            validator: (value) => Array.isArray(value) && value.length >= 2,
            message: 'Question must have at least 2 options',
        },
    },
    correctOption: { type: Number, default: 0, min: 0 },
    hashedCorrectAnswer: { type: String, required: true },
    timeLimit: { type: Number, default: 30, min: 5, max: 300 },
    mediaUrl: { type: String, default: null, trim: true },
    questionType: { type: String, enum: ['multiple-choice', 'true-false'], default: 'multiple-choice' },
    shuffleOptions: { type: Boolean, default: false },
}, { _id: true });

QuestionSchema.path('correctOption').validate(function validateCorrectOption(index) {
    if (!Array.isArray(this.options) || this.options.length === 0) return false;
    return Number.isInteger(index) && index >= 0 && index < this.options.length;
}, 'correctOption must point to a valid option index');

const QuizSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 150 },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roomCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    type: { type: String, enum: ['quiz', 'subject'], default: 'quiz' },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', default: null },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
    isPaid: { type: Boolean, default: false },
    price: { type: Number, default: 0, min: 0 },
    shuffleQuestions: { type: Boolean, default: false },
    interQuestionDelay: { type: Number, default: 5, min: 0, max: 30 }, // seconds between questions
    questions: [QuestionSchema],
    // Scheduling
    scheduledAt: { type: Date, default: null },
    // Participants who registered / joined the scheduled session
    joinedParticipants: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            name: { type: String, required: true },
            joinedAt: { type: Date, default: Date.now },
        }
    ],
}, { timestamps: true });


QuizSchema.index({ organizerId: 1, createdAt: -1 });
QuizSchema.index({ parentId: 1, createdAt: -1 });
QuizSchema.index({ status: 1, updatedAt: -1 });

QuizSchema.pre('validate', function normalizePricing() {
    if (!this.isPaid) {
        this.price = 0;
    }
});

module.exports = mongoose.model('Quiz', QuizSchema);
