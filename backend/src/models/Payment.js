const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    roomId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount:   { type: Number, required: true, min: 0.01 },
    note:     { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
