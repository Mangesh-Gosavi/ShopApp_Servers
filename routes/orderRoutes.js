const express = require('express');
const router = express.Router();
const { placeOrder, getUserOrders } = require('../controllers/orderController');
const authenticateToken = require('../middleware/authenticateToken');

router.post('/orderitem', authenticateToken, placeOrder);
router.get('/userorder', authenticateToken, getUserOrders);

module.exports = router;
