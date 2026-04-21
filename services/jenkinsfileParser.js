const fs = require('fs');
const path = require('path');

const REPO_CONFIG = {
  "repo1": {
    "main": [
      "Fetch Code",
      "Install Dependencies",
      "Build",
      "Test",
      "Security Scan",
      "Docker Build",
      "Run Container",        // ✅ ADDED
      "Push to Registry"
    ],
    "dev": [
      "Fetch Code",
      "Install Dependencies",
      "Build",
      "Test",
      "Security Scan"
    ]
  }
};

// 🔥 DEFAULT STAGES (UPDATED)
const DEFAULT_STAGES = [
  "Fetch Code",
  "Install Dependencies",
  "Build",
  "Test",
  "Security Scan",
  "Docker Build",
  "Run Container",     // ✅ ADDED
  "Push to Registry"
];

function parseStages(repo, branch) {
  let stageNames = DEFAULT_STAGES;
  
  if (REPO_CONFIG[repo] && REPO_CONFIG[repo][branch]) {
    stageNames = REPO_CONFIG[repo][branch];
  }
  
  return stageNames.map(name => ({
    name,
    status: "PENDING",
    startTime: null,
    endTime: null
  }));
}

function parseJenkinsfile(repoDir) {
  try {
    const jenkinsfilePath = path.join(repoDir, 'Jenkinsfile');

    if (fs.existsSync(jenkinsfilePath)) {
      const content = fs.readFileSync(jenkinsfilePath, 'utf8');

      const tokens = [];
      const re = /parallel|stage\s*\(\s*['"]([^'"]+)['"]\s*\)|when\s*\{\s*branch\s*['"]([^'"]+)['"]\s*\}|\{|\}/g;

      let match;
      while ((match = re.exec(content))) {
        const text = match[0];
        if (text === 'parallel') tokens.push({ type: 'parallel' });
        else if (text.startsWith('stage')) tokens.push({ type: 'stage', name: match[1] });
        else if (text.startsWith('when')) tokens.push({ type: 'when', branch: match[2] });
        else if (text === '{') tokens.push({ type: '{' });
        else if (text === '}') tokens.push({ type: '}' });
      }

      let inParallel = false;
      let parallelDepth = -1;
      let depth = 0;
      let stages = [];
      let parallelGroup = null;
      let lastStage = null;

      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];

        if (t.type === '{') {
          depth++;
        } else if (t.type === '}') {
          depth--;
          if (inParallel && depth === parallelDepth) {
            inParallel = false;
            parallelGroup = null;
            parallelDepth = -1;
          }
        } else if (t.type === 'parallel') {
          inParallel = true;
          parallelDepth = depth;
          parallelGroup = {
            name: "Parallel Group",
            type: "parallel",
            stages: []
          };
          stages.push(parallelGroup);
        } else if (t.type === 'stage') {
          lastStage = {
            name: t.name,
            status: "PENDING",
            startTime: null,
            endTime: null,
            condition: null
          };

          if (inParallel && parallelGroup) {
            parallelGroup.stages.push(lastStage);
          } else {
            stages.push(lastStage);
          }
        } else if (t.type === 'when') {
          if (lastStage) {
            lastStage.condition = t.branch;
          }
        }
      }

      // 🔥 AUTO ADD RUN CONTAINER IF MISSING
      const stageNames = stages.map(s => s.name?.toLowerCase());

      if (!stageNames.includes("run container") && stageNames.includes("docker build")) {
        stages.push({
          name: "Run Container",
          status: "PENDING",
          startTime: null,
          endTime: null
        });
      }

      if (!stageNames.includes("push to registry") && stageNames.includes("docker build")) {
        stages.push({
          name: "Push to Registry",
          status: "PENDING",
          startTime: null,
          endTime: null
        });
      }

      if (stages.length > 0) {
        return stages;
      }
    }

  } catch (err) {
    console.error("Error parsing Jenkinsfile:", err);
  }

  return null;
}

module.exports = { parseStages, parseJenkinsfile };