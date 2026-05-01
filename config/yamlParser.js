const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function parseYamlConfig(repoDir) {
  const yamlPath = path.join(repoDir, '.nova-ci.yml');
  const ymlPath = path.join(repoDir, '.nova-ci.yml'); // Can support .yml as well

  let filePath = fs.existsSync(yamlPath) ? yamlPath : fs.existsSync(ymlPath) ? ymlPath : null;

  if (filePath) {
    try {
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const data = yaml.load(fileContents);
      
      if (data && data.pipeline && data.pipeline.stages) {
        return data.pipeline.stages;
      }
    } catch (e) {
      console.error(`Failed to parse YAML config in ${repoDir}`, e);
    }
  }

  return null;
}

module.exports = { parseYamlConfig };
