const { broadcastJobUpdate, getIO } = require('../websocket/socket');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const simpleGit = require('simple-git');
const { parseJenkinsfile } = require('./jenkinsfileParser');

const STAGE_DELAY_MS = 3000;

/* =========================
   RUN COMMAND
========================= */
function runCommand(cmd, cwd, emitLog, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    emitLog(`[Execution] ${cmd}`);

    const child = exec(cmd, { cwd, timeout: timeoutMs });

    child.stdout.on('data', d => {
      d.toString().split('\n').forEach(l => l.trim() && emitLog(l));
    });

    child.stderr.on('data', d => {
      d.toString().split('\n').forEach(l => l.trim() && emitLog(l));
    });

    child.on('close', code => {
      code === 0 ? resolve() : reject(new Error(`Failed: ${cmd}`));
    });

    child.on('error', reject);
  });
}

/* =========================
   DETECT PROJECT TYPE
========================= */
function detectBuildType(repoDir) {
  const pkgPath = path.join(repoDir, 'package.json');

  if (!fs.existsSync(pkgPath)) return "unknown";

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  if (pkg.dependencies?.react && pkg.scripts?.build) {
    if (fs.existsSync(path.join(repoDir, 'vite.config.js'))) return "vite";
    return "react";
  }

  if (pkg.main || pkg.scripts?.start) return "node";

  return "unknown";
}

/* =========================
   CREATE DOCKERFILE
========================= */
function createDockerfile(repoDir, type) {
  let dockerfile = "";

  if (type === "vite") {
    dockerfile = `
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN npm install -g serve
EXPOSE 4000
CMD ["serve", "-s", "dist", "-l", "4000"]
`;
  }

  else if (type === "react") {
    dockerfile = `
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN npm install -g serve
EXPOSE 4000
CMD ["serve", "-s", "build", "-l", "4000"]
`;
  }

  else if (type === "node") {
    dockerfile = `
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 4000
CMD ["npm", "start"]
`;
  }

  else {
    dockerfile = `
FROM node:18
WORKDIR /app
COPY . .
RUN npm install || true
EXPOSE 4000
CMD ["node", "server.js"]
`;
  }

  fs.writeFileSync(path.join(repoDir, 'Dockerfile'), dockerfile);
}

/* =========================
   PIPELINE EXECUTION
========================= */
async function executePipeline(job) {
  return new Promise(async (resolve) => {

    const emitLog = (msg) => {
      const log = `[Job ${job?.id?.slice(0, 6)}] ${msg}`;
      job.logs = job.logs || [];
      job.logs.push(log);

      try {
        getIO().to(job.id).emit("job_log", { jobId: job.id, log });
      } catch { }
    };

    job.status = "IN_PROGRESS";
    job.startedAt = new Date().toISOString();
    broadcastJobUpdate(job, 'job_started');
    emitLog("Pipeline started");

    const repoDir = path.join(__dirname, '..', 'repos', job.id);

    try {
      fs.mkdirSync(path.dirname(repoDir), { recursive: true });

      emitLog(`Cloning ${job.repo}`);
      await simpleGit().clone(job.repo, repoDir);
      emitLog("Clone success");

      const dynamicStages = parseJenkinsfile(repoDir) || [];

      if (dynamicStages.length === 0) {
        emitLog("No Jenkinsfile → default pipeline used");

        job.stages = [
          { name: "Fetch Code" },
          { name: "Install Dependencies" },
          { name: "Build" },
          { name: "Docker Build" },
          { name: "Run Container" }
        ];
      } else {
        job.stages = dynamicStages;
      }

      broadcastJobUpdate(job, 'pipeline_updated');

    } catch (err) {
      emitLog(`Clone error: ${err.message}`);
      job.status = "FAILED";
      broadcastJobUpdate(job, 'job_failed');
      return resolve();
    }

    let failed = false;

    for (let stage of job.stages) {
      stage.status = "RUNNING";
      broadcastJobUpdate(job, 'stage_started', stage.name);
      emitLog(`▶ ${stage.name}`);

      try {
        const name = stage.name.toLowerCase();

        if (name.includes("install")) {
          await runCommand("npm install", repoDir, emitLog);
        }

        else if (name.includes("build") && !name.includes("docker")) {
          await runCommand("npm run build", repoDir, emitLog);
        }

        else if (name.includes("docker build")) {
          emitLog("Creating Dockerfile for frontend app...");

          const dockerfile = `
FROM node:18

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

RUN npm install -g serve

EXPOSE 4000

CMD ["serve", "-s", "dist", "-l", "4000"]
`;

          fs.writeFileSync(path.join(repoDir, 'Dockerfile'), dockerfile);

          await runCommand(
            "docker build -t deployed-app:latest .",
            repoDir,
            emitLog
          );
        }

        else if (name.includes("run container")) {
          await runCommand("docker rm -f deployed-app-container", repoDir, emitLog).catch(() => { });

          await runCommand(
            "docker run -d --name deployed-app-container -p 2000:4000 deployed-app:latest",
            repoDir,
            emitLog
          );
        }

        else {
          await new Promise(r => setTimeout(r, STAGE_DELAY_MS));
        }

        stage.status = "SUCCESS";
        broadcastJobUpdate(job, 'stage_completed', stage.name);

      } catch (err) {
        stage.status = "FAILED";
        emitLog(`❌ ${err.message}`);
        broadcastJobUpdate(job, 'stage_failed', stage.name);
        failed = true;
        break;
      }
    }

    job.status = failed ? "FAILED" : "COMPLETED";
    job.completedAt = new Date().toISOString();

    emitLog(job.status === "COMPLETED" ? "✅ DONE" : "❌ FAILED");

    broadcastJobUpdate(job, failed ? 'job_failed' : 'job_completed');

    fs.rm(repoDir, { recursive: true, force: true }, () => { });

    resolve();
  });
}

module.exports = { executePipeline };