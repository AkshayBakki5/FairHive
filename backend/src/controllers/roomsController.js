const store = require('../store/jsonStore');

/**
 * GET /api/rooms – list rooms for current user
 */
async function list(req, res, next) {
  try {
    const uid = req.user.id;
    const allMembers = store.load('roomMembers');
    const roomIds = [...new Set(allMembers.filter(m => m.userId === uid).map(m => m.roomId))];
    const list = store.getRooms().filter(r => roomIds.includes(r.id));
    res.json(list);
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/rooms – create room and add creator as admin
 * Body: { name }
 */
async function create(req, res, next) {
  try {
    const uid = req.user.id;
    const name = (req.body.name || '').trim() || 'My Room';
    const code = generateCode();
    const ref = store.addRoom({ name, code, createdBy: uid, createdAt: new Date() });
    store.addRoomMember({ roomId: ref.id, userId: uid, role: 'admin', joinedAt: new Date() });
    res.status(201).json({ id: ref.id, name, code });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/rooms/join – join room by code
 * Body: { code }
 */
async function joinByCode(req, res, next) {
  try {
    const uid = req.user.id;
    const code = (req.body.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'Room code required' });
    const room = store.getRoomByCode(code);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const existing = store.getRoomMember(room.id, uid);
    if (existing) return res.status(400).json({ error: 'Already a member' });
    store.addRoomMember({ roomId: room.id, userId: uid, role: 'member', joinedAt: new Date() });
    res.json({ id: room.id, name: room.name, code: room.code });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/rooms/:id
 */
async function getById(req, res, next) {
  try {
    const room = store.getRoomById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const uid = req.user.id;
    const member = store.getRoomMember(room.id, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    res.json(room);
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/rooms/:id/members – with displayName and email from Users
 */
async function getMembers(req, res, next) {
  try {
    const roomId = req.params.id;
    const uid = req.user.id;
    const member = store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const members = store.getRoomMembers(roomId);
    const list = members.map(m => {
      const u = store.getUserById(m.userId);
      return {
        ...m,
        displayName: u ? (u.displayName || u.email) : m.userId,
        email: u ? u.email : null,
      };
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/rooms/:id/balances
 * Balance = (total amount this user paid for expenses) - (total of this user's shares).
 * So the payer gets back money (positive), others owe (negative).
 * Only includes balances for current room members.
 */
async function getBalances(req, res, next) {
  try {
    const roomId = req.params.id;
    const uid = req.user.id;
    const member = store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const expenses = store.getExpenses(roomId);
    const currentMembers = store.getRoomMembers(roomId);
    const currentMemberIds = new Set(currentMembers.map(m => m.userId));
    const result = {};
    for (const e of expenses) {
      const payerId = e.addedBy;
      const splits = store.getExpenseSplits(e.id);
      const amount = e.amount || 0;
      // Only include payers who are current members
      if (payerId && currentMemberIds.has(payerId)) {
        if (!result[payerId]) result[payerId] = 0;
        result[payerId] += amount;
      }
      for (const s of splits) {
        const userId = s.userId;
        // Only include users who are current members
        if (currentMemberIds.has(userId)) {
          if (!result[userId]) result[userId] = 0;
          result[userId] -= s.amount || 0;
        }
      }
    }
    res.json(result);
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/rooms/:id/analytics/expenses-over-time
 */
async function analyticsExpensesOverTime(req, res, next) {
  try {
    const roomId = req.params.id;
    const uid = req.user.id;
    const member = store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const expenses = store.getExpenses(roomId);
    const byDate = {};
    expenses.forEach(e => {
      const key = (e.createdAt ? new Date(e.createdAt).toISOString() : '').slice(0, 10);
      if (key) byDate[key] = (byDate[key] || 0) + (e.amount || 0);
    });
    const series = Object.entries(byDate)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
    res.json(series);
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/rooms/:roomId/members – add existing user as member (admin only)
 * Body: { email, role }
 */
async function addMember(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid = req.user.id;
    const { email, role = 'member' } = req.body;

    if (!email) return res.status(400).json({ error: 'Email required' });
    if (!['member', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    // Check current user is admin
    const currentMember = store.getRoomMember(roomId, uid);
    if (!currentMember || currentMember.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Find user by email
    const user = store.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please send an invitation instead.' });
    }

    // Check if already a member
    const existing = store.getRoomMember(roomId, user.id);
    if (existing) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // Add as member
    const newMember = store.addRoomMember({
      roomId,
      userId: user.id,
      role,
      joinedAt: new Date(),
    });

    res.status(201).json({
      id: newMember.id,
      userId: newMember.userId,
      displayName: user.displayName || user.email,
      email: user.email,
      role: newMember.role,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * DELETE /api/rooms/:roomId/members/:memberId – remove member (admin only, cannot delete self)
 */
async function removeMember(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const memberId = req.params.memberId;
    const uid = req.user.id;

    // Check current user is admin
    const currentMember = store.getRoomMember(roomId, uid);
    if (!currentMember || currentMember.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Find member to remove
    const allMembers = store.load('roomMembers');
    const memberToRemove = allMembers.find(m => m.id === memberId && m.roomId === roomId);
    if (!memberToRemove) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Cannot remove self
    if (memberToRemove.userId === uid) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    // Remove member
    const updated = allMembers.filter(m => m.id !== memberId);
    store.save('roomMembers', updated);

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';
  let token = '';
  for (let i = 0; i < 32; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

module.exports = {
  list,
  create,
  joinByCode,
  getById,
  getMembers,
  getBalances,
  analyticsExpensesOverTime,
  addMember,
  removeMember,
  generateToken,
};
