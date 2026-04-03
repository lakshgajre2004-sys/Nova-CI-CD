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

module.exports = { parseStages };
