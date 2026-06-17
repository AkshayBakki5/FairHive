const express = require('express');
const router = express.Router();
const invitesController = require('../controllers/invitesController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.post('/accept', invitesController.acceptInvite);

module.exports = router;
