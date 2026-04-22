const express = require('express');
const router = express.Router();
const { getCart, addProduct, removeProduct } = require('../controllers/cartController');
const authenticateToken = require('../middleware/authenticateToken');

router.get('/cart', authenticateToken, getCart);
router.post('/addproduct', authenticateToken, addProduct);
router.post('/removeproduct', authenticateToken, removeProduct);

module.exports = router;
