const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'organizer', 'participant'], default: 'participant' },
  refreshToken: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
