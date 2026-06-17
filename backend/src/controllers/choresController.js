const store = require('../store/jsonStore');

/**
 * GET /api/rooms/:roomId/chores – list chores with current assignment and history
 */
async function listByRoom(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid = req.user.id;
    const member = store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const chores = store.getChores(roomId);
    const list = chores.map(c => {
      const assignments = store.getChoreAssignments(c.id);
      const current = assignments.length === 0 ? null : assignments[0];
      return { ...c, currentAssignment: current, assignments };
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/rooms/:roomId/chores – create chore and first assignment
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

    const title = (req.body.title || '').trim() || 'Chore';
    const description = (req.body.description || '').trim();
    const category = (req.body.category || '').trim() || 'other';
    const points = typeof req.body.points === 'number' ? req.body.points : (parseInt(req.body.points, 10) || 10);
    const frequency = req.body.frequency || 'weekly'; // once | daily | weekly | monthly
    const priority = req.body.priority || 'medium';   // low | medium | high

    // Rotation order: from body or all members, restricted to valid room members
    let rotationOrder = Array.isArray(req.body.rotationOrder) && req.body.rotationOrder.length
      ? req.body.rotationOrder
      : memberIds;
    rotationOrder = rotationOrder.filter(id => memberIds.includes(id));
    if (rotationOrder.length === 0) rotationOrder = memberIds;

    // Due date: use provided value or compute from frequency
    let due;
    if (req.body.dueDate) {
      due = new Date(req.body.dueDate);
    } else {
      due = new Date();
      if (frequency === 'daily') due.setDate(due.getDate() + 1);
      else if (frequency === 'monthly') due.setMonth(due.getMonth() + 1);
      else if (frequency === 'once') due.setDate(due.getDate() + 1);
      else due.setDate(due.getDate() + 7); // weekly default
    }

    // Optionally override first assignee; otherwise use equal distribution for this date
    let assignedTo;
    if (req.body.assignedTo && memberIds.includes(req.body.assignedTo)) {
      assignedTo = req.body.assignedTo;
    } else {
      assignedTo = pickBalancedAssignee(roomId, rotationOrder, due);
    }

    const createdAt = new Date();
    const ref = store.addChore({
      roomId,
      title,
      description,
      category,
      points,
      rotationOrder,
      frequency,
      priority,
      createdAt,
    });

    // First assignment
    const assignment = store.addChoreAssignment({
      choreId: ref.id,
      userId: assignedTo,
      dueDate: due,
      completed: false,
      completedAt: null,
    });

    // Notification: new chore assigned
    try {
      const room = store.getRoomById(roomId);
      store.addNotification({
        userId: assignedTo,
        title: 'New chore assigned',
        message: `You have been assigned ${title} in ${room ? room.name : 'your room'}.`,
        type: 'chore',
        is_read: false,
      });
    } catch (_) {
      // Non‑critical: ignore notification errors
    }

    res.status(201).json({
      id: ref.id,
      roomId,
      title,
      description,
      category,
      points,
      rotationOrder,
      frequency,
      priority,
      createdAt,
      currentAssignment: { id: assignment.id, userId: assignedTo, dueDate: due, completed: false, completedAt: null },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/chores/:id/assignments – complete current and assign next
 */
async function completeOrAssign(req, res, next) {
  try {
    const choreId = req.params.id;
    const uid = req.user.id;
    const chore = store.getChoreById(choreId);
    if (!chore) return res.status(404).json({ error: 'Chore not found' });
    const roomId = chore.roomId;
    const member = store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    if (req.body.action !== 'complete') return res.status(400).json({ error: 'action: complete required' });
    const assignments = store.getChoreAssignments(choreId);
    if (assignments.length === 0) return res.status(404).json({ error: 'No assignment found' });
    const current = assignments[0];

    // Mark current as completed and record who completed it
    store.updateChoreAssignment(current.id, {
      completed: true,
      completedAt: new Date(),
      completedBy: uid,
    });

    // If rotate is false, only mark complete and do not assign next
    if (req.body.rotate === false) {
      return res.json({ ok: true });
    }

    // Use current room members for rotation so all members are included (fixes stale/single-member rotationOrder)
    const memberIds = store.getRoomMembers(roomId).map(m => m.userId);
    let order = Array.isArray(chore.rotationOrder) && chore.rotationOrder.length > 0
      ? chore.rotationOrder.filter(id => memberIds.includes(id))
      : [];
    if (order.length === 0) order = memberIds;
    if (!order.length) return res.json({ ok: true });

    // For one-time chores, don't create a new assignment
    if (chore.frequency === 'once') {
      return res.json({ ok: true });
    }

    // Compute next due date based on frequency
    const due = new Date();
    if (chore.frequency === 'daily') due.setDate(due.getDate() + 1);
    else if (chore.frequency === 'monthly') due.setMonth(due.getMonth() + 1);
    else due.setDate(due.getDate() + 7);

    // Choose next assignee using equal-distribution + daily rotation rule
    const nextUserId = pickBalancedAssignee(roomId, order, due);
    if (!nextUserId) return res.json({ ok: true });
    store.addChoreAssignment({
      choreId,
      userId: nextUserId,
      dueDate: due,
      completed: false,
      completedAt: null,
    });
    res.json({ ok: true, nextUserId, dueDate: due });
  } catch (e) {
    next(e);
  }
}

/**
 * Compute how many chores each member already has on a given date.
 * Only considers the latest assignment per chore (current assignment).
 */
function getAssignmentCountsForDate(roomId, rotationOrder, targetDate) {
  const counts = {};
  rotationOrder.forEach(id => {
    counts[id] = 0;
  });

  const chores = store.getChores(roomId);
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  chores.forEach(chore => {
    const assignments = store.getChoreAssignments(chore.id);
    if (!assignments.length) return;
    const current = assignments[0];
    if (!current.dueDate || !current.userId) return;
    const due = new Date(current.dueDate);
    if (due >= start && due <= end && rotationOrder.includes(current.userId)) {
      counts[current.userId] = (counts[current.userId] || 0) + 1;
    }
  });

  return counts;
}

/**
 * Pick an assignee for a given date such that:
 * - chores for that day are distributed as evenly as possible, and
 * - the starting member rotates from day to day.
 */
function pickBalancedAssignee(roomId, rotationOrder, targetDate) {
  if (!rotationOrder || rotationOrder.length === 0) return null;

  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayIndex = Math.floor(dayStart.getTime() / (24 * 60 * 60 * 1000));
  const offset = ((dayIndex % rotationOrder.length) + rotationOrder.length) % rotationOrder.length;

  const counts = getAssignmentCountsForDate(roomId, rotationOrder, targetDate);

  let bestUser = null;
  let bestCount = Infinity;

  // Walk rotation order starting from offset so the "first" member shifts each day
  for (let step = 0; step < rotationOrder.length; step++) {
    const idx = (offset + step) % rotationOrder.length;
    const userId = rotationOrder[idx];
    const c = typeof counts[userId] === 'number' ? counts[userId] : 0;
    if (c < bestCount) {
      bestCount = c;
      bestUser = userId;
    }
  }

  return bestUser;
}

module.exports = { listByRoom, create, completeOrAssign };
