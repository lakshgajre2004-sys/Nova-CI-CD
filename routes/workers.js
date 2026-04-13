const express = require('express');
const router = express.Router();
const { workers } = require('../services/workerManager');

router.get('/status', (req, res) => {
  const now = Date.now();
  res.json({
    workers: workers.map(w => {
      const idleDuration = w.status === 'IDLE' ? Math.floor((now - w.lastActiveTime) / 1000) : 0;
      return {
        id: w.id,
        type: w.type,
        status: w.status,
        jobId: w.currentJobId,
        lastActiveTime: w.lastActiveTime,
        idleDuration
      };
    })
  });
});

module.exports = router;
