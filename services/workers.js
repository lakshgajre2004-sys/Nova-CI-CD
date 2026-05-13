const { Worker } = require('bullmq');

const {
  connection,
  nodeQueue,
  pythonQueue,
  dockerQueue
} = require('../queue/redisQueue');

const { runJob } =
  require('./jobRunner');

const prisma =
  require('../db');

const logger =
  require('../config/logger');

/*
========================================
WORKER REGISTRY
========================================
*/

const workerRegistry = [];

/*
========================================
CREATE WORKER
========================================
*/

function createWorker({
  name,
  type,
  queue,
  concurrency = 1
}) {

  const worker = new Worker(

    queue.name,

    async (job) => {

      logger.info(
        `[${name}] Executing job ${job.data.id}`
      );

      /*
      ========================================
      ATTACH WORKER METADATA
      ========================================
      */

      job.data.workerType = type;

      job.data.workerName = name;

      job.data.queueName = queue.name;

      /*
      ========================================
      MARK JOB AS IN_PROGRESS
      ========================================
      */

      await prisma.job.update({

        where: {
          id: job.data.id
        },

        data: {

          status: 'IN_PROGRESS',

          startedAt: new Date(),

          workerType: type

        }

      });

      logger.info(
        `[${name}] Job ${job.data.id} marked IN_PROGRESS`
      );

      /*
      ========================================
      RUN JOB
      ========================================
      */

      await runJob(job.data);

      /*
      ========================================
      JOB COMPLETED
      ========================================
      */

      logger.info(
        `[${name}] Job ${job.data.id} completed successfully`
      );
    },

    {
      connection,
      concurrency
    }
  );

  /*
  ========================================
  ACTIVE EVENT
  ========================================
  */

  worker.on('active', (job) => {

    logger.info(
      `[${name}] ACTIVE ${job.id}`
    );
  });

  /*
  ========================================
  COMPLETED EVENT
  ========================================
  */

  worker.on('completed', (job) => {

    logger.info(
      `[${name}] COMPLETED ${job.id}`
    );
  });

  /*
  ========================================
  FAILED EVENT
  ========================================
  */

  worker.on('failed', async (job, err) => {

    logger.error(
      `[${name}] FAILED ${job?.id}: ${err.message}`
    );

    /*
    ========================================
    UPDATE DB STATUS
    ========================================
    */

    try {

      if (job?.data?.id) {

        await prisma.job.update({

          where: {
            id: job.data.id
          },

          data: {

            status: 'FAILED',

            completedAt: new Date(),

            failureReason: err.message

          }

        });
      }

    } catch (dbErr) {

      logger.error(
        `[${name}] Failed updating FAILED state: ${dbErr.message}`
      );
    }
  });

  /*
  ========================================
  WORKER ERROR
  ========================================
  */

  worker.on('error', (err) => {

    logger.error(
      `[${name}] ERROR: ${err.message}`
    );
  });

  /*
  ========================================
  REGISTER WORKER
  ========================================
  */

  workerRegistry.push({

    name,

    type,

    queue: queue.name,

    concurrency,

    worker

  });

  return worker;
}

/*
========================================
START ALL WORKERS
========================================
*/

function startWorkers() {

  logger.info(
    '🚀 Starting NOVA Specialized Worker Cluster...'
  );

  /*
  ========================================
  NODE WORKER #1
  ========================================
  */

  createWorker({

    name: 'Node Worker #1',

    type: 'node',

    queue: nodeQueue,

    concurrency: 1

  });

  /*
  ========================================
  NODE WORKER #2
  ========================================
  */

  createWorker({

    name: 'Node Worker #2',

    type: 'node',

    queue: nodeQueue,

    concurrency: 1

  });

  /*
  ========================================
  PYTHON WORKER
  ========================================
  */

  createWorker({

    name: 'Python Worker',

    type: 'python',

    queue: pythonQueue,

    concurrency: 1

  });

  /*
  ========================================
  DOCKER WORKER
  ========================================
  */

  createWorker({

    name: 'Docker Worker',

    type: 'docker',

    queue: dockerQueue,

    concurrency: 1

  });

  logger.info(
    '✅ 4-worker distributed runtime initialized'
  );
}

/*
========================================
WORKER TELEMETRY
========================================
*/

function getWorkerStats() {

  return workerRegistry.map((w) => ({

    name: w.name,

    type: w.type,

    queue: w.queue,

    concurrency: w.concurrency,

    active: true

  }));
}

/*
========================================
EXPORTS
========================================
*/

module.exports = {

  startWorkers,

  getWorkerStats,

  workerRegistry

};