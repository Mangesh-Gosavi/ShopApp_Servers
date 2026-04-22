const express = require('express');
const router = express.Router();
const { login, signup, getProfile, logout } = require('../controllers/authController');
const authenticateToken = require('../middleware/authenticateToken');

router.get('/login', login);
router.post('/signup', signup);
router.get('/profile', authenticateToken, getProfile);
router.get('/logout', authenticateToken, logout);

module.exports = router;
