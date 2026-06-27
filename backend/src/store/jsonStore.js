const User            = require('../models/User');
const Room            = require('../models/Room');
const RoomMember      = require('../models/RoomMember');
const Expense         = require('../models/Expense');
const ExpenseSplit    = require('../models/ExpenseSplit');
const Chore           = require('../models/Chore');
const ChoreAssignment = require('../models/ChoreAssignment');
const Bill            = require('../models/Bill');
const Payment         = require('../models/Payment');
const Invite          = require('../models/Invite');
const Notification    = require('../models/Notification');

function toPlain(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject({ virtuals: false }) : doc;
  obj.id = obj._id.toString();
  return obj;
}
function toList(docs) { return docs.map(toPlain); }

// Users
async function getUsers() { return toList(await User.find()); }
async function getUserById(id) { try { return toPlain(await User.findById(id)); } catch { return null; } }
async function getUserByEmail(email) { return toPlain(await User.findOne({ email: (email||'').toLowerCase() })); }
async function addUser(data) { return toPlain(await User.create(data)); }
async function updateUser(id, u) { try { return toPlain(await User.findByIdAndUpdate(id, u, { new: true })); } catch { return null; } }

// Rooms
async function getRooms() { return toList(await Room.find()); }
async function getRoomById(id) { try { return toPlain(await Room.findById(id)); } catch { return null; } }
async function getRoomByCode(code) { return toPlain(await Room.findOne({ code: (code||'').toUpperCase() })); }
async function addRoom(data) { return toPlain(await Room.create(data)); }
async function updateRoom(id, u) { try { return toPlain(await Room.findByIdAndUpdate(id, u, { new: true })); } catch { return null; } }
async function deleteRoom(id) { try { await Room.findByIdAndDelete(id); return true; } catch { return false; } }

// RoomMembers
async function getRoomMembers(roomId) { return toList(await RoomMember.find({ roomId })); }
async function getRoomMember(roomId, userId) { try { return toPlain(await RoomMember.findOne({ roomId, userId })); } catch { return null; } }
async function addRoomMember(data) { return toPlain(await RoomMember.create(data)); }
async function updateRoomMember(id, u) { try { return toPlain(await RoomMember.findByIdAndUpdate(id, u, { new: true })); } catch { return null; } }
async function deleteRoomMember(id) { try { await RoomMember.findByIdAndDelete(id); return true; } catch { return false; } }
async function deleteRoomMemberByUserAndRoom(roomId, userId) { await RoomMember.deleteOne({ roomId, userId }); return true; }

// Expenses
async function getExpenses(roomId) { return toList(await Expense.find({ roomId }).sort({ createdAt: -1 })); }
async function getExpenseById(id) { try { return toPlain(await Expense.findById(id)); } catch { return null; } }
async function addExpense(data) { return toPlain(await Expense.create(data)); }
async function updateExpense(id, u) { try { return toPlain(await Expense.findByIdAndUpdate(id, u, { new: true })); } catch { return null; } }
async function deleteExpense(id) { try { await Expense.findByIdAndDelete(id); return true; } catch { return false; } }

// ExpenseSplits
async function getExpenseSplits(expenseId) { return toList(await ExpenseSplit.find({ expenseId })); }
async function getExpenseSplitByUser(expenseId, userId) { try { return toPlain(await ExpenseSplit.findOne({ expenseId, userId })); } catch { return null; } }
async function addExpenseSplit(data) { return toPlain(await ExpenseSplit.create(data)); }
async function updateExpenseSplit(id, u) { try { return toPlain(await ExpenseSplit.findByIdAndUpdate(id, u, { new: true })); } catch { return null; } }
async function deleteExpenseSplitsByExpense(expenseId) { await ExpenseSplit.deleteMany({ expenseId }); }

// Chores
async function getChores(roomId) { return toList(await Chore.find({ roomId })); }
async function getChoreById(id) { try { return toPlain(await Chore.findById(id)); } catch { return null; } }
async function addChore(data) { return toPlain(await Chore.create(data)); }
async function updateChore(id, u) { try { return toPlain(await Chore.findByIdAndUpdate(id, u, { new: true })); } catch { return null; } }
async function deleteChore(id) { try { await Chore.findByIdAndDelete(id); return true; } catch { return false; } }

