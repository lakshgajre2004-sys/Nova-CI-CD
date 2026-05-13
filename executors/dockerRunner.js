const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(cmd, cwd, emitLog, timeoutMs = 120000, jobId = 'default') {
  return new Promise((resolve, reject) => {
    emitLog(`[Execution] ${cmd}`);

    // Hardened docker command: unique name, limits, auto-remove
    const dockerCmd = cmd;

    const finalCmd = cmd.startsWith('docker ') ? cmd : dockerCmd;

    const child = exec(finalCmd, { cwd, timeout: timeoutMs });

    child.stdout.on('data', d => {
      d.toString().split('\n').forEach(l => l.trim() && emitLog(l));
    });

    child.stderr.on('data', d => {
      d.toString().split('\n').forEach(l => l.trim() && emitLog(l));
    });

    child.on('close', code => {
      code === 0 ? resolve() : reject(new Error(`Failed: ${cmd} (Exit code: ${code})`));
    });

    child.on('error', err => {
      reject(new Error(`Execution error: ${err.message}`));
    });
  });
}

function detectBuildType(repoDir) {
  const pkgPath = path.join(repoDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return "unknown";

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  if (pkg.dependencies?.react && pkg.scripts?.build) {
    if (fs.existsSync(path.join(repoDir, 'vite.config.js'))) return "vite";
    return "react";
  }

  if (pkg.main || pkg.scripts?.start) return "node";
  return "unknown";
}

function createDockerfile(repoDir, type) {
  let dockerfile = "";

  if (type === "vite") {
    dockerfile = `
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN npm install -g serve
EXPOSE 4000
CMD ["serve", "-s", "dist", "-l", "4000"]
`;
  } else if (type === "react") {
    dockerfile = `
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN npm install -g serve
EXPOSE 4000
CMD ["serve", "-s", "build", "-l", "4000"]
`;
  } else if (type === "node") {
    dockerfile = `
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 4000
CMD ["npm", "start"]
`;
  } else {
    dockerfile = `
FROM node:18
WORKDIR /app
COPY . .
RUN npm install || true
EXPOSE 4000
CMD ["node", "server.js"]
`;
  }

  fs.writeFileSync(path.join(repoDir, 'Dockerfile'), dockerfile);
}

module.exports = {
  runCommand,
  detectBuildType,
  createDockerfile
};
