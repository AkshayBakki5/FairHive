const store = require('../store/jsonStore');

/**
 * GET /api/rooms/:roomId/payments
 * List all debt-settlement payments in the room.
 */
async function listByRoom(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid    = req.user.id;
    const member = await store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const payments = await store.getPayments(roomId);
    const members  = await store.getRoomMembers(roomId);
    const users    = await store.getUsers();
    const nameOf   = (userId) => {
      const id = userId ? userId.toString() : '';
      const u  = users.find(u => u.id.toString() === id);
      return u ? (u.displayName || u.email) : id;
    };

    const list = payments.map(p => ({
      ...p,
      fromUserName: nameOf(p.fromUser),
      toUserName:   nameOf(p.toUser),
    }));
    res.json(list);
  } catch (e) { next(e); }
}

/**
 * POST /api/rooms/:roomId/payments
 * Record a debt-settlement payment from one member to another.
 * Body: { toUser, amount, note? }
 */
async function create(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid    = req.user.id;
    const member = await store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const { toUser, amount, note } = req.body;
    if (!toUser) return res.status(400).json({ error: 'toUser required' });

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ error: 'Valid amount required' });
    if (toUser.toString() === uid.toString()) return res.status(400).json({ error: 'Cannot pay yourself' });

    const toMember = await store.getRoomMember(roomId, toUser);
    if (!toMember) return res.status(404).json({ error: 'Recipient is not a member of this room' });

    const payment = await store.addPayment({
      roomId,
      fromUser: uid,
      toUser,
      amount: parsedAmount,
      note: (note || '').trim(),
    });

    // Notify recipient
    try {
      const room   = await store.getRoomById(roomId);
      const payer  = await store.getUserById(uid);
      await store.addNotification({
        userId: toUser,
        title: 'Payment received',
        message: `${payer ? (payer.displayName || payer.email) : 'Someone'} paid you ₹${parsedAmount.toFixed(2)} in ${room ? room.name : 'your room'}.`,
        type: 'payment',
      });
    } catch (_) {}

    res.status(201).json(payment);
  } catch (e) { next(e); }
}

/**
 * DELETE /api/payments/:id
 * Remove a payment (only the payer or an admin may delete).
 */
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const uid    = req.user.id;
    const payment = await store.getPaymentById(id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const member = await store.getRoomMember(payment.roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const isOwner = payment.fromUser.toString() === uid;
    const isAdmin = member.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Only the payer or an admin can delete a payment' });

    await store.deletePayment(id);
    res.status(204).end();
  } catch (e) { next(e); }
}

module.exports = { listByRoom, create, remove };
