const store = require('../store/jsonStore');

/** GET /api/rooms/:roomId/expenses */
async function listByRoom(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid = req.user.id;
    const member = await store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const expenses = await store.getExpenses(roomId);
    const list = await Promise.all(expenses.map(async e => {
      const splits = await store.getExpenseSplits(e.id);
      return { ...e, splits };
    }));
    res.json(list);
  } catch (e) { next(e); }
}

/** POST /api/rooms/:roomId/expenses */
async function create(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid = req.user.id;
    const member = await store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const members = await store.getRoomMembers(roomId);
    const memberIds = members.map(m => m.userId.toString());
    if (memberIds.length === 0) return res.status(400).json({ error: 'No members in room' });

    const amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });

    const description  = (req.body.description || '').trim() || 'Expense';
    const category     = req.body.category || 'other';
    const splitType    = req.body.splitType || 'equal';
    const billImageUrl = req.body.billImageUrl || null;
    const splitBetween = req.body.splitBetween || memberIds;
    const validSplitMembers = splitBetween.filter(id => memberIds.includes(id.toString()));
    if (validSplitMembers.length === 0) return res.status(400).json({ error: 'At least one valid member required for split' });

    let splits;
    if (splitType === 'custom' && req.body.customSplits && typeof req.body.customSplits === 'object') {
      splits = validSplitMembers.map(userId => ({ userId, amount: parseFloat(req.body.customSplits[userId]) || 0 }));
      const sum = splits.reduce((a, s) => a + s.amount, 0);
      if (Math.abs(sum - amount) > 0.01) return res.status(400).json({ error: 'Custom splits must sum to amount' });
    } else {
      const perPerson = Math.round((amount / validSplitMembers.length) * 100) / 100;
      splits = validSplitMembers.map(userId => ({ userId, amount: perPerson }));
    }

    const paidBy    = req.body.paidBy && memberIds.includes(req.body.paidBy.toString()) ? req.body.paidBy : uid;
    const createdAt = req.body.createdAt ? new Date(req.body.createdAt) : new Date();

    const ref = await store.addExpense({ roomId, addedBy: paidBy, amount, description, category, splitType, billImageUrl, createdAt });
    for (const s of splits) {
      await store.addExpenseSplit({ expenseId: ref.id, userId: s.userId, amount: s.amount, paid: false, paidAt: null });
    }

    try {
      const room = await store.getRoomById(roomId);
      for (const s of splits) {
        if (s.userId.toString() === paidBy.toString()) continue;
        await store.addNotification({
          userId: s.userId,
          title: 'New expense added',
          message: `${room ? room.name : 'Room'}: ${description} – ₹${amount.toFixed(2)} split with you.`,
          type: 'expense',
        });
      }
    } catch (_) {}

    res.status(201).json({ id: ref.id, roomId, addedBy: paidBy, amount, description, category, splitType, billImageUrl, createdAt, splits });
  } catch (e) { next(e); }
}

/** PATCH /api/expenses/:id – edit amount, description, category */
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const uid = req.user.id;
    const expense = await store.getExpenseById(id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    const member = await store.getRoomMember(expense.roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const updates = {};
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.category    !== undefined) updates.category    = req.body.category;
    if (req.body.billImageUrl !== undefined) updates.billImageUrl = req.body.billImageUrl;
    if (req.body.amount !== undefined) {
      const amount = parseFloat(req.body.amount);
      if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });
      updates.amount = amount;
    }

    const updated = await store.updateExpense(id, updates);
    const splits  = await store.getExpenseSplits(id);
    res.json({ ...updated, splits });
  } catch (e) { next(e); }
}

/** DELETE /api/expenses/:id */
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const uid = req.user.id;
    const expense = await store.getExpenseById(id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    const member = await store.getRoomMember(expense.roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    await store.deleteExpenseSplitsByExpense(id);
    await store.deleteExpense(id);
    res.status(204).end();
  } catch (e) { next(e); }
}

/** PATCH /api/expenses/:id/splits/:userId/paid */
async function markSplitPaid(req, res, next) {
  try {
    const { id, userId } = req.params;
    const uid = req.user.id;
    const expense = await store.getExpenseById(id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    const member = await store.getRoomMember(expense.roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const split = await store.getExpenseSplitByUser(id, userId);
    if (!split) return res.status(404).json({ error: 'Split not found' });
    await store.updateExpenseSplit(split.id, { paid: true, paidAt: new Date() });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

module.exports = { listByRoom, create, update, remove, markSplitPaid };
