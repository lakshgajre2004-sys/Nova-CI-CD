const workers = [
  { id: "worker-1", type: "node", status: "IDLE", currentJobId: null, lastActiveTime: Date.now(), currentProcess: null },
  { id: "worker-2", type: "python", status: "IDLE", currentJobId: null, lastActiveTime: Date.now(), currentProcess: null },
  { id: "worker-3", type: "general", status: "IDLE", currentJobId: null, lastActiveTime: Date.now(), currentProcess: null },
  { id: "worker-4", type: "general", status: "IDLE", currentJobId: null, lastActiveTime: Date.now(), currentProcess: null }
];

function getAvailableWorker(job) {
  const repoStr = (job.repo || "").toLowerCase();
  const branchStr = (job.branch || "").toLowerCase();
  
  let requiredType = "general";
  if (repoStr.includes("python") || branchStr.includes("python")) {
    requiredType = "python";
  } else if (repoStr.includes("node") || branchStr.includes("node")) {
    requiredType = "node";
  }

  // 1. Try to find an IDLE worker of the exact required type
  let worker = workers.find(w => w.type === requiredType && w.status === "IDLE");
  
  return worker;
}

function assignWorker(worker, job) {
  worker.status = "BUSY";
  worker.currentJobId = job.id;
  worker.currentProcess = null; // to be bound
  worker.lastActiveTime = Date.now();
  job.workerId = worker.id;
}

function releaseWorker(worker) {
  worker.status = "IDLE";
  worker.currentJobId = null;
  worker.currentProcess = null;
  worker.lastActiveTime = Date.now();
}

module.exports = {
  workers,
  getAvailableWorker,
  assignWorker,
  releaseWorker
};
