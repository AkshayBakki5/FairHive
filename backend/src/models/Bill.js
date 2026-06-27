const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
  {
    roomId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    name:        { type: String, required: true, trim: true },
    amount:      { type: Number, required: true, min: 0 },
    dueDate:     { type: Date, required: true },
    billImageUrl:{ type: String, default: null },
    paid:        { type: Boolean, default: false },
    paidBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    paidAt:      { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bill', billSchema);
