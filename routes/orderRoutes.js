const express = require('express');
const router = express.Router();
const { placeOrder, getUserOrders, downloadInvoice } = require('../controllers/orderController');
const authenticateToken = require('../middleware/authenticateToken');

router.post('/orderitem', authenticateToken, placeOrder);
router.get('/userorder', authenticateToken, getUserOrders);
router.get('/invoice/:orderid', authenticateToken, downloadInvoice);

module.exports = router;
