const store = require('../store/jsonStore');
const { sendInviteEmail } = require('../utils/email');

function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';
  let token = '';
  for (let i = 0; i < 32; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

/**
 * POST /api/rooms/:roomId/invites – create and send invite (admin only)
 * Body: { email, name?, role }
 */
async function createInvite(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid = req.user.id;
    const { email, name, role = 'member' } = req.body;

    if (!email) return res.status(400).json({ error: 'Email required' });
    if (!['member', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    // Check current user is admin
    const currentMember = store.getRoomMember(roomId, uid);
    if (!currentMember || currentMember.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get room info
    const room = store.getRoomById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // Check if user already exists
    const existingUser = store.getUserByEmail(email);
    if (existingUser) {
      // User exists - add them directly and still send email
      const existingMember = store.getRoomMember(roomId, existingUser.id);
      if (existingMember) {
        return res.status(400).json({ error: 'User is already a member' });
      }

      // Add as member
      store.addRoomMember({
        roomId,
        userId: existingUser.id,
        role,
        joinedAt: new Date(),
      });

      // Create invite record for tracking
      const invite = store.addInvite({
        roomId,
        email,
        role,
        token: generateToken(),
        status: 'accepted',
        createdAt: new Date(),
        acceptedAt: new Date(),
      });

      // Send email notification
      const inviter = store.getUserById(uid);
      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/index.html#invite=${invite.token}`;
      await sendInviteEmail({
        to: email,
        roomName: room.name,
        code: room.code,
        inviteLink,
        inviterName: inviter ? (inviter.displayName || inviter.email) : undefined,
      });

      return res.status(201).json({
        id: invite.id,
        email,
        role,
        status: 'accepted',
        message: 'User added and notification sent',
      });
    }

    // User doesn't exist - create pending invite
    const token = generateToken();
    const invite = store.addInvite({
      roomId,
      email,
      name,
      role,
      token,
      status: 'pending',
      createdAt: new Date(),
    });

    // Send invite email
    const inviter = store.getUserById(uid);
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/index.html#invite=${token}`;
    const emailResult = await sendInviteEmail({
      to: email,
      roomName: room.name,
      code: room.code,
      inviteLink,
      inviterName: inviter ? (inviter.displayName || inviter.email) : undefined,
    });

    if (!emailResult.sent) {
      console.warn('Failed to send invite email:', emailResult.error);
      // Still return success, invite is created
    }

    res.status(201).json({
      id: invite.id,
      email,
      role,
      status: 'pending',
      token: invite.token,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/invites/accept – accept invite by token
 * Body: { token }
 */
async function acceptInvite(req, res, next) {
  try {
    const { token } = req.body;
    const uid = req.user.id;

    if (!token) return res.status(400).json({ error: 'Token required' });

    // Find invite
    const invite = store.getInviteByToken(token);
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ error: 'Invite already used or expired' });
    }

    // Check if user is already a member
    const existingMember = store.getRoomMember(invite.roomId, uid);
    if (existingMember) {
      // Mark invite as accepted anyway
      store.markInviteAccepted(invite.id);
      const room = store.getRoomById(invite.roomId);
      return res.json({
        success: true,
        room: { id: room.id, name: room.name, code: room.code },
        message: 'Already a member',
      });
    }

    // Add user as member
    store.addRoomMember({
      roomId: invite.roomId,
      userId: uid,
      role: invite.role,
      joinedAt: new Date(),
    });

    // Mark invite as accepted
    store.markInviteAccepted(invite.id);

    // Return room info
    const room = store.getRoomById(invite.roomId);
    res.json({
      success: true,
      room: { id: room.id, name: room.name, code: room.code },
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  createInvite,
  acceptInvite,
};
