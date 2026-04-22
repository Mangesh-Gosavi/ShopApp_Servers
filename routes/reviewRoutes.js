const express = require('express');
const router = express.Router();
const { getReviews, addReview, deleteReview } = require('../controllers/reviewController');
const authenticateToken = require('../middleware/authenticateToken');

router.post('/reviews', authenticateToken, getReviews);
router.post('/addreviews', authenticateToken, addReview);
router.post('/deletereview', authenticateToken, deleteReview);

module.exports = router;
