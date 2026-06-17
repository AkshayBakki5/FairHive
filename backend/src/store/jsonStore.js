/**
 * JSON-based file storage for FairHive.
 * All data is stored in backend/data/*.json. Dates are serialized as ISO strings.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const COLLECTIONS = [
  'users', 'rooms', 'roomMembers', 'expenses', 'expenseSplits',
  'chores', 'choreAssignments', 'bills', 'payments', 'invites',
  'notifications'
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getPath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function load(collection) {
  ensureDataDir();
  const filePath = getPath(collection);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function save(collection, data) {
  ensureDataDir();
  fs.writeFileSync(getPath(collection), JSON.stringify(data, null, 2), 'utf8');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/** Serialize object: convert Date to ISO string for JSON storage */
function serialize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v instanceof Date) out[k] = v.toISOString();
    else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = serialize(v);
    else out[k] = v;
  }
  return out;
}

// --- Users ---
function getUsers() { return load('users'); }
function getUserById(id) { return load('users').find(u => u.id === id) || null; }
function getUserByEmail(email) { return load('users').find(u => u.email === (email || '').toLowerCase()) || null; }
function addUser(data) {
  const list = load('users');
  const id = generateId();
  const record = { id, ...serialize(data) };
  list.push(record);
  save('users', list);
  return { id, ...record };
}
function updateUser(id, updates) {
  const list = load('users');
  const i = list.findIndex(u => u.id === id);
  if (i === -1) return null;
  list[i] = { ...list[i], ...serialize(updates) };
  save('users', list);
  return list[i];
}

// --- Rooms ---
function getRooms() { return load('rooms'); }
function getRoomById(id) { return load('rooms').find(r => r.id === id) || null; }
function getRoomByCode(code) { return load('rooms').find(r => (r.code || '').toUpperCase() === (code || '').toUpperCase()) || null; }
function addRoom(data) {
  const list = load('rooms');
  const id = generateId();
  const record = { id, ...serialize(data) };
  list.push(record);
  save('rooms', list);
  return { id, ...record };
}

// --- RoomMembers ---
function getRoomMembers(roomId) { return load('roomMembers').filter(m => m.roomId === roomId); }
function getRoomMember(roomId, userId) { return load('roomMembers').find(m => m.roomId === roomId && m.userId === userId) || null; }
function addRoomMember(data) {
  const list = load('roomMembers');
  const id = generateId();
  const record = { id, ...serialize(data) };
  list.push(record);
  save('roomMembers', list);
  return { id, ...record };
}
function updateRoomMember(id, updates) {
  const list = load('roomMembers');
  const i = list.findIndex(m => m.id === id);
  if (i === -1) return null;
  list[i] = { ...list[i], ...serialize(updates) };
  save('roomMembers', list);
  return list[i];
}

// --- Expenses ---
function getExpenses(roomId) { return load('expenses').filter(e => e.roomId === roomId); }
function getExpenseById(id) { return load('expenses').find(e => e.id === id) || null; }
function addExpense(data) {
  const list = load('expenses');
  const id = generateId();
  const record = { id, ...serialize(data) };
  list.push(record);
  save('expenses', list);
  return { id, ...record };
}

// --- ExpenseSplits ---
function getExpenseSplits(expenseId) { return load('expenseSplits').filter(s => s.expenseId === expenseId); }
function getExpenseSplitByUser(expenseId, userId) { return load('expenseSplits').find(s => s.expenseId === expenseId && s.userId === userId) || null; }
function addExpenseSplit(data) {
  const list = load('expenseSplits');
  const id = generateId();
  const record = { id, ...serialize(data) };
  list.push(record);
  save('expenseSplits', list);
  return { id, ...record };
}
function updateExpenseSplit(id, updates) {
  const list = load('expenseSplits');
  const i = list.findIndex(s => s.id === id);
  if (i === -1) return null;
  list[i] = { ...list[i], ...serialize(updates) };
  save('expenseSplits', list);
  return list[i];
}

// --- Chores ---
function getChores(roomId) { return load('chores').filter(c => c.roomId === roomId); }
function getChoreById(id) { return load('chores').find(c => c.id === id) || null; }
function addChore(data) {
  const list = load('chores');
  const id = generateId();
  const record = { id, ...serialize(data) };
  list.push(record);
  save('chores', list);
  return { id, ...record };
}

