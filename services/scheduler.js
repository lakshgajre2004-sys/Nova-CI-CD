const { Worker } = require('bullmq');
const { connection } = require('../queue/redisQueue');
const { runJob } = require('./jobRunner');

let workerInstance = null;

function startScheduler() {
  workerInstance = new Worker('nova-ci-jobs', async (jobEvent) => {
    const jobData = jobEvent.data;
    console.log(`[Scheduler] Picked up job ${jobData.id} from Redis`);


    try {
      await runJob(jobData);
    } catch (err) {
      console.error(`[Scheduler] Job execution failed: ${err.message}`);
      throw err;
    }
  }, {
    connection,
    concurrency: 1 // Allow 1 concurrent jobs per server instance
  });

  workerInstance.on('completed', (job) => {
    console.log(`[Scheduler] Job ${job.id} has completed!`);
  });

  workerInstance.on('failed', (job, err) => {
    console.error(`[Scheduler] Job ${job.id} has failed with ${err.message}`);
  });

  console.log("🧠 Redis-backed Scheduler started");
}

function startCleanupJob() {
  const { exec } = require('child_process');
  // Run cleanup every hour
  setInterval(() => {
    console.log("[Cleanup] Running container cleanup...");
    // Force remove containers matching nova-job- that exited or are orphaned
    exec(`docker ps -a --filter "name=nova-job-" --filter "status=exited" --format "{{.ID}}"`, (err, stdout) => {
      if (err) return console.error("[Cleanup] Failed to list containers:", err.message);

      const containers = stdout.trim().split('\n').filter(Boolean);
      if (containers.length > 0) {
        exec(`docker rm -f ${containers.join(' ')}`, (rmErr) => {
          if (rmErr) console.error("[Cleanup] Failed to clean containers:", rmErr.message);
        });
      }
    });
    // Remove dangling images
    exec(`docker image prune -f`, (err) => {
      if (err) console.error("[Cleanup] Failed to prune images:", err.message);
    });
  }, 3600000); // 1 hour
}

module.exports = { startScheduler, startCleanupJob };