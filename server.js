const express = require('express');
const cors = require('cors');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('./config/logger');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');

// Routes
const jobRoutes = require('./routes/jobs');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');

// Services
const { addJob, initQueue } = require('./services/queue');
const { startScheduler, startCleanupJob } = require('./services/scheduler');
const { jobQueue } = require('./queue/redisQueue');

// WebSocket
const { init } = require('./websocket/socket');

const app = express();
const server = http.createServer(app);

const PORT = 4000;

/* =========================
   BULL BOARD INTEGRATION
========================= */
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(jobQueue)],
  serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());
app.use(express.json({ 
  limit: '5mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

/* =========================
   ROUTES
========================= */

// Job APIs (UI uses this)
app.use('/api/jobs', jobRoutes);

// Auth APIs
app.use('/api/auth', authRoutes);

// Project APIs
app.use('/api/projects', projectRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('✅ Jenkins Master Backend Running');
});

/* =========================
   GITHUB WEBHOOK
========================= */

app.post('/webhook/github', async (req, res) => {
  try {
    logger.info("📩 Webhook received");

    // Webhook Signature Verification
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (secret) {
      const signature = req.headers['x-hub-signature-256'];
      if (!signature) {
        logger.error("❌ Missing webhook signature");
        return res.status(401).send("Missing signature");
      }
      
      const hmac = crypto.createHmac('sha256', secret);
      const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');
      
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        logger.error("❌ Invalid webhook signature");
        return res.status(401).send("Invalid signature");
      }
    }

    const commits = req.body.commits || [];

    if (commits.some(c => c.message.includes("Nova Update"))) {
      return res.sendStatus(200);
    }

    // 🔍 Support multiple payload formats
    const repo =
      req.body?.repository?.clone_url ||
      req.body?.repository?.git_url ||
      req.body?.repo;

    const branch = req.body?.ref?.replace('refs/heads/', '') || "main";
    const commit = req.body?.head_commit?.id || "HEAD";

    if (!repo) {
      console.log("❌ Invalid webhook payload:", req.body);
      return res.status(400).send("Invalid payload");
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    let project = await prisma.project.findUnique({ where: { repoUrl: repo } });
    if (!project) {
      project = await prisma.project.create({
        data: {
          name: repo.split('/').pop().replace('.git', ''),
          repoUrl: repo,
          defaultBranch: 'main'
        }
      });
    }

    const job = {
      id: uuidv4(),
      repo,
      branch,
      commit,
      status: "QUEUED",
      createdAt: new Date(),
      source: "github",
      projectId: project.id
    };

    await addJob(job);

    console.log(`🚀 Job queued → ${repo}`);

    return res.sendStatus(200);

  } catch (err) {
    console.error("🔥 Webhook ERROR:", err.message);
    return res.sendStatus(500);
  }
});

/* =========================
   ERROR HANDLER (IMPORTANT)
========================= */

app.use((err, req, res, next) => {
  console.error("Global Error:", err.stack);
  res.status(500).send("Internal Server Error");
});

/* =========================
   SOCKET.IO INIT
========================= */

init(server);

/* =========================
   START SERVER + SCHEDULER
========================= */

server.listen(PORT, async () => {
  console.log(`🚀 Jenkins Master running on port ${PORT}`);

  await initQueue();
  
  // start scheduler AFTER server is ready
  startScheduler();
  startCleanupJob();

  logger.info("🧠 Scheduler & Cleanup Job started");
});

//https://github.com/lakshgajre2004-sys/Nova-CI-CD.git