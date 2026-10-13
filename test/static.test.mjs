import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

// Appen ska gå att öppna direkt från disk (file://). Chrome blockerar ES-moduler
// från file://, så index.html får bara använda vanliga <script src>.
test('index.html använder inga ES-moduler', () => {
  assert.doesNotMatch(html, /type=["']module["']/, 'type="module" fungerar inte via file://');
  for (const f of ['js/data.js', 'js/store.js', 'js/speech.js', 'js/app.js']) {
    const src = readFileSync(join(root, f), 'utf8');
    assert.doesNotMatch(src, /^\s*(import|export)\s/m, `${f} innehåller import/export`);
  }
});

test('alla skript och stilmallar som index.html pekar på finns', () => {
  const refs = [...html.matchAll(/(?:src|href)="((?:js|css)\/[^"]+)"/g)].map(m => m[1]);
  assert.ok(refs.length >= 5, 'hittade för få lokala referenser');
  for (const r of refs) assert.ok(existsSync(join(root, r)), `${r} saknas`);
  const order = refs.filter(r => r.endsWith('.js'));
  assert.deepEqual(order, ['js/data.js', 'js/store.js', 'js/speech.js', 'js/app.js'], 'skripten måste laddas i beroendeordning');
});
