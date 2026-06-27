const express = require('express');
const router = express.Router();
const c = require('../controllers/notificationsController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/',                  c.listMy);
router.post('/create',           c.create);
router.patch('/read-all',        c.markAllRead);
router.patch('/:id/read',        c.markRead);
router.delete('/:id',            c.remove);

module.exports = router;
