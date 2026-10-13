import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { emptyState, migrateV1, load, save, KEY, V1_KEY, repeatQueue, pickWords, spellingTiles, checkSpelling, weekMinutes, streakDays, levelStats, troubleWords, levelMastery, toCsv } = require('../js/store.js');

const W = [{ w: 'sol', p: ['s','o','l'], e: '☀️' }, { w: 'bil', p: ['b','i','l'], e: '🚗' }, { w: 'ros', p: ['r','o','s'], e: '🌹' }, { w: 'hus', p: ['h','u','s'], e: '🏠' }];
const att = (word, result, ts, level = 'sol') => ({ ts, level, word, result, mode: 'words' });
const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };

function fakeStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), map: m };
}

test('repeatQueue: ord med hjälp senast kommer med, bekräftas en gång, lämnar sedan kön', () => {
  const a = [att('sol', 'help', 1), att('bil', 'self', 2), att('ros', 'no', 3), att('ros', 'self', 4), att('hus', 'help', 5), att('hus', 'self', 6), att('hus', 'self', 7)];
  const q = repeatQueue(a, 'sol', W).map(w => w.w);
  assert.deepEqual(q, ['ros', 'sol']); // ros: self efter no → bekräfta; sol: help; hus: två self i rad → ute; bil: aldrig missat
});

test('repeatQueue: begränsas till max och ignorerar andra nivåer', () => {
  const a = [att('sol', 'help', 1), att('bil', 'help', 2, 'katt')];
  assert.deepEqual(repeatQueue(a, 'sol', W, 1).map(w => w.w), ['sol']);
  assert.deepEqual(repeatQueue(a, 'katt', W).map(w => w.w), ['bil']);
});

test('pickWords: nya ord först, sedan äldst övade, exkluderar repetitionsord', () => {
  const a = [att('sol', 'self', 10), att('bil', 'self', 5)];
  const picked = pickWords(W, a, 'sol', 3, ['ros'], seq(0.1)).map(w => w.w);
  assert.equal(picked.length, 3);
  assert.equal(picked[0], 'hus');            // enda nya (ros exkluderad)
  assert.deepEqual(picked.slice(1), ['bil', 'sol']); // äldst först
});

test('pickWords: returnerar aldrig fler än n', () => {
  assert.equal(pickWords(W, [], 'sol', 2, [], seq(0.5)).length, 2);
});

test('spellingTiles: innehåller alla delar plus distraktorer som inte finns i ordet', () => {
  const tiles = spellingTiles(['k','a','tt'], seq(0.3, 0.7, 0.1), 2);
  assert.equal(tiles.length, 5);
  for (const p of ['k','a','tt']) assert.ok(tiles.includes(p));
  const extra = tiles.filter(t => !['k','a','tt'].includes(t));
  assert.equal(extra.length, 2);
  for (const d of extra) assert.ok(!['k','a','t'].includes(d));
});

test('checkSpelling: rätt, fel position', () => {
  assert.deepEqual(checkSpelling(['k','a','tt'], 'katt'), { ok: true, firstWrong: -1 });
  assert.deepEqual(checkSpelling(['k','o','tt'], 'katt'), { ok: false, firstWrong: 1 });
  assert.deepEqual(checkSpelling(['k','a'], 'katt'), { ok: false, firstWrong: 2 });
});

test('weekMinutes och streakDays', () => {
  const DAY = 86400000;
  const now = new Date(2026, 9, 13, 18).getTime();
  const sessions = [
    { ts: now - 1 * DAY, minutes: 20 },
    { ts: now - 2 * DAY, minutes: 15 },
    { ts: now - 9 * DAY, minutes: 30 },
  ];
  assert.equal(weekMinutes(sessions, now), 35);
  assert.equal(streakDays(sessions, now), 2);       // igår + förrgår, inget idag → fortfarande 2
  assert.equal(streakDays([{ ts: now - 3 * DAY, minutes: 5 }], now), 0);
  assert.equal(streakDays([], now), 0);
});

test('levelStats, troubleWords, levelMastery', () => {
  const a = [att('sol', 'help', 1), att('sol', 'help', 2), att('bil', 'self', 3), att('ros', 'no', 4)];
  assert.deepEqual(levelStats(a, 'sol'), { n: 4, self: 1, help: 2, no: 1, pct: 25 });
  const t = troubleWords(a);
  assert.equal(t[0].word, 'sol');
  assert.equal(t[0].fails, 2);
  assert.equal(t.length, 2);
  assert.deepEqual(levelMastery(a, 'sol', W), { mastered: 1, total: 4, pct: 25 });
});

test('migrateV1 mappar veckor till nivåer och ok→self/help', () => {
  const v1 = { attempts: [{ week: 0, day: 1, word: 'stol', ok: true, date: '2026-10-01T10:00:00.000Z' }, { week: 2, day: 0, word: 'solros', ok: false, date: '2026-10-02T10:00:00.000Z' }], spelling: [{ week: 1, word: 'kanin', ok: true }], sessions: 3 };
  const s = migrateV1(v1);
  assert.equal(s.attempts.length, 2);
  assert.equal(s.attempts[0].level, 'stol');
  assert.equal(s.attempts[0].result, 'self');
  assert.equal(s.attempts[1].level, 'solros');
  assert.equal(s.attempts[1].result, 'help');
  assert.equal(s.spelling[0].level, 'kanin');
  assert.equal(s.settings.tts, true);
});

test('load: v2 före v1, trasig data ger tomt state', () => {
  const st1 = fakeStorage({ [V1_KEY]: JSON.stringify({ attempts: [{ week: 0, word: 'stol', ok: true, date: '2026-10-01' }] }) });
  assert.equal(load(st1).attempts.length, 1);
  const s = emptyState(); s.name = 'Elsa';
  save(st1, s);
  assert.equal(load(st1).name, 'Elsa');
  assert.equal(load(fakeStorage({ [KEY]: '{not json' })).name, '');
});

test('toCsv: BOM, rubrik och en rad per händelse', () => {
  const s = emptyState();
  s.attempts.push(att('sol', 'self', Date.UTC(2026, 9, 13)));
  s.spelling.push({ ts: Date.UTC(2026, 9, 13), level: 'sol', word: 'sol', ok: true });
  const csv = toCsv(s);
  assert.ok(csv.startsWith('﻿Typ,Datum'));
  const rows = csv.split('\r\n');
  assert.equal(rows.length, 3);
  assert.equal(rows[1], '"läsning","2026-10-13","sol","sol","self"');
});
