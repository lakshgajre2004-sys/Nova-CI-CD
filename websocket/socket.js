const { Server } = require('socket.io');

let io;

function init(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[${new Date().toISOString()}] [Client] [Connected] [SocketID: ${socket.id}]`);

    socket.on('join_job', (jobId) => {
      socket.join(jobId);
      console.log(`[${new Date().toISOString()}] [Client] [SocketID: ${socket.id}] joined job room: ${jobId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[${new Date().toISOString()}] [Client] [Disconnected] [SocketID: ${socket.id}]`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}

function broadcastJobUpdate(job, eventName, stageName = null) {
  if (!io) return;

  const totalStages = job.stages ? job.stages.length : 0;
  let completedStages = 0;

  if (totalStages > 0) {
    completedStages = job.stages.filter(s => s.status === 'SUCCESS' || s.status === 'FAILED').length;
  }

  const progressPercentage = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

  const { shouldFail, ...publicJobData } = job;

  const payload = {
    jobId: publicJobData.id,
    status: publicJobData.status,
    currentStage: publicJobData.currentStage,
    stages: publicJobData.stages,
    progressPercentage,
    executionType: publicJobData.executionType || 'sequential'
  };

  const stageLog = stageName ? ` [Stage: ${stageName}]` : '';
  console.log(`[${new Date().toISOString()}] [${publicJobData.id}] [${eventName}]${stageLog}`);

  // Global broadcast for dashboard overview
  io.emit('job_update', payload);

  // Job-specific broadcast for detailed subscribers
  io.to(publicJobData.id).emit('job_update', payload);
}

module.exports = { init, getIO, broadcastJobUpdate };
