class JobStore {
  constructor() {
    this.jobs = new Map(); // id -> job object
    this.queue = [];       // array of job ids
  }

  addJob(job) {
    this.jobs.set(job.id, job);
  }

  getJob(id) {
    return this.jobs.get(id);
  }

  enqueue(id) {
    this.queue.push(id);
  }

  dequeue() {
    if (this.queue.length === 0) return undefined;
    
    let highestIndex = 0;
    let highestPriority = Infinity;

    // Scan the queue to find the job with the highest priority (lowest number = highest priority)
    // Scanning left-to-right preserves FIFO behavior for tied priorities.
    for (let i = 0; i < this.queue.length; i++) {
      const jobId = this.queue[i];
      const job = this.jobs.get(jobId);
      
      const priority = (job && job.priority !== undefined) ? job.priority : 3;
      
      if (priority < highestPriority) {
        highestPriority = priority;
        highestIndex = i;
      }
    }

    // Log if we prioritized this job over an older job
    if (highestIndex > 0) {
      const selectedJob = this.jobs.get(this.queue[highestIndex]);
      const skippedJob = this.jobs.get(this.queue[0]);
      if (selectedJob && skippedJob) {
        console.log(`[Scheduler] Job ${selectedJob.id} (${selectedJob.branch}) selected over Job ${skippedJob.id} (${skippedJob.branch})`);
      }
    }

    return this.queue.splice(highestIndex, 1)[0];
  }

  getAllJobs() {
    return Array.from(this.jobs.values());
  }
}

module.exports = new JobStore();
