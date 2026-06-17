/**
 * FairHive seed script – creates sample users, rooms, members, expenses, chores, bills.
 * Uses JSON store (backend/data/*.json). Run from backend: node scripts/seed.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const fs = require('fs');
const store = require('../src/store/jsonStore');

const seedPath = path.join(__dirname, '..', '..', 'scripts', 'seed-data.json');
let seed;
try {
  seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
} catch (e) {
  console.error('Could not read seed-data.json at', seedPath);
  process.exit(1);
}

async function main() {
  const userIds = [];
  for (const u of seed.users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const ref = store.addUser({
      email: u.email.trim().toLowerCase(),
      passwordHash,
      displayName: u.displayName || u.email.split('@')[0],
      role: u.role || 'member',
      createdAt: new Date(),
    });
    userIds.push(ref.id);
    console.log('User:', u.email, '->', ref.id);
  }

  const roomIds = [];
  for (let i = 0; i < seed.rooms.length; i++) {
    const r = seed.rooms[i];
    const ref = store.addRoom({
      name: r.name,
      code: (r.code || 'DEMO' + i).toUpperCase(),
      createdBy: userIds[0],
      createdAt: new Date(),
    });
    roomIds.push(ref.id);
    console.log('Room:', r.name, '->', ref.id);
  }

  const roomId = roomIds[0];
  for (let i = 0; i < userIds.length; i++) {
    store.addRoomMember({
      roomId,
      userId: userIds[i],
      role: i === 0 ? 'admin' : 'member',
      joinedAt: new Date(),
    });
    console.log('RoomMember:', userIds[i], '->', roomId);
  }

  for (const e of seed.expenses || []) {
    const ref = store.addExpense({
      roomId,
      addedBy: userIds[0],
      amount: e.amount || 0,
      description: e.description || 'Expense',
      splitType: e.splitType || 'equal',
      billImageUrl: null,
      createdAt: new Date(),
    });
    const memberIds = userIds;
    const perPerson = Math.round(((e.amount || 0) / memberIds.length) * 100) / 100;
    for (const uid of memberIds) {
      store.addExpenseSplit({
        expenseId: ref.id,
        userId: uid,
        amount: perPerson,
        paid: false,
        paidAt: null,
      });
    }
    console.log('Expense:', e.description, '->', ref.id);
  }

  for (const c of seed.chores || []) {
    const ref = store.addChore({
      roomId,
      title: c.title || 'Chore',
      description: c.description || '',
      rotationOrder: userIds,
      frequency: c.frequency || 'weekly',
      createdAt: new Date(),
    });
    const due = new Date();
    due.setDate(due.getDate() + (c.frequency === 'daily' ? 1 : 7));
    store.addChoreAssignment({
      choreId: ref.id,
      userId: userIds[0],
      dueDate: due,
      completed: false,
      completedAt: null,
    });
    console.log('Chore:', c.title, '->', ref.id);
  }

  for (const b of seed.bills || []) {
    const due = b.dueDate ? new Date(b.dueDate) : new Date();
    store.addBill({
      roomId,
      name: b.name || 'Bill',
      amount: b.amount || 0,
      dueDate: due,
      billImageUrl: null,
      paid: false,
      paidBy: null,
      paidAt: null,
      createdAt: new Date(),
    });
    console.log('Bill:', b.name);
  }

  console.log('Seed done. Login with admin@fairhive.demo / admin123');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
