const { broadcastJobUpdate, getIO } = require('../websocket/socket');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const simpleGit = require('simple-git');
const { parseJenkinsfile } = require('./jenkinsfileParser');
const { workers } = require('./workerManager');

function runCommand(cmd, args, cwd, emitLog) {
  return new Promise((resolve, reject) => {
    const process = spawn(cmd, args, { cwd, shell: true });

    process.stdout.on("data", data => {
      const output = data.toString().trim();
      if (output) emitLog(`[log] ${output}`);
    });

    process.stderr.on("data", data => {
      const output = data.toString().trim();
      if (output) emitLog(`[log] ${output}`);
    });

    process.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} failed with code ${code}`));
    });
  });
}

function extractRepoName(repoUrl) {
  if (!repoUrl) return "app";
  const parts = repoUrl.split('/');
  let lastPart = parts[parts.length - 1];
  if (lastPart.endsWith('.git')) lastPart = lastPart.slice(0, -4);
  return lastPart.toLowerCase();
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
      } catch { }
    };

    const worker = workers.find(w => w.id === job.workerId);

    job.status = "IN_PROGRESS";
    job.startedAt = new Date().toISOString();
    broadcastJobUpdate(job, 'job_started');

    emitLog(`[log] Pipeline started on ${worker?.id}`);

    const repoDir = path.join(__dirname, '..', 'repos', job.id);

    // ================= CLONE =================
    try {
      fs.mkdirSync(path.join(__dirname, '..', 'repos'), { recursive: true });

      emitLog("[stage_started]");
      emitLog("[log] Cloning repository...");
      await simpleGit().clone(job.repo, repoDir);
      emitLog("[log] Repository cloned");
      emitLog("[stage_completed]");

      const dynamicStages = parseJenkinsfile(repoDir);
      if (dynamicStages?.length) {
        job.stages = dynamicStages;
        broadcastJobUpdate(job, 'pipeline_updated');
      }

    } catch (err) {
      emitLog("[stage_failed]");
      emitLog(`[log] Clone failed: ${err.message}`);
      job.status = "FAILED";
      broadcastJobUpdate(job, 'job_failed');
      return resolve();
    }

    const repoName = extractRepoName(job.repo);
    const dockerUser = "laksh04"; // your docker username

    let failed = false;

    // ================= PIPELINE =================
    for (let stage of job.stages) {

      job.currentStage = stage.name;
      stage.status = "RUNNING";
      stage.startTime = new Date().toISOString();

      broadcastJobUpdate(job, 'stage_started', stage.name);
      emitLog("[stage_started]");
      emitLog(`[log] Stage '${stage.name}' started`);

      const name = stage.name.toLowerCase();

      try {

        // INSTALL
        if (name.includes("install")) {
          await runCommand("npm", ["install"], repoDir, emitLog);
        }

        // BUILD
        else if (name === "build") {
          await runCommand("npm", ["run", "build"], repoDir, emitLog);
        }

        // TEST
        else if (name.includes("test")) {
          await runCommand("npm", ["test"], repoDir, emitLog);
        }

        // SECURITY
        else if (name.includes("security")) {
          emitLog("[log] Running basic security scan...");
        }

        // 🔥 DOCKER BUILD
        else if (name.includes("docker build")) {

          emitLog("[log] Checking Docker engine...");
          await runCommand("docker", ["info"], repoDir, emitLog);

          emitLog(`[log] Building Docker image: ${repoName}`);
          await runCommand("docker", ["build", "-t", repoName, "."], repoDir, emitLog);
        }

        // 🔥 RUN CONTAINER (NEW)
        else if (name.includes("run")) {

          const containerName = `${repoName}-container`;

          emitLog("[log] Removing old container if exists...");
          await runCommand("docker", ["rm", "-f", containerName], repoDir, emitLog).catch(() => { });

          emitLog(`[log] Running container: ${containerName}`);

          await runCommand("docker", [
            "run",
            "-d",
            "--name", containerName,
            "-p", "4000:4000", // change if needed
            repoName
          ], repoDir, emitLog);

          emitLog("[log] Container started successfully");
        }

        // 🔥 PUSH
        else if (name.includes("push")) {

          const fullImage = `${dockerUser}/${repoName}`;

          emitLog(`[log] Tagging image: ${fullImage}`);
          await runCommand("docker", ["tag", repoName, fullImage], repoDir, emitLog);

          emitLog("[log] Pushing to Docker Hub...");
          await runCommand("docker", ["push", fullImage], repoDir, emitLog);
        }

        stage.status = "SUCCESS";
        stage.endTime = new Date().toISOString();
        broadcastJobUpdate(job, 'stage_completed', stage.name);

        emitLog(`[log] Stage '${stage.name}' completed`);
        emitLog("[stage_completed]");

      } catch (err) {
        stage.status = "FAILED";
        stage.endTime = new Date().toISOString();
        broadcastJobUpdate(job, 'stage_failed', stage.name);

        emitLog("[stage_failed]");
        emitLog(`[log] ERROR: ${err.message}`);

        failed = true;
        break;
      }
    }

    // ================= FINAL =================
    job.status = failed ? "FAILED" : "COMPLETED";
    job.completedAt = new Date().toISOString();
    job.currentStage = null;

    emitLog(`[log] Pipeline finished: ${job.status}`);
    broadcastJobUpdate(job, failed ? 'job_failed' : 'job_completed');

    fs.rm(repoDir, { recursive: true, force: true }, () => { });

    resolve();
  });
}

module.exports = { executePipeline };