const fs = require('fs');
const path = require('path');

const REPO_CONFIG = {
  "repo1": {
    "main": ["Fetch Code", "Install Dependencies", "Build", "Test", "Security Scan", "Docker Build", "Push to Registry"],
    "dev": ["Fetch Code", "Install Dependencies", "Build", "Test", "Security Scan"]
  }
};

const DEFAULT_STAGES = ["Fetch Code", "Install Dependencies", "Build", "Test", "Security Scan", "Docker Build", "Push to Registry"];

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
      const stageRegex = /stage\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      
      let match;
      const stageNames = [];
      while ((match = stageRegex.exec(content)) !== null) {
        stageNames.push(match[1]);
      }
      
      if (stageNames.length > 0) {
        return stageNames.map(name => ({
          name,
          status: "PENDING",
          startTime: null,
          endTime: null
        }));
      }
    }
  } catch (err) {
    console.error("Error parsing Jenkinsfile:", err);
  }
  return null;
}

module.exports = { parseStages, parseJenkinsfile };
