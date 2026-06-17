/**
 * FairHive Express application
 * Mounts middleware and API routes. Uses JSON file storage (no Firebase).
 */
const express = require('express');
const path = require('path');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const expenseRoutes = require('./routes/expenses');
const choreRoutes = require('./routes/chores');
const billRoutes = require('./routes/bills');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const inviteRoutes = require('./routes/invites');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Serve uploaded files (bill/expense images) from backend/uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API routes (expenses list/create live under /api/rooms/:id/expenses; PATCH under /api/expenses)
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/chores', choreRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

// Handle SPA routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes - let them return 404 from error handler
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  // Serve index.html for all other routes
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'index.html'));
});

app.use(errorHandler);

module.exports = app;
