const { Worker } = require('bullmq');

const {
  connection,
  nodeQueue,
  pythonQueue,
  dockerQueue
} = require('../queue/redisQueue');

const { runJob } = require('./jobRunner');

const logger = require('../config/logger');

/*
========================================
WORKER REGISTRY
========================================
*/

const workerRegistry = [];

/*
========================================
HELPER
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

      job.data.workerType = type;
      job.data.workerName = name;
      job.data.queueName = queue.name;

      await runJob(job.data);
    },

    {
      connection,
      concurrency
    }
  );

  /*
  ========================================
  EVENTS
  ========================================
  */

  worker.on('active', (job) => {

    logger.info(
      `[${name}] ACTIVE ${job.id}`
    );
  });

  worker.on('completed', (job) => {

    logger.info(
      `[${name}] COMPLETED ${job.id}`
    );
  });

  worker.on('failed', (job, err) => {

    logger.error(
      `[${name}] FAILED ${job?.id}: ${err.message}`
    );
  });

  worker.on('error', (err) => {

    logger.error(
      `[${name}] ERROR: ${err.message}`
    );
  });

  /*
  ========================================
  REGISTRY
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
START WORKERS
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