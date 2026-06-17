const store = require('../store/jsonStore');

/**
 * GET /api/admin/rooms – list all rooms (admin only)
 */
async function listRooms(req, res, next) {
  try {
    const list = store.getRooms().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json(list);
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/admin/users – list all users (admin only)
 */
async function listUsers(req, res, next) {
  try {
    const list = store.getUsers().map(u => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      createdAt: u.createdAt,
    }));
    res.json(list);
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/admin/rooms/:id/members/:userId/role
 */
async function updateMemberRole(req, res, next) {
  try {
    const { id: roomId, userId } = req.params;
    const role = req.body.role;
    if (role !== 'admin' && role !== 'member') return res.status(400).json({ error: 'role must be admin or member' });
    const member = store.getRoomMember(roomId, userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    store.updateRoomMember(member.id, { role });
    res.json({ ok: true, role });
  } catch (e) {
    next(e);
  }
}

module.exports = { listRooms, listUsers, updateMemberRole };
