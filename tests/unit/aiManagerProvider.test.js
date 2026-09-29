const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('AI manager resolves the selected provider before dispatch and knowledge capture', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../src/services/ai/aiManager.service.js'), 'utf8');
  const declaration = source.indexOf('const providerInstance = this.providers[targetProvider] || geminiService;');
  const dispatch = source.indexOf('providerInstance.chat(');
  assert.ok(declaration >= 0, 'providerInstance should be declared');
  assert.ok(dispatch > declaration, 'providerInstance should be resolved before it is used');
});
