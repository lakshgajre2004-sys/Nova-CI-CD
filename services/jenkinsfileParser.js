const REPO_CONFIG = {
  "repo1": {
    "main": ["Checkout", "Build", "Test", "Deploy"],
    "dev": ["Checkout", "Build", "Test"]
  }
};

const DEFAULT_STAGES = ["Checkout", "Build", "Test"];

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
