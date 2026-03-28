const { broadcastJobUpdate } = require('../websocket/socket');

const STAGE_DELAY_MS = 3000; // Simulate 3 seconds per stage

async function executePipeline(job) {
  return new Promise(async (resolve) => {
    job.status = "IN_PROGRESS";
    job.startedAt = new Date().toISOString();
    broadcastJobUpdate(job, 'job_started');

    if (!job.stages || job.stages.length === 0) {
      job.status = "FAILED";
      job.completedAt = new Date().toISOString();
      return resolve();
    }

    let failed = false;

    for (let i = 0; i < job.stages.length; i++) {
      const stage = job.stages[i];

      job.currentStage = stage.name;
      stage.status = "RUNNING";
      stage.startTime = new Date().toISOString();
      broadcastJobUpdate(job, 'stage_started', stage.name);

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
        failed = true;
        break;
      } else {
        stage.status = "SUCCESS";
        stage.endTime = new Date().toISOString();
        broadcastJobUpdate(job, 'stage_completed', stage.name);
      }
    }

    job.status = failed ? "FAILED" : "COMPLETED";
    job.completedAt = new Date().toISOString();
    job.currentStage = null;

    broadcastJobUpdate(job, failed ? 'job_failed' : 'job_completed');

    resolve();
  });
}

module.exports = { executePipeline };
