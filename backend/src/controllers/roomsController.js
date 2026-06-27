const store = require('../store/jsonStore');

/** GET /api/rooms */
async function list(req, res, next) {
  try {
    const uid = req.user.id;
    const memberships = await store.getRoomMembers ? null : null; // unused
    const allMemberships = await store.load('roomMembers');
    const roomIds = [...new Set(allMemberships.filter(m => m.userId.toString() === uid).map(m => m.roomId.toString()))];
    const rooms = await store.getRooms();
    res.json(rooms.filter(r => roomIds.includes(r.id.toString())));
  } catch (e) { next(e); }
}

/** POST /api/rooms */
async function create(req, res, next) {
  try {
    const uid  = req.user.id;
    const name = (req.body.name || '').trim() || 'My Room';
    const code = generateCode();
    const ref  = await store.addRoom({ name, code, createdBy: uid });
    await store.addRoomMember({ roomId: ref.id, userId: uid, role: 'admin', joinedAt: new Date() });
    res.status(201).json({ id: ref.id, name, code });
  } catch (e) { next(e); }
}

/** POST /api/rooms/join */
async function joinByCode(req, res, next) {
  try {
    const uid  = req.user.id;
    const code = (req.body.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'Room code required' });
    const room = await store.getRoomByCode(code);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const existing = await store.getRoomMember(room.id, uid);
    if (existing) return res.status(400).json({ error: 'Already a member' });
    await store.addRoomMember({ roomId: room.id, userId: uid, role: 'member', joinedAt: new Date() });
    res.json({ id: room.id, name: room.name, code: room.code });
  } catch (e) { next(e); }
}

/** GET /api/rooms/:id */
async function getById(req, res, next) {
  try {
    const room = await store.getRoomById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const member = await store.getRoomMember(room.id, req.user.id);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    res.json(room);
  } catch (e) { next(e); }
}

/** PATCH /api/rooms/:id – rename room (admin only) */
async function updateRoom(req, res, next) {
  try {
    const roomId = req.params.id;
    const uid    = req.user.id;
    const room   = await store.getRoomById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const member = await store.getRoomMember(roomId, uid);
    if (!member || member.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const updates = {};
    if (req.body.name) updates.name = (req.body.name || '').trim();
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });
    const updated = await store.updateRoom(roomId, updates);
    res.json(updated);
  } catch (e) { next(e); }
}

