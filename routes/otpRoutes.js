const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, newPassword } = require('../controllers/otpController');

router.post('/sendotp', sendOtp);
router.post('/verifyotp', verifyOtp);
router.post('/newpassword', newPassword);

module.exports = router;
