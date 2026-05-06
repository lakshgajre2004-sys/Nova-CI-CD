const { broadcastJobUpdate, getIO } = require('../websocket/socket');
const path = require('path');
const fs = require('fs');
const simpleGit = require('simple-git');
const { runCommand } = require('../executors/dockerRunner');
const { getPipelineConfig } = require('../pipelines/index');
const prisma = require('../db/index');

/* =========================
   OPTIONAL: GIT LOG FILE PUSH
========================= */
async function appendToNovaFile(job, repoDir, emitLog) {
  try {
    const git = simpleGit(repoDir);

    // Clean repository before NOVA.txt update
    await git.reset(['--hard']);
    await git.clean('f', ['-d']);

    const filePath = path.join(repoDir, "NOVA.txt");

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      if (content.length > 10000) {
        fs.writeFileSync(filePath, "---- RESET LOG ----\n");
      }
    }

    const entry = `
========================================
Job ID: ${job.id}
Repository: ${job.repo || 'unknown'}
Branch: ${job.branch || 'unknown'}
Status: ${job.status}
Started: ${job.startedAt}
Completed: ${job.completedAt}
========================================
`;

    fs.appendFileSync(filePath, entry);

    const statusOutput = await git.raw(['status', '--porcelain']);
    if (statusOutput) {
      const lines = statusOutput.split('\n').filter(l => l.trim().length > 0);
      const nonNovaFiles = lines.filter(line => {
        const file = line.substring(3).trim();
        return file !== 'NOVA.txt';
      });

      if (nonNovaFiles.length > 0) {
        await emitLog("Blocked unsafe auto-commit: non-NOVA files modified");
        return;
      }
    }

    await git.addConfig("user.email", "ci@nova.com");
    await git.addConfig("user.name", "Nova CI");

    await git.add("NOVA.txt");

    await git.commit("Nova CI Update [skip ci]");

    await git.push("origin", job.branch || "main");

  } catch (err) {
    await emitLog("NOVA.txt update failed: " + err.message);
  }
}

/* =========================
   PIPELINE EXECUTION
========================= */
async function executePipeline(job) {
  return new Promise(async (resolve, reject) => {

    const emitLog = async (msg) => {
      const log = `[Job ${job.id.slice(0, 6)}] ${msg}`;

      try {
        await prisma.executionLog.create({
          data: { jobId: job.id, message: log }
        });
      } catch { }

      try {
        getIO().to(job.id).emit("job_log", { jobId: job.id, log });
      } catch { }

      console.log(log);
    };

    job.status = "IN_PROGRESS";
    job.startedAt = new Date().toISOString();

    await prisma.job.update({
      where: { id: job.id },
      data: { status: job.status, startedAt: new Date(job.startedAt) }
    });

    broadcastJobUpdate(job, 'job_started');

    const repoDir = path.join(__dirname, '..', 'repos', job.id);

    /* ================= CLONE ================= */
    try {
      fs.mkdirSync(path.dirname(repoDir), { recursive: true });

      await emitLog(`Cloning ${job.repo}`);

      const git = simpleGit();

      // Clean before cloning
      if (fs.existsSync(repoDir)) {
        fs.rmSync(repoDir, { recursive: true, force: true });
      }

      const authenticatedRepo = job.repo.replace(
        "https://",
        `https://${process.env.GITHUB_TOKEN}@`
      );

      await git.clone(authenticatedRepo, repoDir);

      const repoGit = simpleGit(repoDir);

      if (job.branch) {
        await repoGit.checkout(job.branch);
      }

      if (job.commit && job.commit !== "HEAD") {
        await repoGit.checkout(job.commit);
      }

    } catch (err) {
      await emitLog(`Clone failed: ${err.message}`);
      job.status = "FAILED";

      await prisma.job.update({
        where: { id: job.id },
        data: { status: job.status, failureReason: err.message }
      });

      broadcastJobUpdate(job, 'job_failed');
      return resolve();
    }

    /* ================= LOAD PIPELINE ================= */
    const stages = getPipelineConfig(repoDir);

    if (!stages || stages.length === 0) {
      await emitLog("No pipeline config found");
      job.status = "FAILED";

      await prisma.job.update({
        where: { id: job.id },
        data: { status: job.status, failureReason: "No pipeline config" }
      });

      return resolve();
    }

    job.stages = stages;

    for (const stage of stages) {
      await prisma.stage.create({
        data: {
          jobId: job.id,
          name: stage.name,
          status: "PENDING"
        }
      });
    }

    broadcastJobUpdate(job, 'pipeline_updated');

    /* ================= EXECUTION ================= */
    let failed = false;

    const dbStages = await prisma.stage.findMany({
      where: { jobId: job.id }
    });

    for (let stage of stages) {
      const dbStage = dbStages.find(s => s.name === stage.name);

      const start = Date.now();

      if (dbStage) {
        await prisma.stage.update({
          where: { id: dbStage.id },
          data: { status: "RUNNING" }
        });
      }

      broadcastJobUpdate(job, 'stage_started', stage.name);
      await emitLog(`▶ ${stage.name}`);

      try {
        if (stage.commands) {
          for (const cmd of stage.commands) {
            await runCommand(cmd, repoDir, emitLog);
          }
        } else {
          // fallback behavior
          if (stage.name.toLowerCase().includes("install")) {
            await runCommand("npm install", repoDir, emitLog);
          } else if (stage.name.toLowerCase().includes("test")) {
            await runCommand("npm test", repoDir, emitLog);
          } else if (stage.name.toLowerCase().includes("build")) {
            await runCommand("npm run build", repoDir, emitLog);
          }
        }

        const duration = Date.now() - start;

        if (dbStage) {
          await prisma.stage.update({
            where: { id: dbStage.id },
            data: { status: "SUCCESS", duration }
          });
        }

        broadcastJobUpdate(job, 'stage_completed', stage.name);

      } catch (err) {
        failed = true;

        const duration = Date.now() - start;

        if (dbStage) {
          await prisma.stage.update({
            where: { id: dbStage.id },
            data: { status: "FAILED", duration }
          });
        }

        await emitLog(`❌ ${err.message}`);
        broadcastJobUpdate(job, 'stage_failed', stage.name);

        break;
      }
    }

    /* ================= FINAL ================= */
    job.status = failed ? "FAILED" : "COMPLETED";
    job.completedAt = new Date().toISOString();

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: job.status,
        completedAt: new Date(job.completedAt)
      }
    });

    if (!failed) {
      await appendToNovaFile(job, repoDir, emitLog);
    }

    await emitLog(job.status === "COMPLETED" ? "✅ DONE" : "❌ FAILED");

    broadcastJobUpdate(job, failed ? 'job_failed' : 'job_completed');

    fs.rm(repoDir, { recursive: true, force: true }, () => { });

    if (failed) reject(new Error("Pipeline failed"));
    else resolve();
  });
}

module.exports = { executePipeline };