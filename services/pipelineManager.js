const { broadcastJobUpdate, getIO } = require('../websocket/socket');
const path = require('path');
const fs = require('fs');
const simpleGit = require('simple-git');
const { runCommand } = require('../executors/dockerRunner');
const { getPipelineConfig } = require('../pipelines/index');
const prisma = require('../db/index');

/* =========================
   NOVA.txt SAFE PUSH
========================= */
async function appendToNovaFile(job, repoDir, emitLog) {

  try {

    const git = simpleGit(repoDir);

    const filePath = path.join(
      repoDir,
      'NOVA.txt'
    );

    await emitLog(
      '📝 Updating NOVA.txt'
    );

    // Ensure NOVA.txt exists
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '');
    }

    const entry = `
========================================
Job ID: ${job.id}
Repository: ${job.repo}
Branch: ${job.branch}
Status: ${job.status}
Started: ${job.startedAt}
Completed: ${job.completedAt}
========================================

`;

    fs.appendFileSync(
      filePath,
      entry,
      'utf8'
    );

    await emitLog(
      '📦 Staging NOVA.txt'
    );

    await git.addConfig(
      'user.email',
      'ci@nova.com'
    );

    await git.addConfig(
      'user.name',
      'Nova CI'
    );

    // Stage ONLY NOVA.txt
    await git.add('./NOVA.txt');

    // Verify staged changes
    const staged =
      await git.diff(['--cached']);

    console.log(
      'STAGED DIFF:',
      staged
    );

    if (
      !staged ||
      staged.trim().length === 0
    ) {
      throw new Error(
        'NOVA.txt was not staged properly'
      );
    }

    await emitLog(
      '📝 Creating CI commit'
    );

    const commitResult =
      await git.commit(
        'Nova CI Update [skip ci]'
      );

    console.log(
      'COMMIT RESULT:',
      commitResult
    );

    await emitLog(
      '⬆️ Pushing CI logs branch'
    );

    const ciBranch = 'ci-logs';

    const pushResult =
      await git.push(
        'origin',
        `HEAD:${ciBranch}`
      );

    console.log(
      '✅ PUSH RESULT:',
      pushResult
    );

    await emitLog(
      '✅ NOVA.txt pushed successfully'
    );

  } catch (err) {

    console.error(
      '❌ NOVA PUSH ERROR:',
      err
    );

    await emitLog(
      `❌ NOVA push failed: ${err.message}`
    );
  }
}

