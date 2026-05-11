const fs = require('fs');
const path = require('path');

/*
========================================
DETERMINE WORKER TYPE
========================================
*/

function determineWorkerType(jobData) {

  const repo =
    (jobData.repo || '').toLowerCase();

  const branch =
    (jobData.branch || '').toLowerCase();

  /*
  ========================================
  1. CRITICAL DOCKER DETECTION FIRST
  ========================================
  */

  if (
    repo.includes('docker') ||
    repo.includes('container') ||
    repo.includes('k8s') ||
    repo.includes('kubernetes') ||
    branch.includes('docker') ||
    branch.includes('container') ||
    branch.includes('k8s')
  ) {

    return 'docker';
  }

  /*
  ========================================
  2. PYTHON DETECTION
  ========================================
  */

  if (
    repo.includes('python') ||
    repo.includes('django') ||
    repo.includes('flask') ||
    repo.includes('fastapi')
  ) {

    return 'python';
  }

  /*
  ========================================
  3. NODE DETECTION
  ========================================
  */

  if (
    repo.includes('react') ||
    repo.includes('node') ||
    repo.includes('express') ||
    repo.includes('js') ||
    repo.includes('javascript')
  ) {

    return 'node';
  }

  /*
  ========================================
  4. FILE SYSTEM ANALYSIS
  ========================================
  */

  try {

    const repoPath = path.join(
      __dirname,
      '..',
      'repos',
      repo.replace('/', '-')
    );

    if (fs.existsSync(repoPath)) {

      const files = fs.readdirSync(
        repoPath,
        { recursive: true }
      );

      /*
      ====================================
      DOCKER FILE DETECTION FIRST
      ====================================
      */

      if (
        files.some(file =>

          file === 'Dockerfile' ||

          file === 'docker-compose.yml' ||

          file.endsWith('.dockerfile')
        )
      ) {

        return 'docker';
      }

      /*
      ====================================
      PYTHON FILE DETECTION
      ====================================
      */

      if (
        files.some(file =>

          file.endsWith('.py') ||

          file === 'requirements.txt' ||

          file === 'Pipfile' ||

          file === 'pyproject.toml'
        )
      ) {

        return 'python';
      }

      /*
      ====================================
      NODE FILE DETECTION
      ====================================
      */

      if (
        files.some(file =>

          file === 'package.json' ||

          file.endsWith('.js') ||

          file.endsWith('.jsx') ||

          file.endsWith('.ts') ||

          file.endsWith('.tsx')
        )
      ) {

        return 'node';
      }
    }

  } catch (err) {

    console.error(
      '[WorkerRouter] Detection failed:',
      err.message
    );
  }

  /*
  ========================================
  5. FALLBACK
  ========================================
  */

  return 'generic';
}

/*
========================================
QUEUE ROUTING
========================================
*/

function getQueueForType(workerType) {

  const {
    nodeQueue,
    pythonQueue,
    dockerQueue,
    genericQueue
  } = require('../queue/redisQueue');

  switch (workerType) {

    case 'docker':
      return dockerQueue;

    case 'python':
      return pythonQueue;

    case 'node':
      return nodeQueue;

    default:
      return genericQueue;
  }
}

/*
========================================
EXPORTS
========================================
*/

module.exports = {
  determineWorkerType,
  getQueueForType
};