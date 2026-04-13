const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'database.json');

class JobStore {
  constructor() {
    this.jobs = new Map(); // id -> job object
    this.queue = [];       // array of job ids
    this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        if (data.jobs) {
          for (const [id, job] of Object.entries(data.jobs)) {
            // Re-mark any "IN_PROGRESS" jobs or "QUEUED" jobs as failed or re-queue them if we died? 
            // Better behavior: anything in progress when we died should be marked FAILED
            if (job.status === 'IN_PROGRESS' || job.status === 'QUEUED') {
              job.status = 'FAILED';
              job.logs = job.logs || [];
              job.logs.push('[System] Job failed due to unexpected server restart.');
            }
            this.jobs.set(id, job);
          }
        }
        // We won't restore the queue directly since we marked everything as FAILED to avoid dangling state.
      }
    } catch (err) {
      console.error("Failed to load DB state:", err);
    }
  }

  saveState() {
    try {
      const dbObj = { jobs: {}, queue: this.queue };
      for (const [id, job] of this.jobs.entries()) {
        dbObj.jobs[id] = job;
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dbObj, null, 2));
    } catch (err) {
      console.error("Failed to save DB state:", err);
    }
  }

  addJob(job) {
    this.jobs.set(job.id, job);
    this.saveState();
  }

  getJob(id) {
    return this.jobs.get(id);
  }

  enqueue(id) {
    this.queue.push(id);
    this.saveState();
  }

  dequeue() {
    if (this.queue.length === 0) return undefined;
    
    let highestIndex = 0;
    let highestPriority = Infinity;

    for (let i = 0; i < this.queue.length; i++) {
      const jobId = this.queue[i];
      const job = this.jobs.get(jobId);
      
      const priority = (job && job.priority !== undefined) ? job.priority : 3;
      
      if (priority < highestPriority) {
        highestPriority = priority;
        highestIndex = i;
      }
    }

    if (highestIndex > 0) {
      const selectedJob = this.jobs.get(this.queue[highestIndex]);
      const skippedJob = this.jobs.get(this.queue[0]);
      if (selectedJob && skippedJob) {
        console.log(`[Scheduler] Job ${selectedJob.id} (${selectedJob.branch}) selected over Job ${skippedJob.id} (${skippedJob.branch})`);
      }
    }

    const dequeued = this.queue.splice(highestIndex, 1)[0];
    this.saveState();
    return dequeued;
  }

  getAllJobs() {
    return Array.from(this.jobs.values());
  }
}

module.exports = new JobStore();
