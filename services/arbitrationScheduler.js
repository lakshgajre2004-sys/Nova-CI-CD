const { jobQueue } = require('../queue/redisQueue');
const { determineWorkerType, getQueueForType } = require('./workerRouter');
const logger = require('../config/logger');

let pendingJobs = [];
let intervalId = null;

function addPendingJob(jobData, options, priorityInfo) {
  pendingJobs.push({
    jobData,
    options,
    priorityInfo,
    addedAt: Date.now()
  });
  logger.info(`[Arbitration] Job ${jobData.id} buffered. Priority Score: ${priorityInfo.score}`);
}

function startArbitrationScheduler() {
  if (intervalId) return;

  logger.info("🧠 Arbitration Scheduler started. Arbitration interval: 10 seconds.");

  intervalId = setInterval(async () => {
    if (pendingJobs.length === 0) return;

    // Sort pending jobs using BullMQ priority semantics
    // smaller bullmqPriority number = higher execution priority
    pendingJobs.sort((a, b) => {
      if (a.priorityInfo.bullmqPriority === b.priorityInfo.bullmqPriority) {
        return a.addedAt - b.addedAt; // maintain FIFO for equal priority
      }
      return a.priorityInfo.bullmqPriority - b.priorityInfo.bullmqPriority;
    });

    const jobsToSchedule = [...pendingJobs];
    pendingJobs = []; // clear buffer

    for (const item of jobsToSchedule) {
      try {
        const workerType = determineWorkerType(item.jobData);
        const queue = getQueueForType(workerType);
        await queue.add(
          'execute-pipeline',
          item.jobData,
          {
            ...item.options,
            priority: item.priorityInfo.bullmqPriority // Set BullMQ priority to maintain queue correctness
          }
        );
        logger.info(`[Arbitration] Scheduled Job ${item.jobData.id} to ${workerType} queue with BullMQ Priority: ${item.priorityInfo.bullmqPriority}`);
      } catch (err) {
        logger.error(`[Arbitration] Failed to schedule job ${item.jobData.id}`, err);
      }
    }

  }, 1000); // Every 10 seconds
}

module.exports = {
  addPendingJob,
  startArbitrationScheduler,
  getPendingJobs: () => pendingJobs
};
