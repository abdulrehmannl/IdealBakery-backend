const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/dashboardController');

// All dashboard routes are admin only
router.get('/stats', protect, adminOnly, getDashboardStats);

module.exports = router;
