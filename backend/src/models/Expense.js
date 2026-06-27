const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    roomId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    addedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount:      { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, default: 'Expense' },
    category:    { type: String, default: 'other' },
    splitType:   { type: String, enum: ['equal', 'custom'], default: 'equal' },
    billImageUrl:{ type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
