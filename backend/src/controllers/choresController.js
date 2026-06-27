const store = require('../store/jsonStore');

/** GET /api/rooms/:roomId/chores */
async function listByRoom(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid = req.user.id;
    const member = await store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const chores = await store.getChores(roomId);
    const list = await Promise.all(chores.map(async c => {
      const assignments = await store.getChoreAssignments(c.id);
      return { ...c, currentAssignment: assignments[0] || null, assignments };
    }));
    res.json(list);
  } catch (e) { next(e); }
}

/** POST /api/rooms/:roomId/chores */
async function create(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const uid = req.user.id;
    const member = await store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const members = await store.getRoomMembers(roomId);
    const memberIds = members.map(m => m.userId.toString());
    if (memberIds.length === 0) return res.status(400).json({ error: 'No members in room' });

    const title       = (req.body.title || '').trim() || 'Chore';
    const description = (req.body.description || '').trim();
    const category    = (req.body.category || '').trim() || 'other';
    const points      = parseInt(req.body.points, 10) || 10;
    const frequency   = req.body.frequency || 'weekly';
    const priority    = req.body.priority  || 'medium';

    let rotationOrder = Array.isArray(req.body.rotationOrder) && req.body.rotationOrder.length
      ? req.body.rotationOrder.filter(id => memberIds.includes(id.toString()))
      : memberIds;
    if (!rotationOrder.length) rotationOrder = memberIds;

    let due;
    if (req.body.dueDate) { due = new Date(req.body.dueDate); }
    else {
      due = new Date();
      if (frequency === 'daily') due.setDate(due.getDate() + 1);
      else if (frequency === 'monthly') due.setMonth(due.getMonth() + 1);
      else if (frequency === 'once') due.setDate(due.getDate() + 1);
      else due.setDate(due.getDate() + 7);
    }

    let assignedTo;
    if (req.body.assignedTo && memberIds.includes(req.body.assignedTo.toString())) {
      assignedTo = req.body.assignedTo;
    } else {
      assignedTo = await pickBalancedAssignee(roomId, rotationOrder, due);
    }

    const ref = await store.addChore({ roomId, title, description, category, points, rotationOrder, frequency, priority });
    const assignment = await store.addChoreAssignment({ choreId: ref.id, userId: assignedTo, dueDate: due, completed: false, completedAt: null });

    try {
      const room = await store.getRoomById(roomId);
      await store.addNotification({
        userId: assignedTo,
        title: 'New chore assigned',
        message: `You have been assigned "${title}" in ${room ? room.name : 'your room'}.`,
        type: 'chore',
      });
    } catch (_) {}

    res.status(201).json({
      id: ref.id, roomId, title, description, category, points, rotationOrder, frequency, priority,
      currentAssignment: { id: assignment.id, userId: assignedTo, dueDate: due, completed: false, completedAt: null },
    });
  } catch (e) { next(e); }
}

/** PATCH /api/chores/:id – edit chore details */
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const uid = req.user.id;
    const chore = await store.getChoreById(id);
    if (!chore) return res.status(404).json({ error: 'Chore not found' });
    const member = await store.getRoomMember(chore.roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const allowed = ['title', 'description', 'category', 'points', 'frequency', 'priority', 'rotationOrder'];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    const updated = await store.updateChore(id, updates);
    res.json(updated);
  } catch (e) { next(e); }
}

/** DELETE /api/chores/:id */
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const uid = req.user.id;
    const chore = await store.getChoreById(id);
    if (!chore) return res.status(404).json({ error: 'Chore not found' });
    const member = await store.getRoomMember(chore.roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    await store.deleteChoreAssignmentsByChore(id);
    await store.deleteChore(id);
    res.status(204).end();
  } catch (e) { next(e); }
}

/** PATCH /api/chores/:id/assignments – complete and assign next */
async function completeOrAssign(req, res, next) {
  try {
    const choreId = req.params.id;
    const uid = req.user.id;
    const chore = await store.getChoreById(choreId);
    if (!chore) return res.status(404).json({ error: 'Chore not found' });
    const roomId = chore.roomId;
    const member = await store.getRoomMember(roomId, uid);
    if (!member) return res.status(403).json({ error: 'Not a member' });
    if (req.body.action !== 'complete') return res.status(400).json({ error: 'action: complete required' });

    const assignments = await store.getChoreAssignments(choreId);
    if (assignments.length === 0) return res.status(404).json({ error: 'No assignment found' });
    const current = assignments[0];

    await store.updateChoreAssignment(current.id, { completed: true, completedAt: new Date(), completedBy: uid });

    if (req.body.rotate === false || chore.frequency === 'once') return res.json({ ok: true });

    const memberIds = (await store.getRoomMembers(roomId)).map(m => m.userId.toString());
    let order = Array.isArray(chore.rotationOrder) && chore.rotationOrder.length
      ? chore.rotationOrder.map(id => id.toString()).filter(id => memberIds.includes(id))
      : memberIds;
    if (!order.length) order = memberIds;
    if (!order.length) return res.json({ ok: true });

    const due = new Date();
    if (chore.frequency === 'daily') due.setDate(due.getDate() + 1);
    else if (chore.frequency === 'monthly') due.setMonth(due.getMonth() + 1);
    else due.setDate(due.getDate() + 7);

    const nextUserId = await pickBalancedAssignee(roomId, order, due);
    if (!nextUserId) return res.json({ ok: true });
    await store.addChoreAssignment({ choreId, userId: nextUserId, dueDate: due, completed: false, completedAt: null });
    res.json({ ok: true, nextUserId, dueDate: due });
  } catch (e) { next(e); }
}

async function getAssignmentCountsForDate(roomId, rotationOrder, targetDate) {
  const counts = {};
  rotationOrder.forEach(id => { counts[id.toString()] = 0; });
  const chores = await store.getChores(roomId);
  const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setHours(23, 59, 59, 999);
  for (const chore of chores) {
    const assignments = await store.getChoreAssignments(chore.id);
    if (!assignments.length) continue;
    const current = assignments[0];
    if (!current.dueDate || !current.userId) continue;
    const due = new Date(current.dueDate);
    const userId = current.userId.toString();
    if (due >= start && due <= end && rotationOrder.map(id => id.toString()).includes(userId)) {
      counts[userId] = (counts[userId] || 0) + 1;
    }
  }
  return counts;
}

async function pickBalancedAssignee(roomId, rotationOrder, targetDate) {
  if (!rotationOrder || rotationOrder.length === 0) return null;
  const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
  const dayIndex = Math.floor(dayStart.getTime() / (24 * 60 * 60 * 1000));
  const offset = ((dayIndex % rotationOrder.length) + rotationOrder.length) % rotationOrder.length;
  const counts = await getAssignmentCountsForDate(roomId, rotationOrder, targetDate);
  let bestUser = null, bestCount = Infinity;
  for (let step = 0; step < rotationOrder.length; step++) {
    const idx = (offset + step) % rotationOrder.length;
    const userId = rotationOrder[idx].toString();
    const c = counts[userId] || 0;
    if (c < bestCount) { bestCount = c; bestUser = userId; }
  }
  return bestUser;
}

module.exports = { listByRoom, create, update, remove, completeOrAssign };
