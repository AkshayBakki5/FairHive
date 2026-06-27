const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema(
  {
    roomId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    email:      { type: String, required: true, lowercase: true, trim: true },
    name:       { type: String, trim: true },
    role:       { type: String, enum: ['member', 'admin'], default: 'member' },
    token:      { type: String, required: true, unique: true },
    status:     { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invite', inviteSchema);
