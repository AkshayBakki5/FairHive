const store = require('../store/jsonStore');

/**
 * GET /api/rooms/:roomId/expenses – list expenses with splits
 */
async function listByRoom(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid = req.user.id;
    const member = store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const expenses = store.getExpenses(roomId).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const list = expenses.map(e => {
      const splits = store.getExpenseSplits(e.id);
      return { ...e, splits };
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/rooms/:roomId/expenses – create expense and auto-split
 */
async function create(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid = req.user.id;
    const member = store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const members = store.getRoomMembers(roomId);
    const memberIds = members.map(m => m.userId);
    if (memberIds.length === 0) return res.status(400).json({ error: 'No members in room' });
    const amount = parseFloat(req.body.amount);
    const description = (req.body.description || '').trim() || 'Expense';
    const category = req.body.category || 'other';
    const splitType = req.body.splitType || 'equal';
    const billImageUrl = req.body.billImageUrl || null;
    const splitBetween = req.body.splitBetween || memberIds; // Array of user IDs to split between
    if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });
    
    // Validate splitBetween members are all room members
    const validSplitMembers = splitBetween.filter(id => memberIds.includes(id));
    if (validSplitMembers.length === 0) return res.status(400).json({ error: 'At least one valid member required for split' });
    
    let splits;
    if (splitType === 'custom' && req.body.customSplits && typeof req.body.customSplits === 'object') {
      const custom = req.body.customSplits;
      splits = validSplitMembers.map(userId => ({ userId, amount: parseFloat(custom[userId]) || 0 }));
      const sum = splits.reduce((a, s) => a + s.amount, 0);
      if (Math.abs(sum - amount) > 0.01) return res.status(400).json({ error: 'Custom splits must sum to amount' });
    } else {
      const perPerson = Math.round((amount / validSplitMembers.length) * 100) / 100;
      splits = validSplitMembers.map(userId => ({ userId, amount: perPerson }));
    }
    const createdAt = req.body.createdAt ? new Date(req.body.createdAt) : new Date();
    const paidBy = req.body.paidBy && memberIds.includes(req.body.paidBy) ? req.body.paidBy : uid;
    const ref = store.addExpense({
      roomId,
      addedBy: paidBy,
      amount,
      description,
      category,
      splitType,
      billImageUrl,
      createdAt: createdAt,
    });
    for (const s of splits) {
      store.addExpenseSplit({
        expenseId: ref.id,
        userId: s.userId,
        amount: s.amount,
        paid: false,
        paidAt: null,
      });
    }
    const expense = { id: ref.id, roomId, addedBy: paidBy, amount, description, category, splitType, billImageUrl, createdAt: createdAt, splits };

    // Notify participants (excluding payer)
    try {
      const room = store.getRoomById(roomId);
      const title = 'New expense added';
      splits.forEach(s => {
        if (s.userId === paidBy) return;
        store.addNotification({
          userId: s.userId,
          title,
          message: `${room ? room.name : 'Room'}: ${description} – ₹${amount.toFixed(2)} split with you.`,
          type: 'expense',
          is_read: false,
        });
      });
    } catch (_) {
      // Non‑critical: ignore notification errors
    }

    res.status(201).json(expense);
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/expenses/:id/splits/:userId/paid – mark a split as paid
 */
async function markSplitPaid(req, res, next) {
  try {
    const { id, userId } = req.params;
    const uid = req.user.id;
    const expense = store.getExpenseById(id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    const roomId = expense.roomId;
    const member = store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const split = store.getExpenseSplitByUser(id, userId);
    if (!split) return res.status(404).json({ error: 'Split not found' });
    store.updateExpenseSplit(split.id, { paid: true, paidAt: new Date() });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

module.exports = { listByRoom, create, markSplitPaid };
