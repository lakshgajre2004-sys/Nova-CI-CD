const express = require('express');
const router = express.Router();
const { triggerJob, getDashboard, getJob, getJobLogs, getJobStages, retryJob, getFailedJobs, cancelJob } = require('../services/jobController');

// Retrieve Jenkins Controller job dashboard
router.get('/dashboard', getDashboard);

// Get failed jobs (DLQ)
router.get('/failed', getFailedJobs);

// Trigger a new job
router.post('/trigger', triggerJob);

// Retrieve Jenkins Controller job dashboard
router.get('/dashboard', getDashboard);

// Get specific job details
router.get('/:id', getJob);

// Get specific job stages
router.get('/:id/stages', getJobStages);

// Get specific job logs
router.get('/:id/logs', getJobLogs);

// Retry failed job
router.post('/:id/retry', retryJob);

// Cancel job
router.post('/:id/cancel', cancelJob);

module.exports = router;
