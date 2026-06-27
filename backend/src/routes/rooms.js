const express = require('express');
const router = express.Router();
const rc = require('../controllers/roomsController');
const ec = require('../controllers/expensesController');
const cc = require('../controllers/choresController');
const bc = require('../controllers/billsController');
const ac = require('../controllers/analyticsController');
const ic = require('../controllers/invitesController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/',               rc.list);
router.post('/',              rc.create);
router.post('/join',          rc.joinByCode);
router.get('/:id',            rc.getById);
router.patch('/:id',          rc.updateRoom);
router.delete('/:id',         rc.deleteRoom);
router.post('/:id/leave',     rc.leaveRoom);
router.get('/:id/members',    rc.getMembers);
router.post('/:roomId/members',              rc.addMember);
router.delete('/:roomId/members/:memberId',  rc.removeMember);
router.get('/:id/balances',                  rc.getBalances);
router.get('/:id/analytics/expenses-over-time', rc.analyticsExpensesOverTime);
router.get('/:id/analytics/summary',            ac.getRoomSummary);
router.post('/:roomId/invites',               ic.createInvite);
router.get('/:roomId/expenses',               ec.listByRoom);
router.post('/:roomId/expenses',              ec.create);
router.get('/:roomId/chores',                 cc.listByRoom);
router.post('/:roomId/chores',                cc.create);
router.get('/:roomId/bills',                  bc.listByRoom);
router.post('/:roomId/bills',                 bc.create);

module.exports = router;
