const express = require('express');
const router = express.Router();
const { workers } = require('../services/workerManager');

router.get('/status', (req, res) => {
  res.json({
    workers: workers.map(w => ({
      id: w.id,
      type: w.type,
      status: w.status,
      jobId: w.currentJobId
    }))
  });
});

module.exports = router;
