const { broadcastJobUpdate, getIO } = require('../websocket/socket');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const simpleGit = require('simple-git');
const { parseJenkinsfile } = require('./jenkinsfileParser');
const { workers } = require('./workerManager');

const STAGE_DELAY_MS = 3000;

// 🔥 NEW: Docker execution
function runDockerCommand(cmd, repoDir, emitLog, worker, image = "node:18") {
  return new Promise((resolve, reject) => {

    const safePath = repoDir.replace(/\\/g, "/");

    const dockerCmd = `
      docker run --rm \
      -v ${safePath}:/app \
      -w /app \
      ${image} \
      sh -c "${cmd}"
    `;

    emitLog(`[Docker] Running: ${cmd} inside ${image}`);

    const child = exec(dockerCmd);

    if (worker) worker.currentProcess = child;

    child.stdout.on('data', data => emitLog(data.toString()));
    child.stderr.on('data', data => emitLog(data.toString()));

    child.on('close', (code) => {
      if (worker && worker.currentProcess === child) worker.currentProcess = null;

      if (code === 0) resolve();
      else reject(new Error(`Docker command failed: ${cmd}`));
    });

    child.on('error', reject);
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

    const worker = workers.find(w => w.id === job.workerId);

    job.status = "IN_PROGRESS";
    job.startedAt = new Date().toISOString();
    broadcastJobUpdate(job, 'job_started');

    emitLog(`Pipeline started on ${worker?.id}`);

    const repoDir = path.join(__dirname, '..', 'repos', job.id);

    try {
      fs.mkdirSync(path.join(__dirname, '..', 'repos'), { recursive: true });

      emitLog("Cloning repository...");
      await simpleGit().clone(job.repo, repoDir);
      emitLog("Repository cloned");

      const dynamicStages = parseJenkinsfile(repoDir);
      if (dynamicStages?.length) {
        job.stages = dynamicStages;
        broadcastJobUpdate(job, 'pipeline_updated');
      }

    } catch (err) {
      emitLog(`Clone failed: ${err.message}`);
      job.status = "FAILED";
      broadcastJobUpdate(job, 'job_failed');
      return resolve();
    }

    let failed = false;

    const getDockerImage = () => {
      if (worker?.type === "python") return "python:3.10";
      return "node:18";
    };

    try {
      for (let i = 0; i < job.stages.length; i++) {
        const stage = job.stages[i];

        job.currentStage = stage.name;
        stage.status = "RUNNING";
        stage.startTime = new Date().toISOString();

        broadcastJobUpdate(job, 'stage_started', stage.name);
        emitLog(`Stage '${stage.name}' started`);

        const name = stage.name.toLowerCase();
        const image = getDockerImage();

        try {

          // 🔥 DOCKER BASED EXECUTION
          if (name.includes("install")) {
            await runDockerCommand("npm install", repoDir, emitLog, worker, image);
          }
          else if (name.includes("test")) {
            await runDockerCommand("npm test", repoDir, emitLog, worker, image);
          }
          else if (name.includes("build")) {
            await runDockerCommand("npm run build", repoDir, emitLog, worker, image);
          }
          else {
            // fallback simulation
            await new Promise(r => setTimeout(r, STAGE_DELAY_MS));
          }

          stage.status = "SUCCESS";
          stage.endTime = new Date().toISOString();
          broadcastJobUpdate(job, 'stage_completed', stage.name);
          emitLog(`Stage '${stage.name}' completed`);

        } catch (err) {
          stage.status = "FAILED";
          stage.endTime = new Date().toISOString();
          broadcastJobUpdate(job, 'stage_failed', stage.name);
          emitLog(`ERROR: ${err.message}`);
          failed = true;
          break;
        }
      }

    } catch (err) {
      failed = true;
    }

    job.status = failed ? "FAILED" : "COMPLETED";
    job.completedAt = new Date().toISOString();
    job.currentStage = null;

    emitLog(`Pipeline finished: ${job.status}`);
    broadcastJobUpdate(job, failed ? 'job_failed' : 'job_completed');

    // cleanup
    fs.rm(repoDir, { recursive: true, force: true }, () => { });

    resolve();
  });
}

module.exports = { executePipeline };