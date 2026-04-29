const fs = require('fs');
const path = require('path');

/* =========================
   DEFAULT PIPELINE
========================= */

const DEFAULT_STAGES = [
  "Fetch Code",
  "Install Dependencies",
  "Build",
  "Test",
  "Security Scan",
  "Docker Build",
  "Run Container"
];

/* =========================
   OPTIONAL STATIC CONFIG
========================= */

const REPO_CONFIG = {
  "repo1": {
    "main": DEFAULT_STAGES,
    "dev": [
      "Fetch Code",
      "Install Dependencies",
      "Build",
      "Test"
    ]
  }
};

/* =========================
   STAGE FORMATTER
========================= */

function formatStages(stageNames) {
  return stageNames.map(name => ({
    name,
    status: "PENDING",
    startTime: null,
    endTime: null
  }));
}

/* =========================
   STATIC CONFIG PARSER
========================= */

function parseStages(repo, branch) {
  if (REPO_CONFIG[repo] && REPO_CONFIG[repo][branch]) {
    return formatStages(REPO_CONFIG[repo][branch]);
  }

  return formatStages(DEFAULT_STAGES);
}

/* =========================
   JENKINSFILE PARSER
========================= */

function parseJenkinsfile(repoDir) {
  try {
    const filePath = path.join(repoDir, 'Jenkinsfile');

    if (!fs.existsSync(filePath)) {
      return formatStages(DEFAULT_STAGES);
    }

    const content = fs.readFileSync(filePath, 'utf8');

    const stageRegex = /stage\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    let match;
    const stages = [];

    while ((match = stageRegex.exec(content)) !== null) {
      stages.push(match[1]);
    }

    // ✅ If Jenkinsfile has stages → use them
    if (stages.length > 0) {
      return formatStages(stages);
    }

    // ❗ If Jenkinsfile exists but no valid stages
    console.log("⚠️ Jenkinsfile found but no valid stages → using default");

    return formatStages(DEFAULT_STAGES);

  } catch (err) {
    console.error("❌ Jenkinsfile parse error:", err.message);

    return formatStages(DEFAULT_STAGES);
  }
}

module.exports = { parseStages, parseJenkinsfile };