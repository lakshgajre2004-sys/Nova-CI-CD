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

    const tempLogsDir = path.join(
      __dirname,
      '..',
      'temp',
      `ci-logs-${Date.now()}`
    );

    const repoUrl =
      process.env.GITHUB_REPO_URL;

    const ciBranch =
      'ci-logs';

    await emitLog(
      '[CI-LOGS] Creating isolated logging workspace'
    );

    await simpleGit().clone(
      repoUrl,
      tempLogsDir
    );

    const git =
      simpleGit(tempLogsDir);

    await git.fetch();

    const branches =
      await git.branch([
        '-a'
      ]);

    if (
      branches.all.includes(
        `remotes/origin/${ciBranch}`
      )
    ) {

      await git.checkout([
        '-B',
        ciBranch,
        `origin/${ciBranch}`
      ]);

    } else {

      await git.checkoutLocalBranch(
        ciBranch
      );

      await git.push(
        'origin',
        ciBranch,
        ['-u']
      );
    }

    const filePath =
      path.join(
        tempLogsDir,
        'NOVA.txt'
      );

    if (!fs.existsSync(filePath)) {

      fs.writeFileSync(
        filePath,
        ''
      );
    }

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

    await git.addConfig(
      'user.email',
      'ci@nova.com'
    );

    await git.addConfig(
      'user.name',
      'Nova CI'
    );

    await git.add(
      './NOVA.txt'
    );

    const staged =
      await git.diff([
        '--cached'
      ]);

    if (
      staged &&
      staged.trim().length > 0
    ) {

      await git.commit(
        'Nova CI Update [skip ci]'
      );

      await git.push(
        'origin',
        ciBranch
      );

      await emitLog(
        '[CI-LOGS] Push successful'
      );

    } else {

      await emitLog(
        '[CI-LOGS] No changes detected'
      );
    }

    fs.rmSync(
      tempLogsDir,
      {
        recursive: true,
        force: true
      }
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
   PUSH TO TARGET REPO
========================= */
async function pushMetadataToTarget(job, repoDir, emitLog) {

  try {

    const git =
      simpleGit(repoDir);

    const sourceBranch =
      job.branch || 'main';

    await emitLog(
      '📝 Preparing target branch metadata'
    );

    await git.checkout(
      sourceBranch
    );

    const metadataPath =
      path.join(
        repoDir,
        '.nova-build.json'
      );

    const metadata = {
      jobId: job.id,
      status: job.status,
      completedAt: job.completedAt,
      priority: job.priorityScore || 0,
      priorityReason:
        job.priorityReason || 'Default'
    };

    fs.writeFileSync(
      metadataPath,
      JSON.stringify(
        metadata,
        null,
        2
      )
    );

    await git.add(
      '.nova-build.json'
    );

    const staged =
      await git.diff([
        '--cached'
      ]);

    if (
      staged &&
      staged.trim().length > 0
    ) {

      await emitLog(
        '📝 Committing build metadata'
      );

      await git.commit(
        `ci(nova): update build metadata for job ${job.id} [skip ci]`
      );

      await emitLog(
        `⬆️ Pushing to branch: ${sourceBranch}`
      );

      await git.push(
        'origin',
        sourceBranch
      );

      await emitLog(
        '✅ Target branch push successful'
      );

    } else {

      await emitLog(
        'ℹ️ No metadata changes to push'
      );
    }

  } catch (err) {

    console.error(
      '❌ TARGET PUSH ERROR:',
      err
    );

    await emitLog(
      `❌ Target push failed: ${err.message}`
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

      job.status =
        'IN_PROGRESS';

      job.startedAt =
        new Date().toISOString();

      await prisma.job.update({
        where: {
          id: job.id
        },
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

      const tempDir =
        path.join(
          __dirname,
          '..',
          'temp',
          `job-${job.id}`
        );

      const repoDir =
        tempDir;

      try {

        fs.mkdirSync(
          tempDir,
          {
            recursive: true
          }
        );

        const repoName =
          job.repo
            .split('/')
            .pop()
            .replace('.git', '');

        const repoPath =
          path.join(
            __dirname,
            '..',
            repoName
          );

        await emitLog(
          `Copying ${repoName} to temp workspace`
        );

        if (
          fs.existsSync(repoDir)
        ) {

          fs.rmSync(
            repoDir,
            {
              recursive: true,
              force: true
            }
          );
        }

        fs.cpSync(
          repoPath,
          repoDir,
          {
            recursive: true
          }
        );

        const repoGit =
          simpleGit(repoDir);

        const sourceBranch =
          job.branch || 'main';

        await repoGit.fetch();

        await repoGit.reset([
          '--hard'
        ]);

        await repoGit.clean(
          'f',
          ['-d']
        );

        await repoGit.checkout([
          '-B',
          sourceBranch,
          `origin/${sourceBranch}`
        ]);

        console.log(
          `✅ Checked out source branch: ${sourceBranch}`
        );

      } catch (err) {

        await emitLog(
          `Clone failed: ${err.message}`
        );

        job.status =
          'FAILED';

        await prisma.job.update({
          where: {
            id: job.id
          },
          data: {
            status: job.status,
            failureReason:
              err.message
          }
        });

        broadcastJobUpdate(
          job,
          'job_failed'
        );

        return resolve();
      }

      const repoName =
        job.repo
          .split('/')
          .pop()
          .replace('.git', '');

      const stages =
        getPipelineConfig(
          repoDir,
          repoName,
          job.branch
        );

      if (
        !stages ||
        stages.length === 0
      ) {

        await emitLog(
          'No pipeline config found'
        );

        job.status =
          'FAILED';

        return resolve();
      }

      job.stages =
        stages;

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
            s =>
              s.name === stage.name
          );

        const start =
          Date.now();

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

        await new Promise(
          resolve =>
            setTimeout(resolve, 3000)
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

            const stageName =
              stage.name.toLowerCase();

            /* =========================
               DOCKER BUILD
            ========================= */

            /* =========================
   DOCKER BUILD
========================= */

            if (
              stageName.includes(
                'docker build'
              )
            ) {

              const dockerfilePath =
                path.join(
                  repoDir,
                  'Dockerfile'
                );

              if (
                fs.existsSync(
                  dockerfilePath
                )
              ) {

                await emitLog(
                  '🐳 Dockerfile detected'
                );

                await runCommand(
                  `docker build -t nova-app-${job.id} .`,
                  repoDir,
                  emitLog
                );

              } else {

                await emitLog(
                  '⚠ No Dockerfile found. Skipping Docker build stage.'
                );
              }
            }

            /* =========================
               RUN CONTAINER
            ========================= */

            else if (
              stageName.includes(
                'run container'
              )
            ) {

              const dockerfilePath =
                path.join(
                  repoDir,
                  'Dockerfile'
                );

              if (
                fs.existsSync(
                  dockerfilePath
                )
              ) {

                await emitLog(
                  '🚀 Starting isolated container'
                );

                await runCommand(
                  `docker run --rm --name nova-job-${job.id} nova-app-${job.id}`,
                  repoDir,
                  emitLog
                );

              } else {

                await emitLog(
                  '⚠ Skipping container runtime (no Dockerfile)'
                );
              }
            }

            /* =========================
               PUSH
            ========================= */

            else if (
              stageName.includes(
                'push'
              )
            ) {

              await emitLog(
                `📦 Simulated push for nova-app-${job.id}`
              );
            }

            /* =========================
               INSTALL
            ========================= */

            else if (
              stageName.includes(
                'install'
              )
            ) {

              await runCommand(
                'npm install',
                repoDir,
                emitLog
              );
            }

            /* =========================
               TEST
            ========================= */

            else if (
              stageName.includes(
                'test'
              )
            ) {

              await runCommand(
                'npm test',
                repoDir,
                emitLog
              );
            }

            /* =========================
               BUILD
            ========================= */

            else if (
              stageName.includes(
                'build'
              )
            ) {

              await runCommand(
                'npm run build',
                repoDir,
                emitLog
              );
            }

            /* =========================
               SECURITY
            ========================= */

            else if (
              stageName.includes(
                'security'
              )
            ) {

              await runCommand(
                'npm audit',
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

      job.status =
        failed
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

      /* =========================
         CLEANUP
      ========================= */

      try {

        await runCommand(
          `docker rm -f nova-job-${job.id}`,
          repoDir,
          emitLog
        );

      } catch { }

      try {

        await runCommand(
          `docker rmi -f nova-app-${job.id}`,
          repoDir,
          emitLog
        );

      } catch { }

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

      try {

        fs.rmSync(
          repoDir,
          {
            recursive: true,
            force: true
          }
        );

      } catch { }

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

      resolve();
    }
  );
}

module.exports = {
  executePipeline
};