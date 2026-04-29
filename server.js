const express = require('express');
const cors = require('cors');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

// Routes
const jobRoutes = require('./routes/jobs');
const workerRoutes = require('./routes/workers');

// Services
const { addJob } = require('./services/queue');
const { startScheduler } = require('./services/scheduler');

// WebSocket
const { init } = require('./websocket/socket');

const app = express();
const server = http.createServer(app);

const PORT = 4000;

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());
app.use(express.json({ limit: '5mb' }));

/* =========================
   ROUTES
========================= */

// Job APIs (UI uses this)
app.use('/api/jobs', jobRoutes);

// Worker APIs
app.use('/api/workers', workerRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('✅ Jenkins Master Backend Running');
});

/* =========================
   GITHUB WEBHOOK
========================= */

app.post('/webhook/github', (req, res) => {
  try {
    console.log("📩 Webhook received");

    // 🔍 Support multiple payload formats
    const repo =
      req.body?.repository?.clone_url ||
      req.body?.repository?.git_url ||
      req.body?.repo;

    if (!repo) {
      console.log("❌ Invalid webhook payload:", req.body);
      return res.status(400).send("Invalid payload");
    }

    const job = {
      id: uuidv4(),
      repo,
      status: "QUEUED",
      createdAt: new Date(),
      source: "github"
    };

    addJob(job);

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

server.listen(PORT, () => {
  console.log(`🚀 Jenkins Master running on port ${PORT}`);

  // start scheduler AFTER server is ready
  startScheduler();

  console.log("🧠 Scheduler started");
});

//https://github.com/lakshgajre2004-sys/Nova-CI-CD.git