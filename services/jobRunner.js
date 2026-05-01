const { executePipeline } = require('./pipelineManager');

async function runJob(job) {
    try {
        console.log(`[Worker] bullmq started job ${job.id}`);
        await executePipeline(job);
        console.log(`[Worker] bullmq completed job ${job.id}`);
    } catch (err) {
        console.error(`[Worker] Job ${job.id} failed:`, err.message);
        job.status = "FAILED";
        throw err; // Crucial for BullMQ retry / DLQ logic
    }
}

module.exports = { runJob };