const prisma = require('../db/index');
const { jobQueue } = require('../queue/redisQueue');
const { addPendingJob } = require('./arbitrationScheduler');

const DEFAULT_JOB_OPTIONS = {
  attempts: 1,
  backoff: { type: 'exponential', delay: 2000 }
};

/* =========================
   ADD JOB
========================= */
async function addJob(job) {
  const { calculatePriority } = require('./priority');
  const priorityInfo = calculatePriority(job);

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
      projectId: job.projectId,
      priority: priorityInfo.score,
      priorityReason: priorityInfo.reason
    }
  });

  addPendingJob(
    {
      ...job,
      priorityScore: priorityInfo.score,
      priorityReason: priorityInfo.reason
    },
    {
      jobId: job.id,
      ...DEFAULT_JOB_OPTIONS
    },
    priorityInfo
  );
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
      const { calculatePriority } = require('./priority');
      const priorityInfo = calculatePriority(job);
      addPendingJob(
        {
          ...job,
          priorityScore: priorityInfo.score,
          priorityReason: priorityInfo.reason
        },
        {
          jobId: job.id,
          ...DEFAULT_JOB_OPTIONS
        },
        priorityInfo
      );
    }
  }
}

/* =========================
   REQUEUE JOB
========================= */
async function requeueJob(job) {
  const { calculatePriority } = require('./priority');
  const priorityInfo = calculatePriority({ ...job, isRetry: true }); // Boost priority for retries

  addPendingJob(
    {
      ...job,
      priorityScore: priorityInfo.score,
      priorityReason: priorityInfo.reason
    },
    {
      jobId: job.id,
      ...DEFAULT_JOB_OPTIONS
    },
    priorityInfo
  );
}

module.exports = {
  addJob,
  initQueue,
  requeueJob
};