const express = require('express');
const router = express.Router();
const billsController = require('../controllers/billsController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.patch('/:id', billsController.update);

module.exports = router;
