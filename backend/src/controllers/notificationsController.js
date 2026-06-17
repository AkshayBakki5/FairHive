const store = require('../store/jsonStore');

/**
 * Create a notification manually
 * POST /api/notifications/create
 */
async function create(req, res, next) {
  try {
    const { userId, title, message, type } = req.body || {};
    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'userId, title and message are required' });
    }
    const user = store.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const notif = store.addNotification({
      userId,
      title: String(title),
      message: String(message),
      type: type || 'reminder',
      is_read: false,
    });
    res.status(201).json(notif);
  } catch (e) {
    next(e);
  }
}

/**
 * Get current user's notifications (latest first)
 * GET /api/notifications
 */
async function listMy(req, res, next) {
  try {
    const uid = req.user.id;
    const list = store.getUserNotifications(uid);
    res.json(list);
  } catch (e) {
    next(e);
  }
}

/**
 * Mark a notification as read
 * PATCH /api/notifications/:id/read
 */
async function markRead(req, res, next) {
  try {
    const id = req.params.id;
    const uid = req.user.id;
    const notif = store.getNotificationById(id);
    if (!notif || notif.userId !== uid) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    const updated = store.updateNotification(id, { is_read: true });
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
async function remove(req, res, next) {
  try {
    const id = req.params.id;
    const uid = req.user.id;
    const notif = store.getNotificationById(id);
    if (!notif || notif.userId !== uid) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    store.deleteNotification(id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

module.exports = {
  create,
  listMy,
  markRead,
  remove,
};

