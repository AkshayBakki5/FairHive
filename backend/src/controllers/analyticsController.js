const store = require('../store/jsonStore');

/**
 * GET /api/rooms/:id/analytics/summary
 * Aggregate expenses, balances and chores into a single JSON payload.
 */
async function getRoomSummary(req, res, next) {
  try {
    const roomId = req.params.id;
    const uid = req.user.id;

    const member = store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const room = store.getRoomById(roomId);
    const expenses = store.getExpenses(roomId) || [];
    const chores = store.getChores(roomId) || [];
    const members = store.getRoomMembers(roomId) || [];
    const users = store.load('users') || [];

    const memberName = (userId) => {
      const u = users.find((x) => x.id === userId);
      if (u && (u.displayName || u.email)) return u.displayName || u.email;
      const m = members.find((mm) => mm.userId === userId);
      return (m && m.displayName) || (u && u.email) || userId.slice(0, 8);
    };

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1) Total expenses (current month)
    let totalCurrentMonth = 0;
    const categoryTotals = {};
    const userTotals = {};

    expenses.forEach((e) => {
      const amount = e.amount || 0;
      const cat = e.category || 'other';
      const payer = e.addedBy;

      // Category totals
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;

      // User totals (based on payer)
      if (payer) userTotals[payer] = (userTotals[payer] || 0) + amount;

      // Current month total
      if (e.createdAt) {
        const d = new Date(e.createdAt);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          totalCurrentMonth += amount;
        }
      }
    });

    // 4) Monthly spending trend – last 6 months
    const monthlyTrendMap = {};
    expenses.forEach((e) => {
      if (!e.createdAt) return;
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrendMap[key] = (monthlyTrendMap[key] || 0) + (e.amount || 0);
    });

    const trendKeys = Object.keys(monthlyTrendMap).sort();
    const last6Keys = trendKeys.slice(-6);
    const monthlyTrend = last6Keys.map((key) => {
      const [y, m] = key.split('-');
      const monthLabel = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleString('default', {
        month: 'short',
      });
      return { month: monthLabel, amount: monthlyTrendMap[key] };
    });

    // 5) Net balance per user: (amount paid by user) - (user's share)
    const balanceByUser = {};
    expenses.forEach((e) => {
      const payerId = e.addedBy;
      const amount = e.amount || 0;
      if (payerId) {
        balanceByUser[payerId] = (balanceByUser[payerId] || 0) + amount;
      }
      const splits = store.getExpenseSplits(e.id);
      splits.forEach((s) => {
        const userId = s.userId;
        balanceByUser[userId] = (balanceByUser[userId] || 0) - (s.amount || 0);
      });
    });
    const balances = Object.keys(balanceByUser).map((userId) => ({
      user: memberName(userId),
      user_id: userId,
      balance: balanceByUser[userId],
    }));

    // 6) Chore completion stats per user
    const choreStatsMap = {};
    chores.forEach((chore) => {
      const assigns = store.getChoreAssignments(chore.id) || [];
      assigns.forEach((a) => {
        if (!a.completed || !a.completedAt) return;
        const userId = a.completedBy || a.userId;
        if (!userId) return;
        choreStatsMap[userId] = (choreStatsMap[userId] || 0) + 1;
      });
    });
    const choreStats = Object.keys(choreStatsMap).map((userId) => ({
      user: memberName(userId),
      user_id: userId,
      completed: choreStatsMap[userId],
    }));

    // 2) Category breakdown
    const categoryBreakdown = Object.keys(categoryTotals).map((cat) => ({
      category: cat,
      amount: categoryTotals[cat],
    }));

    // 3) Expense breakdown by user
    const userSpending = Object.keys(userTotals).map((userId) => ({
      user: memberName(userId),
      user_id: userId,
      amount: userTotals[userId],
    }));

    // 7) Most expensive category
    let mostExpensiveCategory = null;
    let maxCategoryAmount = -Infinity;
    categoryBreakdown.forEach((c) => {
      if (c.amount > maxCategoryAmount) {
        maxCategoryAmount = c.amount;
        mostExpensiveCategory = c.category;
      }
    });

    // 8) Top spender
    let topSpender = null;
    let topSpenderAmount = -Infinity;
    userSpending.forEach((u) => {
      if (u.amount > topSpenderAmount) {
        topSpenderAmount = u.amount;
        topSpender = u.user;
      }
    });

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
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getRoomSummary,
};

