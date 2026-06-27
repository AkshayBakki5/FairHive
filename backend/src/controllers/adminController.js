const store = require('../store/jsonStore');

/** GET /api/admin/rooms */
async function listRooms(req, res, next) {
  try {
    const rooms = await store.getRooms();
    res.json(rooms.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
  } catch (e) { next(e); }
}

/** GET /api/admin/users */
async function listUsers(req, res, next) {
  try {
    const list = await store.getUsers();
    res.json(list.map(u => ({ id: u.id, email: u.email, displayName: u.displayName, role: u.role, createdAt: u.createdAt })));
  } catch (e) { next(e); }
}

/** PATCH /api/admin/rooms/:id/members/:userId/role */
async function updateMemberRole(req, res, next) {
  try {
    const { id: roomId, userId } = req.params;
    const { role } = req.body;
    if (role !== 'admin' && role !== 'member') return res.status(400).json({ error: 'role must be admin or member' });
    const member = await store.getRoomMember(roomId, userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    await store.updateRoomMember(member.id, { role });
    res.json({ ok: true, role });
  } catch (e) { next(e); }
}

module.exports = { listRooms, listUsers, updateMemberRole };
