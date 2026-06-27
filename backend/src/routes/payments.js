const express = require('express');
const router  = express.Router();
const c       = require('../controllers/paymentsController');
const { auth } = require('../middleware/auth');

router.use(auth);

// Room-scoped list + create
router.get('/rooms/:roomId/payments',  c.listByRoom);
router.post('/rooms/:roomId/payments', c.create);

// Delete by payment ID
router.delete('/:id', c.remove);

module.exports = router;
