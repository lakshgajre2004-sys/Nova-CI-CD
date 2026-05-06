const express = require('express');

const router = express.Router();

const {
    triggerJob,
    getDashboard,
    getJob,
    getJobLogs,
    getJobStages,
    retryJob,
    getFailedJobs,
    cancelJob
} = require('../services/jobController');


// ===============================
// DASHBOARD
// ===============================

// Retrieve Nova CI dashboard
router.get('/dashboard', getDashboard);


// ===============================
// FAILED PIPELINES
// ===============================

// Get failed jobs (DLQ)
router.get('/failed', getFailedJobs);


// ===============================
// WORKER ANALYTICS
// ===============================

router.get('/workers', async (req, res) => {

    try {

        const workers = [
            {
                id: 'worker-1',
                name: 'Nova Worker 1',
                specialization: 'general',
                status: 'idle',
                load: 12,
                uptime: '2h 14m'
            },

            {
                id: 'worker-2',
                name: 'Nova Worker 2',
                specialization: 'docker',
                status: 'active',
                load: 64,
                uptime: '5h 41m'
            },

            {
                id: 'worker-3',
                name: 'Nova Worker 3',
                specialization: 'pipeline',
                status: 'active',
                load: 38,
                uptime: '1h 02m'
            }
        ];

        return res.json(workers);

    } catch (err) {

        console.error('Failed to fetch workers:', err);

        return res.status(500).json({
            error: 'Failed to fetch workers'
        });
    }
});


// ===============================
// TRIGGER PIPELINE
// ===============================

// Trigger new pipeline
router.post('/trigger', triggerJob);


// ===============================
// JOB DETAILS
// ===============================

// Get specific job details
router.get('/:id', getJob);


// ===============================
// JOB STAGES
// ===============================

// Get pipeline stages
router.get('/:id/stages', getJobStages);


// ===============================
// JOB LOGS
// ===============================

// Get pipeline logs
router.get('/:id/logs', getJobLogs);


// ===============================
// RETRY PIPELINE
// ===============================

// Retry failed pipeline
router.post('/:id/retry', retryJob);


// ===============================
// CANCEL PIPELINE
// ===============================

// Cancel running pipeline
router.post('/:id/cancel', cancelJob);


module.exports = router;