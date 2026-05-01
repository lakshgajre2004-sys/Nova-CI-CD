const { broadcastJobUpdate, getIO } = require('../websocket/socket');
const path = require('path');
const fs = require('fs');
const simpleGit = require('simple-git');
const { runCommand } = require('../executors/dockerRunner');
const { getPipelineConfig } = require('../pipelines/index');
const prisma = require('../db/index');

async function appendToNovaFile(job, repoDir, emitLog) {
  try {
    const git = simpleGit(repoDir);

    const filePath = path.join(repoDir, "Nova.txt");

    // ✅ File size control
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      if (content.length > 10000) {
        fs.writeFileSync(filePath, "---- RESET LOG ----\n");
      }
    }

    // ✅ Append entry
    const entry = `
----------------------------------------
Job ID: ${job.id}
Status: ${job.status}
Started: ${job.startedAt}
Completed: ${job.completedAt}
----------------------------------------
`;

    fs.appendFileSync(filePath, entry);

    emitLog("Nova.txt updated");

    // ✅ Safe git log (handles empty repo)
    let latest = null;
    try {
      const log = await git.log();
      latest = log.latest;
    } catch {
      emitLog("First commit scenario");
    }

    // ✅ Loop prevention (author check)
    if (latest && latest.author_name === "Nova CI") {
      emitLog("Skipping push (loop prevention)");
      return;
    }

    // ✅ Git config
    await git.addConfig("user.email", "ci@nova.com");
    await git.addConfig("user.name", "Nova CI");

    await git.add("Nova.txt");
    await git.commit(`Nova Update: ${job.id}`);

    // ✅ Ensure token exists
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      emitLog("GITHUB_TOKEN missing — skipping push");
      return;
    }

    // ✅ Detect branch safely (handles detached HEAD)
    let currentBranch = "main";

    try {
      const status = await git.status();

      if (status.current) {
        currentBranch = status.current;
      } else {
        const branches = await git.branch(['-r']);

        // Prefer default branch
        const head = branches.all.find(b => b.includes('origin/HEAD'));

        if (head) {
          currentBranch = head.split('->')[1].trim().replace('origin/', '');
        } else {
          const match = branches.all.find(b => b.startsWith('origin/'));
          if (match) {
            currentBranch = match.replace('origin/', '');
          }
        }
      }
    } catch {
      emitLog("Branch detection fallback used");
    }

    // ✅ Push safely
    const repoUrl = job.repo.replace(
      "https://github.com/",
      `https://${token}@github.com/`
    );

    await git.push(repoUrl, `HEAD:${currentBranch}`);

    emitLog("Nova.txt pushed to GitHub");

  } catch (err) {
    emitLog("Nova.txt push failed: " + err.message);
  }
}

