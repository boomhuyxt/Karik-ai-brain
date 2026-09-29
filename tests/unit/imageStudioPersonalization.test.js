const test = require('node:test');
const assert = require('node:assert/strict');
const personalization = require('../../public/js/imageStudioPersonalization.js');

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
}

test('studio preferences are normalized and scoped per user', () => {
  const storage = createStorage({ user_info: JSON.stringify({ email: 'designer@example.com' }) });
  personalization.savePreferences({
    preferredStyles: ['soft_3d', 'soft_3d'],
    brandColors: ['#112233', 'invalid'],
    density: 'airy',
    audience: ' Gen Z '
  }, storage);

  const saved = personalization.readPreferences(storage);
  assert.deepEqual(saved.preferredStyles, ['soft_3d']);
  assert.deepEqual(saved.brandColors, ['#112233']);
  assert.equal(saved.audience, 'Gen Z');
  assert.equal(saved.density, 'airy');
});

test('studio history de-duplicates signatures and retains the newest 12', () => {
  const storage = createStorage({ user_info: JSON.stringify({ id: 'user-1' }) });
  for (let index = 0; index < 14; index += 1) {
    personalization.appendHistory({
      style: `style_${index}`,
      layout: `layout_${index}`,
      palette: `palette_${index}`,
      signature: `signature_${index}`
    }, storage);
  }
  personalization.appendHistory({ style: 'updated', layout: 'updated', palette: 'updated', signature: 'signature_13' }, storage);

  const history = personalization.readHistory(storage);
  assert.equal(history.length, 12);
  assert.equal(history.at(-1).style, 'updated');
  assert.equal(history.filter(item => item.signature === 'signature_13').length, 1);
});
