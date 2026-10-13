import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, GAME_NAMES, SESSION_PLAN } from '../js/data.js';

test('nivåer har unika id och rimlig storlek', () => {
  const ids = LEVELS.map(l => l.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(LEVELS.length >= 6);
  for (const l of LEVELS) {
    assert.ok(l.words.length >= 15, `${l.id}: för få ord (${l.words.length})`);
    assert.ok(l.sentences.length >= 4, `${l.id}: för få meningar`);
    assert.ok(l.texts.length >= 1, `${l.id}: saknar text`);
    assert.ok(l.games.length >= 1, `${l.id}: saknar ljudlek`);
    assert.match(l.color, /^#[0-9a-f]{6}$/i);
  }
});

test('ordets delar sätter ihop till ordet, ord är unika inom nivån', () => {
  for (const l of LEVELS) {
    const seen = new Set();
    for (const w of l.words) {
      assert.equal(w.p.join(''), w.w, `${l.id}: delarna för "${w.w}" stämmer inte`);
      assert.ok(w.e && w.e.length > 0, `${l.id}: "${w.w}" saknar bild`);
      assert.equal(w.w, w.w.toLowerCase(), `${l.id}: "${w.w}" ska vara gemener`);
      assert.ok(!seen.has(w.w), `${l.id}: dubblett "${w.w}"`);
      seen.add(w.w);
      if (w.focus !== undefined) assert.ok(w.focus >= 0 && w.focus < w.p.length, `${l.id}: ogiltigt focus för "${w.w}"`);
    }
  }
});

test('ljudlekar finns i GAME_NAMES och ljudbyten pekar på ord i nivån', () => {
  for (const l of LEVELS) {
    for (const g of l.games) assert.ok(GAME_NAMES[g], `${l.id}: okänd lek ${g}`);
    const words = new Set(l.words.map(w => w.w));
    for (const [from, to] of l.swaps) {
      assert.ok(words.has(from), `${l.id}: swap-ord "${from}" finns inte i nivån`);
      assert.notEqual(from, to);
      assert.ok(Math.abs(from.length - to.length) <= 1, `${l.id}: ${from}→${to} är inte ett enkelt ljudbyte`);
    }
    if (l.games.includes('find')) for (const w of l.words) assert.ok(w.focus !== undefined, `${l.id}: "${w.w}" saknar focus`);
  }
});

test('texter har fråga med giltigt svar', () => {
  for (const l of LEVELS) {
    for (const t of l.texts) {
      assert.ok(t.title && t.lines.length >= 4, `${l.id}: texten "${t.title}" är för kort`);
      assert.ok(t.options.length >= 2);
      assert.ok(t.answer >= 0 && t.answer < t.options.length);
      for (const line of t.lines) assert.match(line, /[.!?]$/, `${l.id}: raden "${line}" saknar skiljetecken`);
    }
    for (const s of l.sentences) assert.match(s, /^[A-ZÅÄÖ].*[.!?]$/, `${l.id}: meningen "${s}"`);
  }
});

test('passet summerar till 20–25 minuter', () => {
  const sum = SESSION_PLAN.reduce((a, b) => a + b.minutes, 0);
  assert.ok(sum >= 20 && sum <= 25, `passet är ${sum} min`);
});
