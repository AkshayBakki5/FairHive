const store = require('../store/jsonStore');

/**
 * GET /api/rooms/:roomId/bills
 */
async function listByRoom(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid = req.user.id;
    const member = store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const list = store.getBills(roomId).sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));
    res.json(list);
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/rooms/:roomId/bills
 */
async function create(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid = req.user.id;
    const member = store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const name = (req.body.name || '').trim() || 'Bill';
    const amount = parseFloat(req.body.amount);
    const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : new Date();
    const billImageUrl = req.body.billImageUrl || null;
    if (isNaN(amount) || amount < 0) return res.status(400).json({ error: 'Valid amount required' });
    const ref = store.addBill({
      roomId,
      name,
      amount,
      dueDate,
      billImageUrl,
      paid: false,
      paidBy: null,
      paidAt: null,
      createdAt: new Date(),
    });
    res.status(201).json({
      id: ref.id,
      roomId,
      name,
      amount,
      dueDate: ref.dueDate,
      billImageUrl,
      paid: false,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/bills/:id
 */
async function update(req, res, next) {
  try {
    const billId = req.params.id;
    const uid = req.user.id;
    const bill = store.getBillById(billId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    const roomId = bill.roomId;
    const member = store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const updates = {};
    if (typeof req.body.paid === 'boolean') {
      updates.paid = req.body.paid;
      if (req.body.paid) {
        updates.paidBy = req.body.paidBy || uid;
        updates.paidAt = new Date();
      } else {
        updates.paidBy = null;
        updates.paidAt = null;
      }
    }
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.amount !== undefined) updates.amount = parseFloat(req.body.amount);
    if (req.body.dueDate !== undefined) updates.dueDate = new Date(req.body.dueDate);
    if (req.body.billImageUrl !== undefined) updates.billImageUrl = req.body.billImageUrl;
    const updated = store.updateBill(billId, updates);
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

module.exports = { listByRoom, create, update };
