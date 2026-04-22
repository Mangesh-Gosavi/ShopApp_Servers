const express = require('express');
const router = express.Router();
const { getAllProducts, getSingleProduct } = require('../controllers/productController');
const authenticateToken = require('../middleware/authenticateToken');

router.get('/allproducts', getAllProducts);
router.get('/product/:id', authenticateToken, getSingleProduct);

module.exports = router;