// ChoreAssignments
async function getChoreAssignments(choreId) { return toList(await ChoreAssignment.find({ choreId }).sort({ dueDate: -1 })); }
async function addChoreAssignment(data) { return toPlain(await ChoreAssignment.create(data)); }
async function updateChoreAssignment(id, u) { try { return toPlain(await ChoreAssignment.findByIdAndUpdate(id, u, { new: true })); } catch { return null; } }
async function deleteChoreAssignmentsByChore(choreId) { await ChoreAssignment.deleteMany({ choreId }); }

// Bills
async function getBills(roomId) { return toList(await Bill.find({ roomId }).sort({ dueDate: 1 })); }
async function getBillById(id) { try { return toPlain(await Bill.findById(id)); } catch { return null; } }
async function addBill(data) { return toPlain(await Bill.create(data)); }
async function updateBill(id, u) { try { return toPlain(await Bill.findByIdAndUpdate(id, u, { new: true })); } catch { return null; } }
async function deleteBill(id) { try { await Bill.findByIdAndDelete(id); return true; } catch { return false; } }

// Payments
async function getPayments(roomId) { return toList(await Payment.find({ roomId }).sort({ createdAt: -1 })); }
async function getPaymentById(id) { try { return toPlain(await Payment.findById(id)); } catch { return null; } }
async function addPayment(data) { return toPlain(await Payment.create(data)); }
async function deletePayment(id) { try { await Payment.findByIdAndDelete(id); return true; } catch { return false; } }

// Invites
async function getInvites() { return toList(await Invite.find()); }
async function getInviteById(id) { try { return toPlain(await Invite.findById(id)); } catch { return null; } }
async function getInviteByToken(token) { return toPlain(await Invite.findOne({ token })); }
async function getRoomInvites(roomId) { return toList(await Invite.find({ roomId })); }
async function addInvite(data) { return toPlain(await Invite.create(data)); }
async function updateInvite(id, u) { try { return toPlain(await Invite.findByIdAndUpdate(id, u, { new: true })); } catch { return null; } }
async function markInviteAccepted(id) { return updateInvite(id, { status: 'accepted', acceptedAt: new Date() }); }

// Notifications
async function getUserNotifications(userId) { return toList(await Notification.find({ userId }).sort({ createdAt: -1 })); }
async function getNotificationById(id) { try { return toPlain(await Notification.findById(id)); } catch { return null; } }
async function addNotification(data) { return toPlain(await Notification.create(data)); }
async function updateNotification(id, u) { try { return toPlain(await Notification.findByIdAndUpdate(id, u, { new: true })); } catch { return null; } }
async function deleteNotification(id) { try { await Notification.findByIdAndDelete(id); return true; } catch { return false; } }
async function markAllNotificationsRead(userId) { await Notification.updateMany({ userId, is_read: false }, { is_read: true }); }

// Generic load (compat)
async function load(collection) {
  const map = {
    users: User, rooms: Room, roomMembers: RoomMember,
    expenses: Expense, expenseSplits: ExpenseSplit,
    chores: Chore, choreAssignments: ChoreAssignment,
    bills: Bill, payments: Payment, invites: Invite,
    notifications: Notification,
  };
  const M = map[collection];
  if (!M) return [];
  return toList(await M.find());
}

module.exports = {
  getUsers, getUserById, getUserByEmail, addUser, updateUser,
  getRooms, getRoomById, getRoomByCode, addRoom, updateRoom, deleteRoom,
  getRoomMembers, getRoomMember, addRoomMember, updateRoomMember, deleteRoomMember, deleteRoomMemberByUserAndRoom,
  getExpenses, getExpenseById, addExpense, updateExpense, deleteExpense,
  getExpenseSplits, getExpenseSplitByUser, addExpenseSplit, updateExpenseSplit, deleteExpenseSplitsByExpense,
  getChores, getChoreById, addChore, updateChore, deleteChore,
  getChoreAssignments, addChoreAssignment, updateChoreAssignment, deleteChoreAssignmentsByChore,
  getBills, getBillById, addBill, updateBill, deleteBill,
  getPayments, getPaymentById, addPayment, deletePayment,
  getInvites, getInviteById, getInviteByToken, getRoomInvites, addInvite, updateInvite, markInviteAccepted,
  getUserNotifications, getNotificationById, addNotification, updateNotification, deleteNotification, markAllNotificationsRead,
  load,
};
