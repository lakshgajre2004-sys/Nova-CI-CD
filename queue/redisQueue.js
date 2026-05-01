const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

// Shared redis connection for BullMQ
const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

const jobQueue = new Queue('nova-ci-jobs', { connection });

module.exports = { jobQueue, connection };
