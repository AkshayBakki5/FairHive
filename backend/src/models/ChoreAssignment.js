const mongoose = require('mongoose');

const choreAssignmentSchema = new mongoose.Schema(
  {
    choreId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Chore', required: true },
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
    dueDate:     { type: Date, required: true },
    completed:   { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChoreAssignment', choreAssignmentSchema);
