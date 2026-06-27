const mongoose = require('mongoose');

const expenseSplitSchema = new mongoose.Schema(
  {
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', required: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    amount:    { type: Number, required: true, min: 0 },
    paid:      { type: Boolean, default: false },
    paidAt:    { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExpenseSplit', expenseSplitSchema);