/** DELETE /api/rooms/:id – delete room + all data (admin only) */
async function deleteRoom(req, res, next) {
  try {
    const roomId = req.params.id;
    const uid    = req.user.id;
    const room   = await store.getRoomById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const member = await store.getRoomMember(roomId, uid);
    if (!member || member.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    // Cascade delete expenses and their splits
    const expenses = await store.getExpenses(roomId);
    for (const e of expenses) {
      await store.deleteExpenseSplitsByExpense(e.id);
      await store.deleteExpense(e.id);
    }
    // Cascade delete chores and assignments
    const chores = await store.getChores(roomId);
    for (const c of chores) {
      await store.deleteChoreAssignmentsByChore(c.id);
      await store.deleteChore(c.id);
    }
    // Delete bills, members, room
    const bills = await store.getBills(roomId);
    for (const b of bills) await store.deleteBill(b.id);
    const members = await store.getRoomMembers(roomId);
    for (const m of members) await store.deleteRoomMember(m.id);
    await store.deleteRoom(roomId);
    res.status(204).end();
  } catch (e) { next(e); }
}

/** POST /api/rooms/:id/leave – leave room */
async function leaveRoom(req, res, next) {
  try {
    const roomId = req.params.id;
    const uid    = req.user.id;
    const member = await store.getRoomMember(roomId, uid);
    if (!member) return res.status(400).json({ error: 'Not a member' });

    // If last admin, block leave
    if (member.role === 'admin') {
      const members = await store.getRoomMembers(roomId);
      const admins  = members.filter(m => m.role === 'admin');
      if (admins.length === 1 && members.length > 1) {
        return res.status(400).json({ error: 'Assign another admin before leaving' });
      }
    }
    await store.deleteRoomMemberByUserAndRoom(roomId, uid);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

/** GET /api/rooms/:id/members */
async function getMembers(req, res, next) {
  try {
    const roomId = req.params.id;
    const member = await store.getRoomMember(roomId, req.user.id);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const members = await store.getRoomMembers(roomId);
    const list = await Promise.all(members.map(async m => {
      const u = await store.getUserById(m.userId);
      return { ...m, displayName: u ? (u.displayName || u.email) : m.userId, email: u ? u.email : null };
    }));
    res.json(list);
  } catch (e) { next(e); }
}

/** GET /api/rooms/:id/balances */
async function getBalances(req, res, next) {
  try {
    const roomId = req.params.id;
    const member = await store.getRoomMember(roomId, req.user.id);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const expenses       = await store.getExpenses(roomId);
    const currentMembers = await store.getRoomMembers(roomId);
    const currentMemberIds = new Set(currentMembers.map(m => m.userId.toString()));
    const result = {};
    for (const e of expenses) {
      const payerId = e.addedBy ? e.addedBy.toString() : null;
      if (payerId && currentMemberIds.has(payerId)) {
        result[payerId] = (result[payerId] || 0) + (e.amount || 0);
      }
      const splits = await store.getExpenseSplits(e.id);
      for (const s of splits) {
        const uid = s.userId ? s.userId.toString() : null;
        if (uid && currentMemberIds.has(uid)) {
          result[uid] = (result[uid] || 0) - (s.amount || 0);
        }
      }
    }
    // Factor in payments
    const payments = await store.getPayments(roomId);
    for (const p of payments) {
      const from = p.fromUser ? p.fromUser.toString() : null;
      const to   = p.toUser   ? p.toUser.toString()   : null;
      if (from && currentMemberIds.has(from)) result[from] = (result[from] || 0) - p.amount;
      if (to   && currentMemberIds.has(to))   result[to]   = (result[to]   || 0) + p.amount;
    }
    res.json(result);
  } catch (e) { next(e); }
}

/** GET /api/rooms/:id/analytics/expenses-over-time */
async function analyticsExpensesOverTime(req, res, next) {
  try {
    const roomId = req.params.id;
    const member = await store.getRoomMember(roomId, req.user.id);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const expenses = await store.getExpenses(roomId);
    const byDate = {};
    expenses.forEach(e => {
      const key = (e.createdAt ? new Date(e.createdAt).toISOString() : '').slice(0, 10);
      if (key) byDate[key] = (byDate[key] || 0) + (e.amount || 0);
    });
    const series = Object.entries(byDate).map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date));
    res.json(series);
  } catch (e) { next(e); }
}

/** POST /api/rooms/:roomId/members – add existing user (admin only) */
async function addMember(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid    = req.user.id;
    const { email, role = 'member' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    if (!['member', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const currentMember = await store.getRoomMember(roomId, uid);
    if (!currentMember || currentMember.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const user = await store.getUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found. Please send an invitation instead.' });
    const existing = await store.getRoomMember(roomId, user.id);
    if (existing) return res.status(400).json({ error: 'User is already a member' });
    const newMember = await store.addRoomMember({ roomId, userId: user.id, role, joinedAt: new Date() });
    res.status(201).json({ id: newMember.id, userId: newMember.userId, displayName: user.displayName || user.email, email: user.email, role: newMember.role });
  } catch (e) { next(e); }
}

/** DELETE /api/rooms/:roomId/members/:memberId – remove member (admin only) */
async function removeMember(req, res, next) {
  try {
    const { roomId, memberId } = req.params;
    const uid = req.user.id;
    const currentMember = await store.getRoomMember(roomId, uid);
    if (!currentMember || currentMember.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const allMembers = await store.getRoomMembers(roomId);
    const memberToRemove = allMembers.find(m => m.id.toString() === memberId);
    if (!memberToRemove) return res.status(404).json({ error: 'Member not found' });
    if (memberToRemove.userId.toString() === uid) return res.status(400).json({ error: 'Cannot remove yourself' });
    await store.deleteRoomMember(memberToRemove.id);
    res.json({ success: true });
  } catch (e) { next(e); }
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

module.exports = { list, create, joinByCode, getById, updateRoom, deleteRoom, leaveRoom, getMembers, getBalances, analyticsExpensesOverTime, addMember, removeMember };
