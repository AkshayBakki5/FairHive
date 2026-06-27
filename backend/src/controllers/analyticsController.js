const store = require('../store/jsonStore');

/** GET /api/rooms/:id/analytics/summary */
async function getRoomSummary(req, res, next) {
  try {
    const roomId = req.params.id;
    const uid    = req.user.id;
    const member = await store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const room     = await store.getRoomById(roomId);
    const expenses = await store.getExpenses(roomId) || [];
    const chores   = await store.getChores(roomId) || [];
    const members  = await store.getRoomMembers(roomId) || [];
    const users    = await store.getUsers() || [];

    const memberName = (userId) => {
      const id = userId ? userId.toString() : '';
      const u  = users.find(x => x.id.toString() === id);
      return (u && (u.displayName || u.email)) || id.slice(0, 8);
    };

    const now = new Date();
    let totalCurrentMonth = 0;
    const categoryTotals  = {};
    const userTotals      = {};

    expenses.forEach(e => {
      const amount = e.amount || 0;
      const cat    = e.category || 'other';
      const payer  = e.addedBy ? e.addedBy.toString() : null;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
      if (payer) userTotals[payer] = (userTotals[payer] || 0) + amount;
      if (e.createdAt) {
        const d = new Date(e.createdAt);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) totalCurrentMonth += amount;
      }
    });

    // Monthly trend
    const monthlyTrendMap = {};
    expenses.forEach(e => {
      if (!e.createdAt) return;
      const d   = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrendMap[key] = (monthlyTrendMap[key] || 0) + (e.amount || 0);
    });
    const last6Keys = Object.keys(monthlyTrendMap).sort().slice(-6);
    const monthlyTrend = last6Keys.map(key => {
      const [y, m] = key.split('-');
      const label  = new Date(+y, +m - 1, 1).toLocaleString('default', { month: 'short' });
      return { month: label, amount: monthlyTrendMap[key] };
    });

    // Net balances
    const balanceByUser = {};
    for (const e of expenses) {
      const payerId = e.addedBy ? e.addedBy.toString() : null;
      if (payerId) balanceByUser[payerId] = (balanceByUser[payerId] || 0) + (e.amount || 0);
      const splits = await store.getExpenseSplits(e.id);
      splits.forEach(s => {
        const sid = s.userId ? s.userId.toString() : null;
        if (sid) balanceByUser[sid] = (balanceByUser[sid] || 0) - (s.amount || 0);
      });
    }
    // Include payments in balances
    const payments = await store.getPayments(roomId);
    for (const p of payments) {
      const from = p.fromUser ? p.fromUser.toString() : null;
      const to   = p.toUser   ? p.toUser.toString()   : null;
      if (from) balanceByUser[from] = (balanceByUser[from] || 0) - p.amount;
      if (to)   balanceByUser[to]   = (balanceByUser[to]   || 0) + p.amount;
    }
    const balances = Object.keys(balanceByUser).map(uid => ({
      user: memberName(uid), user_id: uid, balance: balanceByUser[uid],
    }));

    // Chore stats
    const choreStatsMap = {};
    for (const chore of chores) {
      const assigns = await store.getChoreAssignments(chore.id) || [];
      assigns.forEach(a => {
        if (!a.completed || !a.completedAt) return;
        const userId = (a.completedBy || a.userId) ? (a.completedBy || a.userId).toString() : null;
        if (userId) choreStatsMap[userId] = (choreStatsMap[userId] || 0) + 1;
      });
    }
    const choreStats = Object.keys(choreStatsMap).map(uid => ({
      user: memberName(uid), user_id: uid, completed: choreStatsMap[uid],
    }));

    const categoryBreakdown = Object.keys(categoryTotals).map(cat => ({ category: cat, amount: categoryTotals[cat] }));
    const userSpending      = Object.keys(userTotals).map(uid => ({ user: memberName(uid), user_id: uid, amount: userTotals[uid] }));

    let mostExpensiveCategory = null, maxCat = -Infinity;
    categoryBreakdown.forEach(c => { if (c.amount > maxCat) { maxCat = c.amount; mostExpensiveCategory = c.category; } });

    let topSpender = null, topAmt = -Infinity;
    userSpending.forEach(u => { if (u.amount > topAmt) { topAmt = u.amount; topSpender = u.user; } });

    res.json({
      room: room ? { id: room.id, name: room.name } : null,
      total_expenses: totalCurrentMonth,
      category_breakdown: categoryBreakdown,
      user_spending: userSpending,
      monthly_trend: monthlyTrend,
      balances,
      chore_stats: choreStats,
      top_spender: topSpender,
      most_expensive_category: mostExpensiveCategory,
    });
  } catch (e) { next(e); }
}

module.exports = { getRoomSummary };
