const { validationResult } = require('express-validator');
const store = require('../store/jsonStore');
const { hashPassword, comparePassword } = require('../utils/hash');
const { sign } = require('../utils/jwt');

/**
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });
    const { email, password, displayName } = req.body;
    const normalized = (email || '').trim().toLowerCase();
    const existing = await store.getUserByEmail(normalized);
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const passwordHash = await hashPassword(password);
    const ref = await store.addUser({
      email: normalized,
      passwordHash,
      displayName: (displayName || '').trim() || normalized.split('@')[0],
      role: 'member',
    });
    const token = sign({ id: ref.id, email: normalized, role: 'member' });
    res.status(201).json({ token, user: { id: ref.id, email: normalized, displayName: ref.displayName, role: 'member' } });
  } catch (e) { next(e); }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });
    const { email, password } = req.body;
    const normalized = (email || '').trim().toLowerCase();
    const user = await store.getUserByEmail(normalized);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    const token = sign({ id: user.id, email: user.email, role: user.role || 'member' });
    res.json({
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName || user.email.split('@')[0], role: user.role || 'member' },
    });
  } catch (e) { next(e); }
}

/**
 * GET /api/auth/me
 */
async function me(req, res, next) {
  try {
    const user = await store.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl, role: user.role });
  } catch (e) { next(e); }
}

/**
 * PATCH /api/auth/profile
 */
async function updateProfile(req, res, next) {
  try {
    const updates = {};
    if (req.body.displayName !== undefined) updates.displayName = (req.body.displayName || '').trim();
    if (req.body.avatarUrl  !== undefined) updates.avatarUrl  = req.body.avatarUrl || null;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });
    const updated = await store.updateUser(req.user.id, updates);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json({ id: updated.id, email: updated.email, displayName: updated.displayName, avatarUrl: updated.avatarUrl, role: updated.role });
  } catch (e) { next(e); }
}

/**
 * PATCH /api/auth/password
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const user = await store.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const ok = await comparePassword(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    const passwordHash = await hashPassword(newPassword);
    await store.updateUser(req.user.id, { passwordHash });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

module.exports = { register, login, me, updateProfile, changePassword };
