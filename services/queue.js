const prisma = require('../db/index');
const { jobQueue } = require('../queue/redisQueue');

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
};

/* =========================
   ADD JOB
========================= */
async function addJob(job) {
  // Save job to database first
  await prisma.job.create({
    data: {
      id: job.id,
      repo: job.repo,
      branch: job.branch,
      commit: job.commit,
      status: job.status,
      source: job.source,
      createdAt: job.createdAt,
      projectId: job.projectId
    }
  });

  await jobQueue.add('execute-pipeline', job, { jobId: job.id, ...DEFAULT_JOB_OPTIONS });
}

/* =========================
   RESTORE QUEUE ON STARTUP
========================= */
async function initQueue() {
  // With BullMQ, jobs remain in Redis. But for DB consistency, we could re-enqueue QUEUED jobs if Redis is flushed.
  const queuedJobs = await prisma.job.findMany({
    where: { status: 'QUEUED' },
    orderBy: { createdAt: 'asc' }
  });
  
  for (const job of queuedJobs) {
    const jobState = await jobQueue.getJob(job.id);
    if (!jobState) {
      await jobQueue.add('execute-pipeline', job, { jobId: job.id, ...DEFAULT_JOB_OPTIONS });
    }
  }
}

/* =========================
   REQUEUE JOB
========================= */
async function requeueJob(job) {
  await jobQueue.add('execute-pipeline', job, { jobId: job.id, ...DEFAULT_JOB_OPTIONS });
}

module.exports = {
  addJob,
  initQueue,
  requeueJob
};