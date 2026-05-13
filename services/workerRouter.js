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
  EXTRACT REPO NAME
  ========================================
  */

  const repoName =
    repo
      .split('/')
      .pop()
      .replace('.git', '');

  /*
  ========================================
  1. CRITICAL DOCKER DETECTION
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

    console.log(
      `[WorkerRouter] ${repoName} routed to DOCKER worker (keyword match)`
    );

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

    console.log(
      `[WorkerRouter] ${repoName} routed to PYTHON worker (keyword match)`
    );

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

    console.log(
      `[WorkerRouter] ${repoName} routed to NODE worker (keyword match)`
    );

    return 'node';
  }

  /*
  ========================================
  4. FILE SYSTEM ANALYSIS
  ========================================
  */

  try {

    /*
    ====================================
    LOCAL DEV REPO PATHS
    ====================================
    */

    const possiblePaths = [

      path.join(
        __dirname,
        '..',
        repoName
      ),

      path.join(
        __dirname,
        '..',
        'temp-repos',
        repoName
      )
    ];

    let repoPath = null;

    for (const p of possiblePaths) {

      if (fs.existsSync(p)) {

        repoPath = p;
        break;
      }
    }

    if (!repoPath) {

      console.log(
        `[WorkerRouter] Repo path not found for ${repoName}`
      );

      return 'generic';
    }

    console.log(
      `[WorkerRouter] Inspecting repo path: ${repoPath}`
    );

    const files = fs.readdirSync(
      repoPath,
      { recursive: true }
    );

    /*
    ====================================
    DOCKER DETECTION FIRST
    ====================================
    */

    if (
      files.some(file =>

        file === 'Dockerfile' ||

        file === 'docker-compose.yml' ||

        file.endsWith('.dockerfile')
      )
    ) {

      console.log(
        `[WorkerRouter] ${repoName} routed to DOCKER worker`
      );

      return 'docker';
    }

    /*
    ====================================
    PYTHON DETECTION SECOND
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

      console.log(
        `[WorkerRouter] ${repoName} routed to PYTHON worker`
      );

      return 'python';
    }

    /*
    ====================================
    NODE DETECTION LAST
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

      console.log(
        `[WorkerRouter] ${repoName} routed to NODE worker`
      );

      return 'node';
    }

    console.log(
      `[WorkerRouter] ${repoName} routed to GENERIC worker`
    );

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

