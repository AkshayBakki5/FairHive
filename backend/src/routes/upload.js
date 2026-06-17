const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { auth } = require('../middleware/auth');

router.use(auth);
router.post('/', uploadController.upload);

module.exports = router;
