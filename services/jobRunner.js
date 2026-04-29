const { executePipeline } = require('./pipelineManager');
const { releaseWorker, workers } = require('./workerManager');

async function runJob(job) {
    try {
        console.log(`[Worker] ${job.workerId} started job ${job.id}`);

        await executePipeline(job);

        console.log(`[Worker] ${job.workerId} completed job ${job.id}`);
    } catch (err) {
        console.error(`[Worker] Job ${job.id} failed:`, err.message);
        job.status = "FAILED";
    } finally {
        // 🔥 Release worker safely
        const worker = workers.find(w => w.id === job.workerId);
        releaseWorker(worker);
    }
}

module.exports = { runJob };