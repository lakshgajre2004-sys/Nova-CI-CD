const repositories = require('../config/repositories');

function calculatePriority(job) {
  let score = 0;
  let reason = [];

  const {
    branch,
    repo,
    isRetry,
    isDeployment,
    isRecovery
  } = job;

  /*
    ============================================
    1. BRANCH PRIORITY RULES
    Higher score = Higher logical importance
    BullMQ priority is inverted later
    ============================================
  */

  if (
    /^hotfix\//.test(branch) ||
    /^security\//.test(branch) ||
    branch === 'production' ||
    branch === 'master'
  ) {

    score += 100;
    reason.push('Critical Branch');

  } else if (
    branch === 'main' ||
    branch === 'staging' ||
    branch === 'preprod' ||
    /^release\//.test(branch)
  ) {

    score += 70;
    reason.push('High Priority Branch');

  } else if (
    /^feature\//.test(branch) ||
    /^backend\//.test(branch) ||
    /^frontend\//.test(branch)
  ) {

    score += 40;
    reason.push('Medium Priority Branch');

  } else if (
    /^docs\//.test(branch) ||
    /^chore\//.test(branch) ||
    /^refactor\//.test(branch) ||
    branch === 'test' ||
    branch === 'demo'
  ) {

    score += 10;
    reason.push('Low Priority Branch');

  } else {

    score += 20;
    reason.push('Default Branch');
  }

  /*
    ============================================
    2. REPOSITORY CRITICALITY
    ============================================
  */

  const repoConfig = repositories.find(
    r => r.repo === repo || r.name === repo
  );

  if (repoConfig) {

    if (repoConfig.criticality === 'critical') {

      score += 50;
      reason.push('Critical Repo');

    } else if (repoConfig.criticality === 'high') {

      score += 30;
      reason.push('High Criticality Repo');

    } else if (repoConfig.criticality === 'medium') {

      score += 20;
      reason.push('Medium Criticality Repo');
    }

    if (repoConfig.deploymentTier === 'production') {

      score += 20;
      reason.push('Production Tier');
    }
  }

  /*
    ============================================
    3. EXECUTION BOOSTS
    ============================================
  */

  if (isDeployment) {

    score += 50;
    reason.push('Deployment Job');
  }

  if (isRetry) {

    score += 30;
    reason.push('Retry Job');
  }

  if (isRecovery) {

    score += 40;
    reason.push('Failed Recovery');
  }

  /*
    ============================================
    FINAL BULLMQ PRIORITY
    BullMQ:
      SMALLER number = HIGHER priority
    So we invert the score.
    ============================================
  */

  const bullmqPriority = Math.max(1, 1000 - score);

  return {
    score,
    reason: reason.join(', '),
    bullmqPriority
  };
}

module.exports = { calculatePriority };