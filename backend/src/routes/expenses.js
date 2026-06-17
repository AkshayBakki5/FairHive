const express = require('express');
const router = express.Router();
const expensesController = require('../controllers/expensesController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.patch('/:id/splits/:userId/paid', expensesController.markSplitPaid);

module.exports = router;
