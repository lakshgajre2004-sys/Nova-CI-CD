const uuidv4 = require('uuid').v4;
const store = require('../models/JobStore');
const { parseStages } = require('../services/jenkinsfileParser');
const { schedule } = require('../services/scheduler');
const { broadcastJobUpdate } = require('../websocket/socket');

function getPriority(branch) {
  if (branch === 'main') return 1;
  if (branch === 'dev') return 2;
  return 3;
}

function triggerJob(req, res) {
  const { repo, branch, shouldFail } = req.body;

  if (!repo || !branch) {
    return res.status(400).json({ error: "Missing repo and/or branch" });
  }

  // Prevent duplicate execution for same repo and branch
  const allJobs = store.getAllJobs();
  const isDuplicate = allJobs.some(j => (j.status === 'QUEUED' || j.status === 'IN_PROGRESS') && j.repo === repo && j.branch === branch);

  if (isDuplicate) {
    console.log(`[Scheduler] Job trigger skipped. Duplicate job already running for repo: ${repo}, branch: ${branch}`);
    return res.status(409).json({ message: "Duplicate job skipped", status: "SKIPPED" });
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
    shouldFail: Boolean(shouldFail), // Optional flag to simulate failure
    logs: [] // array of strings
  };

  store.addJob(job);

  // A. Job Arrival Delay (0-2 seconds) before adding to queue
  const arrivalDelay = Math.random() * 2000;
  setTimeout(() => {
    store.enqueue(job.id);
    broadcastJobUpdate(job, 'job_queued');

    // Kickstart the scheduler checking
    schedule();
  }, arrivalDelay);

  return res.status(202).json({
    message: "Job triggered correctly",
    jobId: job.id,
    status: job.status
  });
}

function getDashboard(req, res) {
  const allJobs = store.getAllJobs();

  const dashboard = {
    queued: [],
    inProgress: [],
    completed: []
  };

  for (let job of allJobs) {
    // Strip internal properties like `shouldFail` and `priority` before sending to the client
    const { shouldFail, priority, ...publicJob } = job;

    if (publicJob.status === "QUEUED") {
      dashboard.queued.push(publicJob);
    } else if (publicJob.status === "IN_PROGRESS") {
      dashboard.inProgress.push(publicJob);
    } else if (publicJob.status === "COMPLETED" || publicJob.status === "FAILED") {
      dashboard.completed.push(publicJob);
    }
  }

  // Sort jobs for better UX: queued by oldness, inProgress by start time, completed by completion time descending
  dashboard.queued.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  dashboard.inProgress.sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
  dashboard.completed.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  return res.json(dashboard);
}

module.exports = {
  triggerJob,
  getDashboard
};
