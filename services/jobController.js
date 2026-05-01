const { v4: uuidv4 } = require('uuid');
const prisma = require('../db/index');

const { addJob } = require('../services/queue');
const { broadcastJobUpdate } = require('../websocket/socket');

/* =========================
   RESOLVE PROJECT
========================= */
async function resolveProject(repoUrl) {
  let project = await prisma.project.findUnique({ where: { repoUrl } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: repoUrl.split('/').pop().replace('.git', ''),
        repoUrl,
        defaultBranch: 'main'
      }
    });
  }
  return project;
}

/* =========================
   TRIGGER JOB
========================= */

async function triggerJob(req, res) {
  try {
    const { repo, branch, commit = "HEAD" } = req.body;

    if (!repo || !branch) {
      return res.status(400).json({ error: "Missing repo and/or branch" });
    }

    // prevent duplicate running jobs
    const isDuplicate = await prisma.job.findFirst({
      where: {
        repo,
        branch,
        status: { in: ['QUEUED', 'IN_PROGRESS'] }
      }
    });

    if (isDuplicate) {
      console.log(`[Scheduler] Duplicate job skipped: ${repo} (${branch})`);
      return res.status(409).json({
        message: "Duplicate job skipped",
        status: "SKIPPED"
      });
    }

    const project = await resolveProject(repo);

    const job = {
      id: uuidv4(),
      repo,
      branch,
      commit,
      status: "QUEUED",
      createdAt: new Date(),
      source: "api",
      projectId: project.id
    };

    // addJob handles prisma insertion + queuing
    await addJob(job);

    broadcastJobUpdate(job, 'job_queued');
    console.log(`[JobController] Job queued: ${job.id}`);

    return res.status(202).json({
      message: "Job triggered successfully",
      jobId: job.id,
      status: job.status
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to trigger job" });
  }
}

/* =========================
   DASHBOARD API
========================= */

async function getDashboard(req, res) {
  try {
    const allJobs = await prisma.job.findMany({
      include: { stages: true }
    });

    const dashboard = {
      queued: [],
      inProgress: [],
      completed: []
    };

    for (let job of allJobs) {
      if (job.status === "QUEUED") {
        dashboard.queued.push(job);
      } else if (job.status === "IN_PROGRESS") {
        dashboard.inProgress.push(job);
      } else if (
        job.status === "COMPLETED" ||
        job.status === "FAILED"
      ) {
        dashboard.completed.push(job);
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
}

/* =========================
   GET JOB DETAILS
========================= */

async function getJob(req, res) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { stages: true }
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch job" });
  }
}

/* =========================
   GET JOB LOGS
========================= */

async function getJobLogs(req, res) {
  try {
    const logs = await prisma.executionLog.findMany({
      where: { jobId: req.params.id },
      orderBy: { timestamp: 'asc' }
    });

    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch job logs" });
  }
}

/* =========================
   RETRY FAILED JOB
========================= */

async function retryJob(req, res) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id }
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.status !== "FAILED") {
      return res.status(400).json({ error: "Only FAILED jobs can be retried" });
    }

    // Reset status and queue
    job.status = "QUEUED";
    job.startedAt = null;
    job.completedAt = null;
    
    // Clear stages and logs in DB
    await prisma.stage.deleteMany({ where: { jobId: job.id } });
    await prisma.executionLog.deleteMany({ where: { jobId: job.id } });

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "QUEUED",
        startedAt: null,
        completedAt: null
      }
    });

    const { requeueJob } = require('../services/queue');
    
    job.stages = [];
    job.logs = [];
    requeueJob(job);
    
    broadcastJobUpdate(job, 'job_queued');
    console.log(`[JobController] Job retried and queued: ${job.id}`);

    return res.status(202).json({
      message: "Job retry triggered successfully",
      jobId: job.id,
      status: job.status
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retry job" });
  }
}

/* =========================
   GET JOB STAGES
========================= */

async function getJobStages(req, res) {
  try {
    const stages = await prisma.stage.findMany({
      where: { jobId: req.params.id },
      orderBy: { id: 'asc' }
    });

    res.json(stages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch job stages" });
  }
}

/* =========================
   GET FAILED JOBS (DLQ)
========================= */

async function getFailedJobs(req, res) {
  try {
    const jobs = await prisma.job.findMany({
      where: { status: 'FAILED' },
      orderBy: { completedAt: 'desc' }
    });
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch failed jobs" });
  }
}

/* =========================
   CANCEL JOB
========================= */

async function cancelJob(req, res) {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (job.status === "COMPLETED" || job.status === "FAILED" || job.status === "CANCELLED") {
      return res.status(400).json({ error: "Job is already finished" });
    }

    await prisma.job.update({
      where: { id: job.id },
      data: { status: "CANCELLED", failureReason: "Cancelled by user" }
    });

    // Mark pending or running stages as cancelled
    await prisma.stage.updateMany({
      where: { jobId: job.id, status: { in: ['PENDING', 'RUNNING'] } },
      data: { status: 'CANCELLED' }
    });

    // If running in docker, we kill the container. 
    // This requires dockerRunner to stop the container by its name (jobId).
    const { exec } = require('child_process');
    exec(`docker rm -f nova-job-${job.id}`, (err) => {
      if (err) console.error(`Failed to kill docker container for cancelled job ${job.id}:`, err.message);
    });

    // We also might want to remove it from BullMQ queue if it's waiting
    const { jobQueue } = require('../queue/redisQueue');
    const bullJob = await jobQueue.getJob(job.id);
    if (bullJob) {
      // bullmq remove won't work easily if job is active without token, but remove() tries.
      await bullJob.remove().catch(() => {});
    }

    broadcastJobUpdate(job, 'job_cancelled');

    res.json({ message: "Job cancelled successfully", jobId: job.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to cancel job" });
  }
}

module.exports = {
  triggerJob,
  getDashboard,
  getJob,
  getJobLogs,
  getJobStages,
  retryJob,
  getFailedJobs,
  cancelJob
};