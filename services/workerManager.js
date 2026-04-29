const workers = [
  { id: "worker-1", type: "node", status: "IDLE", currentJobId: null },
  { id: "worker-2", type: "python", status: "IDLE", currentJobId: null },
  { id: "worker-3", type: "general", status: "IDLE", currentJobId: null },
  { id: "worker-4", type: "general", status: "IDLE", currentJobId: null }
];

/* =========================
   DETECT JOB TYPE
========================= */

function detectType(job) {
  const repo = (job.repo || "").toLowerCase();
  const branch = (job.branch || "").toLowerCase();

  if (repo.includes("python") || branch.includes("python")) return "python";
  if (repo.includes("node") || branch.includes("node")) return "node";

  return "general";
}

/* =========================
   GET AVAILABLE WORKER
========================= */

function getAvailableWorker(job) {
  const requiredType = detectType(job);

  // 1️⃣ Exact match
  let worker = workers.find(
    w => w.type === requiredType && w.status === "IDLE"
  );

  // 2️⃣ Fallback to general
  if (!worker) {
    worker = workers.find(
      w => w.type === "general" && w.status === "IDLE"
    );
  }

  // 3️⃣ Fallback to ANY idle worker
  if (!worker) {
    worker = workers.find(w => w.status === "IDLE");
  }

  if (worker) {
    console.log(`[WorkerManager] Selected ${worker.id} (${worker.type})`);
  } else {
    console.log("[WorkerManager] No worker available");
  }

  return worker;
}

/* =========================
   ASSIGN WORKER
========================= */

function assignWorker(worker, job) {
  if (!worker) return;

  worker.status = "BUSY";
  worker.currentJobId = job.id;
  job.workerId = worker.id;

  console.log(`[WorkerManager] Assigned ${worker.id} → Job ${job.id}`);
}

/* =========================
   RELEASE WORKER
========================= */

function releaseWorker(worker) {
  if (!worker) return;

  console.log(`[WorkerManager] Releasing ${worker.id}`);

  worker.status = "IDLE";
  worker.currentJobId = null;
}

module.exports = {
  workers,
  getAvailableWorker,
  assignWorker,
  releaseWorker
};