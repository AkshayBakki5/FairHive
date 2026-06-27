const store = require('../store/jsonStore');
const { sendInviteEmail } = require('../utils/email');

function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 32; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

/** POST /api/rooms/:roomId/invites */
async function createInvite(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid    = req.user.id;
    const { email, name, role = 'member' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    if (!['member', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const currentMember = await store.getRoomMember(roomId, uid);
    if (!currentMember || currentMember.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const room = await store.getRoomById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const existingUser = await store.getUserByEmail(email);
    if (existingUser) {
      const existingMember = await store.getRoomMember(roomId, existingUser.id);
      if (existingMember) return res.status(400).json({ error: 'User is already a member' });
      await store.addRoomMember({ roomId, userId: existingUser.id, role, joinedAt: new Date() });
      const invite = await store.addInvite({ roomId, email, role, token: generateToken(), status: 'accepted', acceptedAt: new Date() });
      const inviter = await store.getUserById(uid);
      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/index.html#invite=${invite.token}`;
      await sendInviteEmail({ to: email, roomName: room.name, code: room.code, inviteLink, inviterName: inviter ? (inviter.displayName || inviter.email) : undefined }).catch(() => {});
      return res.status(201).json({ id: invite.id, email, role, status: 'accepted', message: 'User added and notification sent' });
    }

    const token  = generateToken();
    const invite = await store.addInvite({ roomId, email, name, role, token, status: 'pending' });
    const inviter = await store.getUserById(uid);
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/index.html#invite=${token}`;
    await sendInviteEmail({ to: email, roomName: room.name, code: room.code, inviteLink, inviterName: inviter ? (inviter.displayName || inviter.email) : undefined }).catch(err => {
      console.warn('Failed to send invite email:', err.message);
    });
    res.status(201).json({ id: invite.id, email, role, status: 'pending', token: invite.token });
  } catch (e) { next(e); }
}

/** POST /api/invites/accept */
async function acceptInvite(req, res, next) {
  try {
    const { token } = req.body;
    const uid = req.user.id;
    if (!token) return res.status(400).json({ error: 'Token required' });
    const invite = await store.getInviteByToken(token);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.status !== 'pending') return res.status(400).json({ error: 'Invite already used or expired' });
    const existingMember = await store.getRoomMember(invite.roomId, uid);
    if (existingMember) {
      await store.markInviteAccepted(invite.id);
      const room = await store.getRoomById(invite.roomId);
      return res.json({ success: true, room: { id: room.id, name: room.name, code: room.code }, message: 'Already a member' });
    }
    await store.addRoomMember({ roomId: invite.roomId, userId: uid, role: invite.role, joinedAt: new Date() });
    await store.markInviteAccepted(invite.id);
    const room = await store.getRoomById(invite.roomId);
    res.json({ success: true, room: { id: room.id, name: room.name, code: room.code } });
  } catch (e) { next(e); }
}

module.exports = { createInvite, acceptInvite };
