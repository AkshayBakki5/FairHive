const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true },
    code:      { type: String, required: true, unique: true, uppercase: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
