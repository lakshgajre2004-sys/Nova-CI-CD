const { broadcastJobUpdate, getIO } = require('../websocket/socket');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const simpleGit = require('simple-git');
const { parseJenkinsfile } = require('./jenkinsfileParser');

const STAGE_DELAY_MS = 3000; // Simulate 3 seconds per stage

function runCommand(cmd, cwd, emitLog, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    emitLog(`[Execution] Running: ${cmd}`);
    const child = exec(cmd, { cwd, timeout: timeoutMs });

    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) emitLog(line.trim());
      });
    });

    child.stderr.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) emitLog(line.trim());
      });
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command '${cmd}' failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

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

    const repoDir = path.join(__dirname, '..', 'repos', job.id);
    let repoCloned = false;

    try {
      if (!fs.existsSync(path.join(__dirname, '..', 'repos'))) {
        fs.mkdirSync(path.join(__dirname, '..', 'repos'), { recursive: true });
      }
      emitLog("Cloning repository...");
      const git = simpleGit();
      await git.clone(job.repo, repoDir);
      emitLog("Repository cloned successfully");
      repoCloned = true;

      const dynamicStages = parseJenkinsfile(repoDir);
      if (dynamicStages && dynamicStages.length > 0) {
        emitLog("Parsed stages from Jenkinsfile");
        // Update stages dynamically, broadcasting the full pipeline change
        job.stages = dynamicStages;
        broadcastJobUpdate(job, 'pipeline_updated');
      }

    } catch (err) {
      emitLog(`Failed to clone repository: ${err.message}`);
      job.status = "FAILED";
      job.completedAt = new Date().toISOString();
      emitLog("Pipeline finished with status: FAILED");
      broadcastJobUpdate(job, 'job_failed');
      return resolve();
    }

    if (!job.stages || job.stages.length === 0) {
      job.status = "FAILED";
      job.completedAt = new Date().toISOString();
      emitLog("Pipeline failed: No stages defined");
      broadcastJobUpdate(job, 'job_failed');
      return resolve();
    }

    let failed = false;

    // Simulate explicit shouldFail setting
    const jobWillFail = Math.random() < 0.02;

    for (let i = 0; i < job.stages.length; i++) {
      const stage = job.stages[i];

      job.currentStage = stage.name;
      stage.status = "RUNNING";
      stage.startTime = new Date().toISOString();

      broadcastJobUpdate(job, 'stage_started', stage.name);
      emitLog(`Stage '${stage.name}' started...`);

      try {
        const stageNameLower = stage.name.toLowerCase();
        let cmdToRun = null;

        if (stageNameLower.includes("install")) {
          cmdToRun = "npm install";
          emitLog("Installing dependencies...");
        } else if (stageNameLower.includes("test")) {
          cmdToRun = "npm test";
          emitLog("Running tests...");
        } else if (stageNameLower.includes("build")) {
          cmdToRun = "npm run build";
        }

        if (cmdToRun) {
          await runCommand(cmdToRun, repoDir, emitLog);
          if (stageNameLower.includes("build")) emitLog("Build successful");
        } else {
          emitLog(`Running simulated steps for '${stage.name}'`);
          // Simulate execution delay for stages with no command mapping
          await new Promise(r => setTimeout(r, STAGE_DELAY_MS));
          
          const failOnThisStage =
            (job.shouldFail && i === Math.floor(job.stages.length / 2)) ||
            (jobWillFail && i === Math.floor(job.stages.length / 2));

          if (failOnThisStage) {
            throw new Error(`ERROR: Stage '${stage.name}' failed unexpectedly!`);
          }
        }

        // Success case
        stage.status = "SUCCESS";
        stage.endTime = new Date().toISOString();
        broadcastJobUpdate(job, 'stage_completed', stage.name);
        emitLog(`Stage '${stage.name}' completed successfully.`);

      } catch (err) {
        stage.status = "FAILED";
        stage.endTime = new Date().toISOString();
        broadcastJobUpdate(job, 'stage_failed', stage.name);
        emitLog(`ERROR: ${err.message}`);
        failed = true;
        break; // Stop pipeline on failure
      }
    }

    // Final job status
    job.status = failed ? "FAILED" : "COMPLETED";
    job.completedAt = new Date().toISOString();
    job.currentStage = null;

    if (failed) {
      emitLog("Pipeline finished with status: FAILED");
    } else {
      emitLog("Pipeline completed");
    }

    broadcastJobUpdate(job, failed ? 'job_failed' : 'job_completed');

    // Cleanup repository folder asynchronously
    if (repoCloned) {
      fs.rm(repoDir, { recursive: true, force: true }, (err) => {
        if (err) console.error(`Failed to clean up repo dir ${repoDir}:`, err);
      });
    }

    resolve();
  });
}

module.exports = { executePipeline };