/* =========================
   PIPELINE EXECUTION
========================= */
async function executePipeline(job) {

  return new Promise(
    async (resolve, reject) => {

      const emitLog = async (msg) => {

        const log =
          `[Job ${job.id.slice(0, 6)}] ${msg}`;

        try {

          await prisma.executionLog.create({
            data: {
              jobId: job.id,
              message: log
            }
          });

        } catch { }

        try {

          getIO()
            .to(job.id)
            .emit(
              'job_log',
              {
                jobId: job.id,
                log
              }
            );

        } catch { }

        console.log(log);
      };

      job.status = 'IN_PROGRESS';

      job.startedAt =
        new Date().toISOString();

      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: job.status,
          startedAt: new Date(
            job.startedAt
          )
        }
      });

      broadcastJobUpdate(
        job,
        'job_started'
      );

      const repoDir = path.join(
        __dirname,
        '..',
        'repos',
        job.id
      );

      /* =========================
         CLONE REPOSITORY
      ========================= */
      try {

        fs.mkdirSync(
          path.dirname(repoDir),
          { recursive: true }
        );

        await emitLog(
          `Cloning ${job.repo}`
        );

        const git = simpleGit();

        // Clean old repo
        if (fs.existsSync(repoDir)) {

          fs.rmSync(
            repoDir,
            {
              recursive: true,
              force: true
            }
          );
        }

        const authenticatedRepo =
          job.repo.replace(
            'https://',
            `https://${process.env.GITHUB_TOKEN}@`
          );

        await emitLog(
          '🔐 Using authenticated GitHub clone'
        );

        await git.clone(
          authenticatedRepo,
          repoDir
        );

        const repoGit =
          simpleGit(repoDir);

        const sourceBranch =
          job.branch || 'main';

        const ciBranch =
          'ci-logs';

        // Fetch all branches
        await repoGit.fetch();

        const remoteBranches =
          await repoGit.branch([
            '-r'
          ]);

        // Checkout existing ci-logs
        if (
          remoteBranches.all.includes(
            `origin/${ciBranch}`
          )
        ) {

          await repoGit.checkout([
            '-B',
            ciBranch,
            `origin/${ciBranch}`
          ]);

          console.log(
            `✅ Checked out existing ${ciBranch}`
          );

        } else {

          // Create ci-logs branch
          await repoGit.checkout([
            '-B',
            ciBranch,
            `origin/${sourceBranch}`
          ]);

          console.log(
            `✅ Created new ${ciBranch} branch`
          );
        }

      } catch (err) {

        await emitLog(
          `Clone failed: ${err.message}`
        );

        job.status = 'FAILED';

        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: job.status,
            failureReason: err.message
          }
        });

        broadcastJobUpdate(
          job,
          'job_failed'
        );

        return resolve();
      }

      /* =========================
         LOAD PIPELINE
      ========================= */
      const stages =
        getPipelineConfig(repoDir);

      if (
        !stages ||
        stages.length === 0
      ) {

        await emitLog(
          'No pipeline config found'
        );

        job.status = 'FAILED';

        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: job.status,
            failureReason:
              'No pipeline config'
          }
        });

        return resolve();
      }

      job.stages = stages;

      for (const stage of stages) {

        await prisma.stage.create({
          data: {
            jobId: job.id,
            name: stage.name,
            status: 'PENDING'
          }
        });
      }

      broadcastJobUpdate(
        job,
        'pipeline_updated'
      );

      /* =========================
         EXECUTION
      ========================= */
      let failed = false;

      const dbStages =
        await prisma.stage.findMany({
          where: {
            jobId: job.id
          }
        });

      for (let stage of stages) {

        const dbStage =
          dbStages.find(
            s => s.name === stage.name
          );

        const start = Date.now();

        if (dbStage) {

          await prisma.stage.update({
            where: {
              id: dbStage.id
            },
            data: {
              status: 'RUNNING'
            }
          });
        }

        broadcastJobUpdate(
          job,
          'stage_started',
          stage.name
        );

        await emitLog(
          `▶ ${stage.name}`
        );

        try {

          if (stage.commands) {

            for (const cmd of stage.commands) {

              await runCommand(
                cmd,
                repoDir,
                emitLog
              );
            }

          } else {

            if (
              stage.name
                .toLowerCase()
                .includes('install')
            ) {

              await runCommand(
                'npm install',
                repoDir,
                emitLog
              );

            } else if (
              stage.name
                .toLowerCase()
                .includes('test')
            ) {

              await runCommand(
                'npm test',
                repoDir,
                emitLog
              );

            } else if (
              stage.name
                .toLowerCase()
                .includes('build')
            ) {

              await runCommand(
                'npm run build',
                repoDir,
                emitLog
              );
            }
          }

          const duration =
            Date.now() - start;

          if (dbStage) {

            await prisma.stage.update({
              where: {
                id: dbStage.id
              },
              data: {
                status: 'SUCCESS',
                duration
              }
            });
          }

          broadcastJobUpdate(
            job,
            'stage_completed',
            stage.name
          );

        } catch (err) {

          failed = true;

          const duration =
            Date.now() - start;

          if (dbStage) {

            await prisma.stage.update({
              where: {
                id: dbStage.id
              },
              data: {
                status: 'FAILED',
                duration
              }
            });
          }

          await emitLog(
            `❌ ${err.message}`
          );

          broadcastJobUpdate(
            job,
            'stage_failed',
            stage.name
          );

          break;
        }
      }

      /* =========================
         FINALIZATION
      ========================= */
      job.status = failed
        ? 'FAILED'
        : 'COMPLETED';

      job.completedAt =
        new Date().toISOString();

      await prisma.job.update({
        where: {
          id: job.id
        },
        data: {
          status: job.status,
          completedAt: new Date(
            job.completedAt
          )
        }
      });

      if (!failed) {

        await appendToNovaFile(
          job,
          repoDir,
          emitLog
        );
      }

      await emitLog(
        job.status === 'COMPLETED'
          ? '✅ DONE'
          : '❌ FAILED'
      );

      broadcastJobUpdate(
        job,
        failed
          ? 'job_failed'
          : 'job_completed'
      );

      // Cleanup
      fs.rm(
        repoDir,
        {
          recursive: true,
          force: true
        },
        () => { }
      );

      if (failed) {

        reject(
          new Error(
            'Pipeline failed'
          )
        );

      } else {

        resolve();
      }
    }
  );
}

module.exports = {
  executePipeline
};