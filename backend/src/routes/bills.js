const express = require('express');
const router = express.Router();
const c = require('../controllers/billsController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.patch('/:id', c.update);
router.delete('/:id', c.remove);

module.exports = router;
