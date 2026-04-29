const { getNextJob, hasJobs, addJob } = require('./queue');
const { getAvailableWorker, assignWorker } = require('./workerManager');
const { runJob } = require('./jobRunner');

let isRunning = false;

function startScheduler() {
  setInterval(async () => {

    // 🔒 Prevent overlapping scheduler loops
    if (isRunning) return;
    isRunning = true;

    try {
      if (!hasJobs()) return;

      const job = getNextJob();

      if (!job) return;

      const worker = getAvailableWorker(job);

      // ❗ FIX: put job back if no worker
      if (!worker) {
        console.log("[Scheduler] No free worker → re-queueing job");

        addJob(job); // ✅ important fix
        return;
      }

      console.log(`[Scheduler] Assigning ${job.id} → ${worker.id}`);

      assignWorker(worker, job);

      // 🚀 Run async (parallel)
      runJob(job)
        .catch(err => {
          console.error(`[Scheduler] Job failed: ${err.message}`);
        })
        .finally(() => {
          console.log(`[Scheduler] Worker ${worker.id} freed`);
        });

    } catch (err) {
      console.error("[Scheduler ERROR]:", err.message);
    } finally {
      isRunning = false;
    }

  }, 2000);
}

module.exports = { startScheduler };