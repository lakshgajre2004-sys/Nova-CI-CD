const { v4: uuidv4 } = require('uuid');
const store = require('../models/JobStore');
const { parseStages } = require('../services/jenkinsfileParser');
const { addJob } = require('../services/queue');
const { broadcastJobUpdate } = require('../websocket/socket');

/* =========================
   PRIORITY LOGIC
========================= */

function getPriority(branch) {
  if (branch === 'main') return 1;
  if (branch === 'dev') return 2;
  return 3;
}

/* =========================
   TRIGGER JOB
========================= */

function triggerJob(req, res) {
  const { repo, branch, shouldFail } = req.body;

  if (!repo || !branch) {
    return res.status(400).json({ error: "Missing repo and/or branch" });
  }

  const allJobs = store.getAllJobs();

  // prevent duplicate running jobs
  const isDuplicate = allJobs.some(
    j =>
      (j.status === 'QUEUED' || j.status === 'IN_PROGRESS') &&
      j.repo === repo &&
      j.branch === branch
  );

  if (isDuplicate) {
    console.log(`[Scheduler] Duplicate job skipped: ${repo} (${branch})`);
    return res.status(409).json({
      message: "Duplicate job skipped",
      status: "SKIPPED"
    });
  }

  const job = {
    id: uuidv4(),
    repo,
    branch,
    priority: getPriority(branch),
    status: "QUEUED",
    currentStage: null,
    stages: parseStages(repo, branch),
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    shouldFail: Boolean(shouldFail),
    logs: []
  };

  // store job
  store.addJob(job);

  // simulate arrival delay
  const delay = Math.random() * 2000;

  setTimeout(() => {
    addJob(job); // ✅ NEW QUEUE SYSTEM

    broadcastJobUpdate(job, 'job_queued');

    console.log(`[JobController] Job queued: ${job.id}`);

  }, delay);

  return res.status(202).json({
    message: "Job triggered successfully",
    jobId: job.id,
    status: job.status
  });
}

/* =========================
   DASHBOARD API
========================= */

function getDashboard(req, res) {
  const allJobs = store.getAllJobs();

  const dashboard = {
    queued: [],
    inProgress: [],
    completed: []
  };

  for (let job of allJobs) {
    const { shouldFail, priority, ...publicJob } = job;

    if (publicJob.status === "QUEUED") {
      dashboard.queued.push(publicJob);
    } else if (publicJob.status === "IN_PROGRESS") {
      dashboard.inProgress.push(publicJob);
    } else if (
      publicJob.status === "COMPLETED" ||
      publicJob.status === "FAILED"
    ) {
      dashboard.completed.push(publicJob);
    }
  }

  dashboard.queued.sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  dashboard.inProgress.sort(
    (a, b) => new Date(a.startedAt) - new Date(b.startedAt)
  );

  dashboard.completed.sort(
    (a, b) => new Date(b.completedAt) - new Date(a.completedAt)
  );

  return res.json(dashboard);
}

module.exports = {
  triggerJob,
  getDashboard
};