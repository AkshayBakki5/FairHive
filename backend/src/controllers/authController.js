const { validationResult } = require('express-validator');
const store = require('../store/jsonStore');
const { hashPassword, comparePassword } = require('../utils/hash');
const { sign } = require('../utils/jwt');

/**
 * POST /api/auth/register
 * Body: { email, password, displayName }
 */
async function register(req, res, next) {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });
    const { email, password, displayName } = req.body;
    const normalized = (email || '').trim().toLowerCase();
    const existing = store.getUserByEmail(normalized);
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const passwordHash = await hashPassword(password);
    const ref = store.addUser({
      email: normalized,
      passwordHash,
      displayName: (displayName || '').trim() || normalized.split('@')[0],
      role: 'member',
      createdAt: new Date(),
    });
    const token = sign({ id: ref.id, email: normalized, role: 'member' });
    res.status(201).json({ token, user: { id: ref.id, email: normalized, displayName: ref.displayName, role: 'member' } });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });
    const { email, password } = req.body;
    const normalized = (email || '').trim().toLowerCase();
    const user = store.getUserByEmail(normalized);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    const token = sign({ id: user.id, email: user.email, role: user.role || 'member' });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        role: user.role || 'member',
      },
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { register, login };
