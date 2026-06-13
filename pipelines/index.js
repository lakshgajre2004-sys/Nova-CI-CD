const { parseYamlConfig } =
  require('../config/yamlParser');

const {
  parseJenkinsfile,
  parseStages
} = require('../services/jenkinsfileParser');

function getPipelineConfig(
  repoDir,
  repo = 'repo1',
  branch = 'main'
) {

  /*
  ============================================
  1. YAML CONFIG
  ============================================
  */

  const yamlStages =
    parseYamlConfig(repoDir);

  if (
    yamlStages &&
    yamlStages.length > 0
  ) {

    console.log(
      '✅ Using .nova-ci.yml pipeline'
    );

    return yamlStages;
  }

  /*
  ============================================
  2. JENKINSFILE PARSER
  ============================================
  */

  const parsedStages =
    parseJenkinsfile(repoDir);

  if (
    parsedStages &&
    parsedStages.length > 0
  ) {

    console.log(
      '✅ Using Jenkinsfile pipeline'
    );

    return parsedStages;
  }

  /*
  ============================================
  3. REPO DEFAULT PIPELINE
  ============================================
  */

  console.log(
    '⚠ Falling back to default pipeline'
  );

  return parseStages(
    repo,
    branch
  );
}

module.exports = {
  getPipelineConfig
};