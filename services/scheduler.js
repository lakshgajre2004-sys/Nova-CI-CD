const store = require('../models/JobStore');
const { executePipeline } = require('./pipelineManager');

const workerManager = require('./workerManager');

function schedule() {
  // C. Optional Load Behavior: Simulated system load if queue is long
  const loadDelay = store.queue.length > 5 ? 500 : 0;
  
  if (loadDelay > 0) {
    setTimeout(runSchedule, loadDelay);
  } else {
    runSchedule();
  }
}

function runSchedule() {
  const jobId = store.dequeue();
  if (!jobId) return; // Queue is empty

  const job = store.getJob(jobId);
  if (!job || job.status !== 'QUEUED') {
    return schedule(); // Drop invalid jobs and retry
  }

  const worker = workerManager.getAvailableWorker(job);
  if (worker) {
    // Reserve worker immediately
    workerManager.assignWorker(worker, job);
    console.log(`[Scheduler] Job ${job.id} assigned to ${worker.id}`);
    
    // B. Worker Assignment Delay
    const assignmentDelay = Math.random() * 1000;
    setTimeout(() => {
      console.log(`[Worker] ${worker.id} started job ${job.id}`);
      executePipeline(job)
        .then(() => {
          console.log(`[Worker] ${worker.id} completed job ${job.id}`);
          workerManager.releaseWorker(worker);
          schedule();
        })
        .catch((err) => {
          console.error('Job pipeline error:', err);
          console.log(`[Worker] ${worker.id} completed job ${job.id}`);
          workerManager.releaseWorker(worker);
          schedule();
        });
    }, assignmentDelay);

    // Attempt to fill remaining concurrency slots
    schedule();
  } else {
    // If no matching worker is available -> keep job in queue
    store.enqueue(jobId);
    // Retry later
    setTimeout(schedule, 2000);
  }
}

module.exports = { schedule };
