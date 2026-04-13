const express = require('express');
const router = express.Router();
const { triggerJob } = require('../controllers/jobController');

router.post('/github', (req, res) => {
  try {
    const event = req.headers['x-github-event'];

    // ✅ Handle GitHub ping event FIRST
    if (event === 'ping') {
      console.log('[Webhook] Ping received');
      return res.status(200).json({ message: 'pong' });
    }

    // Ignore all non-push events
    if (event !== 'push') {
      return res.status(200).json({ message: "Ignored non-push event" });
    }

    const payload = req.body;

    // ✅ Validate ONLY for push events
    if (!payload || !payload.repository || !payload.ref) {
      return res.status(400).json({ message: "Invalid webhook payload" });
    }

    const repo = payload.repository.full_name;
    const branch = payload.ref.split('/').pop();

    console.log('[Webhook] Received push event');
    console.log(`[Webhook] Triggered job for ${repo} (${branch})`);

    // Mock req/res to reuse existing controller
    const mockReq = { body: { repo, branch } };
    const mockRes = {
      status: function () { return this; },
      json: function () { return this; }
    };

    triggerJob(mockReq, mockRes);

    return res.status(200).json({ message: "Webhook processed successfully" });

  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;