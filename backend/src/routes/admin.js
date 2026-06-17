const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, requireAdmin } = require('../middleware/auth');

router.use(auth);
router.use(requireAdmin);

router.get('/rooms', adminController.listRooms);
router.get('/users', adminController.listUsers);
router.patch('/rooms/:id/members/:userId/role', adminController.updateMemberRole);

module.exports = router;
