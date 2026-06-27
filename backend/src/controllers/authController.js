const { validationResult } = require('express-validator');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const store = require('../store/jsonStore');
const { hashPassword, comparePassword } = require('../utils/hash');
const { sign } = require('../utils/jwt');
const User = require('../models/User');

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

/**
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res, next) {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email required' });

    // Always return success to avoid user enumeration
    const user = await store.getUserByEmail(email);
    if (!user) return res.json({ ok: true });

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await User.findByIdAndUpdate(user.id, { resetToken: token, resetTokenExpiry: expiry });

    const resetUrl = `${process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:3000'}/reset-password.html?token=${token}`;

    // Send email if SMTP configured
    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: 'FairHive — Reset your password',
        html: `<p>Click the link below to reset your password. It expires in 1 hour.</p>
               <p><a href="${resetUrl}">${resetUrl}</a></p>
               <p>If you did not request this, ignore this email.</p>`,
      });
    } else {
      // No SMTP — log the link so admins can share it manually
      console.log(`[FairHive] Password reset link for ${email}: ${resetUrl}`);
    }

    res.json({ ok: true });
  } catch (e) { next(e); }
}

/**
 * POST /api/auth/reset-password
 */
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ error: 'Reset link is invalid or has expired' });

    const passwordHash = await hashPassword(password);
    await User.findByIdAndUpdate(user._id, {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    });

    res.json({ ok: true });
  } catch (e) { next(e); }
}

module.exports = { register, login, me, updateProfile, changePassword, forgotPassword, resetPassword };
