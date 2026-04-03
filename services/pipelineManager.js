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

      // Conditions for failure: Explicit shouldFail, or a 10% chance of random failure
      const simulatedFailure = Math.random() < 0.1;

      // Actually, let's fail halfway through if shouldFail is true, so we can see the Dashboard reflect partial success
      const failOnThisStage = (job.shouldFail && i === Math.floor(job.stages.length / 2)) || simulatedFailure;

      if (failOnThisStage) {
        stage.status = "FAILED";
        stage.endTime = new Date().toISOString();
        broadcastJobUpdate(job, 'stage_failed', stage.name);
        emitLog(`ERROR: Stage '${stage.name}' failed unexpectedly!`);
        failed = true;
        break;
      } else {
        stage.status = "SUCCESS";
        stage.endTime = new Date().toISOString();
        broadcastJobUpdate(job, 'stage_completed', stage.name);
        emitLog(`Stage '${stage.name}' completed successfully.`);
      }
    }

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
