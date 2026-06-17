const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.post('/create', notificationsController.create);
router.get('/', notificationsController.listMy);
router.patch('/:id/read', notificationsController.markRead);
router.delete('/:id', notificationsController.remove);

module.exports = router;

