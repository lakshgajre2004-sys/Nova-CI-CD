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
async function appendToNovaFile(job, emitLog) {

  try {

    // =========================
    // NOVA ORCHESTRATOR REPO
    // =========================

    const novaRepoPath = path.join(
      __dirname,
      '..'
    );

    const auditGit =
      simpleGit(novaRepoPath);

    const ciBranch =
      'ci-logs';

    await emitLog(
      '[CI-LOGS] Starting audit push'
    );

    // =========================
    // FETCH REMOTES
    // =========================

    await auditGit.fetch();

    const branches =
      await auditGit.branch([
        '-a'
      ]);

    // =========================
    // ENSURE ci-logs EXISTS
    // =========================

    if (
      branches.all.includes(
        `remotes/origin/${ciBranch}`
      )
    ) {

      await auditGit.checkout(
        ciBranch
      );

      await auditGit.pull(
        'origin',
        ciBranch
      );

      console.log(
        `✅ Checked out existing ${ciBranch}`
      );

    } else {

      await auditGit.checkoutLocalBranch(
        ciBranch
      );

      console.log(
        `✅ Created new ${ciBranch}`
      );

      await auditGit.push(
        'origin',
        ciBranch,
        ['-u']
      );
    }

    // =========================
    // NOVA.txt LOCATION
    // =========================

    const filePath = path.join(
      novaRepoPath,
      'NOVA.txt'
    );

    // Ensure NOVA.txt exists
    if (!fs.existsSync(filePath)) {

      fs.writeFileSync(
        filePath,
        ''
      );
    }

    // =========================
    // APPEND AUDIT ENTRY
    // =========================

    const entry = `
========================================
Job ID: ${job.id}
Repository: ${job.repo}
Branch: ${job.branch}
Status: ${job.status}
Priority: ${job.priorityReason || 'Default'}
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
      '[CI-LOGS] Staging NOVA.txt'
    );

    // =========================
    // GIT CONFIG
    // =========================

    await auditGit.addConfig(
      'user.email',
      'ci@nova.com'
    );

    await auditGit.addConfig(
      'user.name',
      'Nova CI'
    );

    // =========================
    // STAGE FILE
    // =========================

    await auditGit.add(
      './NOVA.txt'
    );

    const staged =
      await auditGit.diff([
        '--cached'
      ]);

    console.log(
      '[CI-LOGS] STAGED:',
      staged
    );

    if (
      !staged ||
      staged.trim().length === 0
    ) {

      await emitLog(
        '[CI-LOGS] No changes detected'
      );

      return;
    }

    // =========================
    // COMMIT
    // =========================

    await emitLog(
      '[CI-LOGS] Creating commit'
    );

    const commitResult =
      await auditGit.commit(
        'Nova CI Update [skip ci]'
      );

    console.log(
      '[CI-LOGS] COMMIT:',
      commitResult
    );

    // =========================
    // PUSH
    // =========================

    await emitLog(
      '[CI-LOGS] Pushing ci-logs branch'
    );

    const pushResult =
      await auditGit.push(
        'origin',
        ciBranch
      );

    console.log(
      '[CI-LOGS] PUSH:',
      pushResult
    );

    await emitLog(
      '[CI-LOGS] Push successful'
    );

  } catch (err) {

    console.error(
      '[CI-LOGS ERROR]',
      err
    );

    await emitLog(
      `[CI-LOGS] Push failed: ${err.message}`
    );
  }
}

/* =========================
   PUSH TO TARGET REPO (PHASE 7)
========================= */
async function pushMetadataToTarget(job, repoDir, emitLog) {
  try {
    const git = simpleGit(repoDir);
    const sourceBranch = job.branch || 'main';

    await emitLog('📝 Preparing target branch metadata');

    // Switch back to the source branch
    await git.checkout(sourceBranch);

    // Create build metadata
    const metadataPath = path.join(repoDir, '.nova-build.json');
    const metadata = {
      jobId: job.id,
      status: job.status,
      completedAt: job.completedAt,
      priority: job.priorityScore || 0,
      priorityReason: job.priorityReason || 'Default'
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    await git.add('.nova-build.json');

    const staged = await git.diff(['--cached']);
    if (staged && staged.trim().length > 0) {
      await emitLog('📝 Committing build metadata to target branch');
      await git.commit(`ci(nova): update build metadata for job ${job.id} [skip ci]`);

      await emitLog(`⬆️ Pushing to target branch: ${sourceBranch}`);
      await git.push('origin', sourceBranch);
      await emitLog('✅ Target branch push successful');
    } else {
      await emitLog('ℹ️ No metadata changes to push to target branch');
    }

    // Switch back to ci-logs for existing logic if needed
    await git.checkout('ci-logs');

  } catch (err) {
    console.error('❌ TARGET PUSH ERROR:', err);
    await emitLog(`❌ Target push failed: ${err.message}`);
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

        // =========================
        // FETCH REMOTE BRANCHES
        // =========================

        await repoGit.fetch();

        const remoteBranches =
          await repoGit.branch([
            '-r'
          ]);

        // =========================
        // FORCE CLEAN WORKTREE
        // =========================

        await repoGit.reset([
          '--hard'
        ]);

        await repoGit.clean(
          'f',
          ['-d']
        );

        // =========================
        // SWITCH TO ci-logs
        // =========================

        if (
          remoteBranches.all.includes(
            `origin/${ciBranch}`
          )
        ) {

          // Checkout existing ci-logs branch
          await repoGit.checkout([
            '-B',
            ciBranch,
            `origin/${ciBranch}`
          ]);

          console.log(
            `✅ Checked out existing ${ciBranch}`
          );

        } else {

          // Create fresh ci-logs branch
          await repoGit.checkout([
            '-b',
            ciBranch
          ]);

          console.log(
            `✅ Created new ${ciBranch} branch`
          );

          // Push branch upstream
          await repoGit.push(
            'origin',
            ciBranch,
            ['-u']
          );
        }

        // =========================
        // VERIFY ACTIVE BRANCH
        // =========================

        const activeBranch =
          await repoGit.branchLocal();

        console.log(
          'ACTIVE BRANCH:',
          activeBranch.current
        );

        if (
          activeBranch.current !== ciBranch
        ) {

          throw new Error(
            `Failed to switch to ${ciBranch}`
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

        await pushMetadataToTarget(
          job,
          repoDir,
          emitLog
        );

        await appendToNovaFile(
          job,
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