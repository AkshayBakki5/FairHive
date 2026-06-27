const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const registerValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('displayName').optional().trim(),
];
const loginValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

router.post('/register', registerValidators, authController.register);
router.post('/login', loginValidators, authController.login);
router.get('/me', auth, authController.me);
router.patch('/profile', auth, authController.updateProfile);
router.patch('/password', auth, authController.changePassword);

module.exports = router;
