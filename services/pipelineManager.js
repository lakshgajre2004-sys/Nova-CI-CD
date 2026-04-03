const { broadcastJobUpdate, getIO } = require('../websocket/socket');

const STAGE_DELAY_MS = 3000; // Simulate 3 seconds per stage

async function executePipeline(job) {
  return new Promise(async (resolve) => {

    const emitLog = (msg) => {
      const logStr = `[Job ${job.id.split('-')[0]}] ${msg}`;
      if (!job.logs) job.logs = [];
      job.logs.push(logStr);

      try {
        const io = getIO();
        io.to(job.id).emit("job_log", { jobId: job.id, log: logStr });
      } catch (err) {
        console.error("Failed to emit log", err);
      }
    };

    // Start job
    job.status = "IN_PROGRESS";
    job.startedAt = new Date().toISOString();
    broadcastJobUpdate(job, 'job_started');
    emitLog("Pipeline execution started");

    if (!job.stages || job.stages.length === 0) {
      job.status = "FAILED";
      job.completedAt = new Date().toISOString();
      emitLog("Pipeline failed: No stages defined");
      return resolve();
    }

    let failed = false;

    // ✅ FIX: Decide ONCE per job (not per stage)
    const jobWillFail = Math.random() < 0.02;

    for (let i = 0; i < job.stages.length; i++) {
      const stage = job.stages[i];

      job.currentStage = stage.name;
      stage.status = "RUNNING";
      stage.startTime = new Date().toISOString();

      broadcastJobUpdate(job, 'stage_started', stage.name);
      emitLog(`Stage '${stage.name}' started...`);
      emitLog(`Running steps for '${stage.name}'`);

      // Simulate execution delay
      await new Promise(r => setTimeout(r, STAGE_DELAY_MS));

      // ✅ FIX: Fail only at ONE stage (mid pipeline)
      const failOnThisStage =
        (job.shouldFail && i === Math.floor(job.stages.length / 2)) ||
        (jobWillFail && i === Math.floor(job.stages.length / 2));

      if (failOnThisStage) {
        stage.status = "FAILED";
        stage.endTime = new Date().toISOString();

        broadcastJobUpdate(job, 'stage_failed', stage.name);
        emitLog(`ERROR: Stage '${stage.name}' failed unexpectedly!`);

        failed = true;
        break;
      }

      // Success case
      stage.status = "SUCCESS";
      stage.endTime = new Date().toISOString();

      broadcastJobUpdate(job, 'stage_completed', stage.name);
      emitLog(`Stage '${stage.name}' completed successfully.`);
    }

    // Final job status
    job.status = failed ? "FAILED" : "COMPLETED";
    job.completedAt = new Date().toISOString();
    job.currentStage = null;

    if (failed) {
      emitLog("Pipeline finished with status: FAILED");
    } else {
      emitLog("Pipeline finished with status: SUCCESS");
    }

    broadcastJobUpdate(job, failed ? 'job_failed' : 'job_completed');

    resolve();
  });
}

module.exports = { executePipeline };