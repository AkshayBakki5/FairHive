const mongoose = require('mongoose');

const choreSchema = new mongoose.Schema(
  {
    roomId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    title:         { type: String, required: true, trim: true },
    description:   { type: String, trim: true, default: '' },
    category:      { type: String, default: 'other' },
    points:        { type: Number, default: 10 },
    frequency:     { type: String, enum: ['once', 'daily', 'weekly', 'monthly'], default: 'weekly' },
    priority:      { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    rotationOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Chore', choreSchema);
