let yaml;
try {
  yaml = require('js-yaml');
} catch (e) {
  yaml = null;
}

const parseYaml = (yamlString) => {
  if (!yaml) return {};
  try {
    return yaml.load(yamlString);
  } catch (e) {
    return {};
  }
};

const dumpYaml = (object) => {
  if (!yaml) return '';
  try {
    return yaml.dump(object);
  } catch (e) {
    return '';
  }
};

module.exports = {
  parseYaml,
  dumpYaml
};
