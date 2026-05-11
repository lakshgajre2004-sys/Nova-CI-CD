const { parseYamlConfig } = require('../config/yamlParser');

function getPipelineConfig(repoDir) {

  // 1. Check for YAML config (.nova-ci.yml)
  const yamlStages = parseYamlConfig(repoDir);

  if (yamlStages && yamlStages.length > 0) {
    return yamlStages;
  }

  /*
    =====================================================
    DEFAULT PIPELINE
    Added artificial delay to demonstrate:
    - queue backlog
    - priority dequeueing
    - non-FIFO scheduling
    =====================================================
  */

  return [

    {
      name: "Install Dependencies",
      commands: [
        "npm install"
      ]
    },

    {
      name: "Build Project",
      commands: [
        "npm run build"
      ]
    },

    {
      name: "Test",
      commands: [
        "npm test"
      ]
    }

  ];
}

module.exports = { getPipelineConfig };
