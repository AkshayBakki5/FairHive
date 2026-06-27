const store = require('../store/jsonStore');

/** POST /api/notifications/create */
async function create(req, res, next) {
  try {
    const { userId, title, message, type } = req.body || {};
    if (!userId || !title || !message) return res.status(400).json({ error: 'userId, title and message are required' });
    const user = await store.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const notif = await store.addNotification({ userId, title: String(title), message: String(message), type: type || 'reminder' });
    res.status(201).json(notif);
  } catch (e) { next(e); }
}

/** GET /api/notifications */
async function listMy(req, res, next) {
  try {
    res.json(await store.getUserNotifications(req.user.id));
  } catch (e) { next(e); }
}

/** PATCH /api/notifications/:id/read */
async function markRead(req, res, next) {
  try {
    const id    = req.params.id;
    const uid   = req.user.id;
    const notif = await store.getNotificationById(id);
    if (!notif || notif.userId.toString() !== uid) return res.status(404).json({ error: 'Notification not found' });
    res.json(await store.updateNotification(id, { is_read: true }));
  } catch (e) { next(e); }
}

/** PATCH /api/notifications/read-all */
async function markAllRead(req, res, next) {
  try {
    await store.markAllNotificationsRead(req.user.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

/** DELETE /api/notifications/:id */
async function remove(req, res, next) {
  try {
    const id    = req.params.id;
    const uid   = req.user.id;
    const notif = await store.getNotificationById(id);
    if (!notif || notif.userId.toString() !== uid) return res.status(404).json({ error: 'Notification not found' });
    await store.deleteNotification(id);
    res.status(204).end();
  } catch (e) { next(e); }
}

module.exports = { create, listMy, markRead, markAllRead, remove };
