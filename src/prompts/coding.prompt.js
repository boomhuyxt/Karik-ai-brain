module.exports = {
  codingPrompt: (instruction, code) => `Act as a Senior Principal Engineer. Refactor or write clean JavaScript code for: ${instruction}.\n\nExisting code:\n${code}`
};
