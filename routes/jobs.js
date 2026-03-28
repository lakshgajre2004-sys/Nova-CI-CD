const express = require('express');
const router = express.Router();
const { triggerJob, getDashboard } = require('../controllers/jobController');

// Trigger a new job
router.post('/trigger', triggerJob);

// Retrieve Jenkins Controller job dashboard
router.get('/dashboard', getDashboard);

module.exports = router;
