const queue = [];

/* =========================
   ADD JOB
========================= */
function addJob(job) {
    queue.push(job);
}

/* =========================
   GET NEXT JOB
========================= */
function getNextJob() {
    return queue.shift();
}

/* =========================
   CHECK QUEUE
========================= */
function hasJobs() {
    return queue.length > 0;
}

module.exports = {
    addJob,
    getNextJob,
    hasJobs
};