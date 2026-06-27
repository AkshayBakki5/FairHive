const store = require('../store/jsonStore');

/** GET /api/rooms/:roomId/bills */
async function listByRoom(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid = req.user.id;
    const member = await store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    res.json(await store.getBills(roomId));
  } catch (e) { next(e); }
}

/** POST /api/rooms/:roomId/bills */
async function create(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid = req.user.id;
    const member = await store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const name   = (req.body.name || '').trim() || 'Bill';
    const amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount < 0) return res.status(400).json({ error: 'Valid amount required' });
    const dueDate     = req.body.dueDate ? new Date(req.body.dueDate) : new Date();
    const billImageUrl = req.body.billImageUrl || null;
    const ref = await store.addBill({ roomId, name, amount, dueDate, billImageUrl, paid: false, paidBy: null, paidAt: null });
    res.status(201).json({ id: ref.id, roomId, name, amount, dueDate: ref.dueDate, billImageUrl, paid: false });
  } catch (e) { next(e); }
}

/** PATCH /api/bills/:id */
async function update(req, res, next) {
  try {
    const billId = req.params.id;
    const uid    = req.user.id;
    const bill   = await store.getBillById(billId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    const member = await store.getRoomMember(bill.roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const updates = {};
    if (typeof req.body.paid === 'boolean') {
      updates.paid = req.body.paid;
      updates.paidBy  = req.body.paid ? (req.body.paidBy || uid) : null;
      updates.paidAt  = req.body.paid ? new Date() : null;
    }
    if (req.body.name     !== undefined) updates.name   = req.body.name;
    if (req.body.amount   !== undefined) updates.amount = parseFloat(req.body.amount);
    if (req.body.dueDate  !== undefined) updates.dueDate = new Date(req.body.dueDate);
    if (req.body.billImageUrl !== undefined) updates.billImageUrl = req.body.billImageUrl;
    res.json(await store.updateBill(billId, updates));
  } catch (e) { next(e); }
}

/** DELETE /api/bills/:id */
async function remove(req, res, next) {
  try {
    const billId = req.params.id;
    const uid    = req.user.id;
    const bill   = await store.getBillById(billId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    const member = await store.getRoomMember(bill.roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    await store.deleteBill(billId);
    res.status(204).end();
  } catch (e) { next(e); }
}

module.exports = { listByRoom, create, update, remove };