/* =========================
   PIPELINE EXECUTION
========================= */
async function executePipeline(job) {
  return new Promise(async (resolve) => {

    const emitLog = async (msg) => {
      const log = `[Job ${job?.id?.slice(0, 6)}] ${msg}`;
      job.logs = job.logs || [];
      job.logs.push(log);

      // Save log to DB
      try {
        await prisma.executionLog.create({
          data: {
            jobId: job.id,
            message: log
          }
        });
      } catch (e) {
        console.error("Failed to save log to DB", e);
      }

      try {
        getIO().to(job.id).emit("job_log", { jobId: job.id, log });
      } catch { }
    };

    job.status = "IN_PROGRESS";
    job.startedAt = new Date().toISOString();
    
    // Update Job in DB
    await prisma.job.update({
      where: { id: job.id },
      data: { status: job.status, startedAt: new Date(job.startedAt) }
    });

    const queueWaitTime = new Date(job.startedAt).getTime() - new Date(job.createdAt).getTime();
    await emitLog(`Queue wait time: ${queueWaitTime}ms`);

    broadcastJobUpdate(job, 'job_started');
    await emitLog("Pipeline started");

    const repoDir = path.join(__dirname, '..', 'repos', job.id);

    try {
      fs.mkdirSync(path.dirname(repoDir), { recursive: true });

      await emitLog(`Cloning ${job.repo}`);
      const git = simpleGit();
      await git.clone(job.repo, repoDir);
      await emitLog("Clone success");

      const repoGit = simpleGit(repoDir);

      if (job.branch) {
        await emitLog(`Checking out branch: ${job.branch}`);
        await repoGit.checkout(job.branch);
      }

      if (job.commit && job.commit !== "HEAD") {
        await emitLog(`Checking out commit: ${job.commit}`);
        await repoGit.checkout(job.commit);
      }

      const dynamicStages = getPipelineConfig(repoDir);

      if (!dynamicStages || dynamicStages.length === 0) {
        await emitLog("❌ No pipeline stages found — failing job");
        job.status = "FAILED";
        await prisma.job.update({ where: { id: job.id }, data: { status: job.status, failureReason: "No pipeline config" } });
        broadcastJobUpdate(job, 'job_failed');
        return resolve();
      }

      job.stages = dynamicStages;
      
      // Save stages to DB
      for (const stage of job.stages) {
        await prisma.stage.create({
          data: {
            jobId: job.id,
            name: stage.name,
            status: "PENDING"
          }
        });
      }

      broadcastJobUpdate(job, 'pipeline_updated');

    } catch (err) {
      await emitLog(`Clone/Checkout error: ${err.message}`);
      job.status = "FAILED";
      await prisma.job.update({ where: { id: job.id }, data: { status: job.status, failureReason: `Clone/Checkout error: ${err.message}` } });
      broadcastJobUpdate(job, 'job_failed');
      return resolve();
    }

    let failed = false;
    let failureReason = null;

    // Fetch DB stages to get their IDs
    const dbStages = await prisma.stage.findMany({ where: { jobId: job.id } });

    for (let stage of job.stages) {
      const dbStage = dbStages.find(s => s.name === stage.name);
      
      stage.status = "RUNNING";
      const stageStartTime = Date.now();
      if (dbStage) {
        await prisma.stage.update({ where: { id: dbStage.id }, data: { status: "RUNNING" } });
      }

      broadcastJobUpdate(job, 'stage_started', stage.name);
      await emitLog(`▶ ${stage.name}`);

      try {
        // Execute dynamic commands if specified
        if (stage.commands && Array.isArray(stage.commands)) {
          for (const cmd of stage.commands) {
            await runCommand(cmd, repoDir, emitLog, stage.timeoutMs || 120000, job.id);
          }
        } else {
           // Fallback to legacy static checks if no explicit commands given
           const name = stage.name.toLowerCase();
           if (name.includes("install")) {
             await runCommand("npm ci", repoDir, emitLog, 120000, job.id).catch(async () => {
                await runCommand("npm install", repoDir, emitLog, 120000, job.id);
             });
           }
           else if (name.includes("test")) {
             await runCommand("npm test", repoDir, emitLog, 120000, job.id);
           }
           else if (name.includes("build") && !name.includes("docker")) {
             await runCommand("npm run build", repoDir, emitLog, 120000, job.id);
           }
           else if (name.includes("docker build")) {
             await runCommand(`docker build -t ${job.id} .`, repoDir, emitLog, 120000, job.id);
           }
           else if (name.includes("docker run") || name.includes("run container")) {
             await runCommand(`docker rm -f nova-job-${job.id}`, repoDir, emitLog, 10000, job.id).catch(() => { });
             await runCommand(`docker run -d --name nova-job-${job.id} -p 2000:4000 ${job.id}`, repoDir, emitLog, 120000, job.id);
           }
           else {
             await emitLog(`Executing stage: ${stage.name}`);
           }
        }

        stage.status = "SUCCESS";
        const stageDuration = Date.now() - stageStartTime;
        if (dbStage) {
          await prisma.stage.update({ where: { id: dbStage.id }, data: { status: "SUCCESS", duration: stageDuration } });
        }
        broadcastJobUpdate(job, 'stage_completed', stage.name);

      } catch (err) {
        stage.status = "FAILED";
        failureReason = `Stage ${stage.name} failed: ${err.message}`;
        const stageDuration = Date.now() - stageStartTime;
        if (dbStage) {
          await prisma.stage.update({ where: { id: dbStage.id }, data: { status: "FAILED", duration: stageDuration } });
        }
        await emitLog(`❌ ${err.message}`);
        broadcastJobUpdate(job, 'stage_failed', stage.name);
        failed = true;
        break; // Stop further stages on failure (Requirement 6)
      }
    }

    job.status = failed ? "FAILED" : "COMPLETED";
    job.completedAt = new Date().toISOString();
    
    let duration = null;
    if (job.startedAt && job.completedAt) {
      duration = new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime();
    }

    await prisma.job.update({
      where: { id: job.id },
      data: { 
        status: job.status, 
        completedAt: new Date(job.completedAt),
        duration,
        failureReason: failed ? failureReason : null
      }
    });

    if (!failed) {
      await appendToNovaFile(job, repoDir, emitLog);
    }

    await emitLog(job.status === "COMPLETED" ? "✅ DONE" : "❌ FAILED");

    broadcastJobUpdate(job, failed ? 'job_failed' : 'job_completed');

    fs.rm(repoDir, { recursive: true, force: true }, () => { });

    if (failed) {
      reject(new Error("Pipeline execution failed"));
    } else {
      resolve();
    }
  });
}

module.exports = { executePipeline };