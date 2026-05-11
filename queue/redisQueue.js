const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

// Shared redis connection for BullMQ
const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

const jobQueue = new Queue('nova-ci-jobs', { connection });
const nodeQueue = new Queue('nova-node-jobs', { connection });
const pythonQueue = new Queue('nova-python-jobs', { connection });
const dockerQueue = new Queue('nova-docker-jobs', { connection });
const genericQueue = new Queue('nova-generic-jobs', { connection });

module.exports = { jobQueue, nodeQueue, pythonQueue, dockerQueue, genericQueue, connection };
