const express = require('express');
const router = express.Router();
const c = require('../controllers/choresController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.patch('/:id', c.update);
router.delete('/:id', c.remove);
router.patch('/:id/assignments', c.completeOrAssign);

module.exports = router;
