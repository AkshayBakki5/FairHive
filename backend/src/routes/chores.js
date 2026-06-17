const express = require('express');
const router = express.Router();
const choresController = require('../controllers/choresController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.patch('/:id/assignments', choresController.completeOrAssign);

module.exports = router;