// --- ChoreAssignments ---
function getChoreAssignments(choreId) {
  return load('choreAssignments')
    .filter(a => a.choreId === choreId)
    .sort((a, b) => (new Date(b.dueDate) || 0) - (new Date(a.dueDate) || 0));
}
function addChoreAssignment(data) {
  const list = load('choreAssignments');
  const id = generateId();
  const record = { id, ...serialize(data) };
  list.push(record);
  save('choreAssignments', list);
  return { id, ...record };
}
function updateChoreAssignment(id, updates) {
  const list = load('choreAssignments');
  const i = list.findIndex(a => a.id === id);
  if (i === -1) return null;
  list[i] = { ...list[i], ...serialize(updates) };
  save('choreAssignments', list);
  return list[i];
}

// --- Bills ---
function getBills(roomId) { return load('bills').filter(b => b.roomId === roomId); }
function getBillById(id) { return load('bills').find(b => b.id === id) || null; }
function addBill(data) {
  const list = load('bills');
  const id = generateId();
  const record = { id, ...serialize(data) };
  list.push(record);
  save('bills', list);
  return { id, ...record };
}
function updateBill(id, updates) {
  const list = load('bills');
  const i = list.findIndex(b => b.id === id);
  if (i === -1) return null;
  list[i] = { ...list[i], ...serialize(updates) };
  save('bills', list);
  return list[i];
}

// --- Invites ---
function getInvites() { return load('invites'); }
function getInviteById(id) { return load('invites').find(i => i.id === id) || null; }
function getInviteByToken(token) { return load('invites').find(i => i.token === token) || null; }
function getRoomInvites(roomId) { return load('invites').filter(i => i.roomId === roomId); }
function addInvite(data) {
  const list = load('invites');
  const id = generateId();
  const record = { id, status: 'pending', ...serialize(data) };
  list.push(record);
  save('invites', list);
  return { id, ...record };
}
function updateInvite(id, updates) {
  const list = load('invites');
  const i = list.findIndex(i => i.id === id);
  if (i === -1) return null;
  list[i] = { ...list[i], ...serialize(updates) };
  save('invites', list);
  return list[i];
}
function markInviteAccepted(id) {
  return updateInvite(id, { status: 'accepted', acceptedAt: new Date() });
}

// --- Notifications ---
function getUserNotifications(userId) {
  return load('notifications')
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function getNotificationById(id) {
  return load('notifications').find(n => n.id === id) || null;
}

function addNotification(data) {
  const list = load('notifications');
  const id = generateId();
  const record = {
    id,
    is_read: false,
    createdAt: new Date(),
    ...serialize(data),
  };
  list.push(record);
  save('notifications', list);
  return { id, ...record };
}

function updateNotification(id, updates) {
  const list = load('notifications');
  const i = list.findIndex(n => n.id === id);
  if (i === -1) return null;
  list[i] = { ...list[i], ...serialize(updates) };
  save('notifications', list);
  return list[i];
}

function deleteNotification(id) {
  const list = load('notifications');
  const i = list.findIndex(n => n.id === id);
  if (i === -1) return false;
  list.splice(i, 1);
  save('notifications', list);
  return true;
}

module.exports = {
  getUsers,
  getUserById,
  getUserByEmail,
  addUser,
  updateUser,
  getRooms,
  getRoomById,
  getRoomByCode,
  addRoom,
  getRoomMembers,
  getRoomMember,
  addRoomMember,
  updateRoomMember,
  getExpenses,
  getExpenseById,
  addExpense,
  getExpenseSplits,
  getExpenseSplitByUser,
  addExpenseSplit,
  updateExpenseSplit,
  getChores,
  getChoreById,
  addChore,
  getChoreAssignments,
  addChoreAssignment,
  updateChoreAssignment,
  getBills,
  getBillById,
  addBill,
  updateBill,
  getInvites,
  getInviteById,
  getInviteByToken,
  getRoomInvites,
  addInvite,
  updateInvite,
  markInviteAccepted,
  getUserNotifications,
  getNotificationById,
  addNotification,
  updateNotification,
  deleteNotification,
  load,
  save,
  generateId,
};
