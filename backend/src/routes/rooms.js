const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/roomsController');
const expensesController = require('../controllers/expensesController');
const choresController = require('../controllers/choresController');
const billsController = require('../controllers/billsController');
const analyticsController = require('../controllers/analyticsController');
const invitesController = require('../controllers/invitesController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/', roomsController.list);
router.post('/', roomsController.create);
router.post('/join', roomsController.joinByCode);
router.get('/:id', roomsController.getById);
router.get('/:id/members', roomsController.getMembers);
router.get('/:id/balances', roomsController.getBalances);
router.get('/:id/analytics/expenses-over-time', roomsController.analyticsExpensesOverTime);
router.get('/:id/analytics/summary', analyticsController.getRoomSummary);
router.post('/:roomId/members', roomsController.addMember);
router.delete('/:roomId/members/:memberId', roomsController.removeMember);
router.post('/:roomId/invites', invitesController.createInvite);
router.get('/:roomId/expenses', expensesController.listByRoom);
router.post('/:roomId/expenses', expensesController.create);
router.get('/:roomId/chores', choresController.listByRoom);
router.post('/:roomId/chores', choresController.create);
router.get('/:roomId/bills', billsController.listByRoom);
router.post('/:roomId/bills', billsController.create);

module.exports = router;
