const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName:  { type: String, trim: true },
    avatarUrl:    { type: String, default: null },
    role:              { type: String, enum: ['member', 'admin'], default: 'member' },
    resetToken:        { type: String, default: null },
    resetTokenExpiry:  { type: Date,   default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
