// Läsresan – lagring och ren logik (inga DOM-beroenden, testbar i node).

export const KEY = 'lasresan-v2';
export const V1_KEY = 'lasresan-site-v1';

export function emptyState() {
  return {
    version: 2,
    name: '',
    settings: { tts: true, sound: true, troll: false, timer: true },
    levelId: 'sol',
    attempts: [],   // { ts, level, word, result: 'self'|'help'|'no', mode }
    spelling: [],   // { ts, level, word, ok }
    sessions: [],   // { ts, level, minutes, words, self, stars }
    fluency: [],    // { ts, level, text, rating }
  };
}

// v1 hade fyra "veckor"; de mappas till närmaste nivå i v2.
const V1_WEEK_TO_LEVEL = ['stol', 'kanin', 'solros', 'text'];

export function migrateV1(raw) {
  const out = emptyState();
  if (!raw || typeof raw !== 'object') return out;
  const attempts = Array.isArray(raw.attempts) ? raw.attempts : [];
  for (const a of attempts) {
    if (!a || typeof a.word !== 'string') continue;
    const ts = Date.parse(a.date) || 0;
    out.attempts.push({ ts, level: V1_WEEK_TO_LEVEL[a.week] || 'stol', word: a.word, result: a.ok ? 'self' : 'help', mode: 'words' });
  }
  const spelling = Array.isArray(raw.spelling) ? raw.spelling : [];
  for (const s of spelling) {
    if (!s || typeof s.word !== 'string') continue;
    out.spelling.push({ ts: 0, level: V1_WEEK_TO_LEVEL[s.week] || 'stol', word: s.word, ok: !!s.ok });
  }
  return out;
}

export function load(storage) {
  try {
    const raw = storage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const base = emptyState();
      return { ...base, ...parsed, settings: { ...base.settings, ...(parsed.settings || {}) } };
    }
    const v1 = storage.getItem(V1_KEY);
    if (v1) return migrateV1(JSON.parse(v1));
  } catch (e) { /* trasig lagring → börja om */ }
  return emptyState();
}

export function save(storage, state) {
  try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
}

// ---- Urval ----

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Senaste resultat per ord (nyast först) inom en nivå.
export function historyByWord(attempts, levelId) {
  const map = new Map();
  const sorted = attempts.filter(a => a.level === levelId).slice().sort((x, y) => y.ts - x.ts);
  for (const a of sorted) {
    if (!map.has(a.word)) map.set(a.word, []);
    map.get(a.word).push(a);
  }
  return map;
}

// Ord som behöver repeteras: senaste läsningen krävde hjälp, eller ordet har
// bara lästs korrekt själv en gång efter en miss (bekräftas en gång till).
export function repeatQueue(attempts, levelId, levelWords, max = 6) {
  const hist = historyByWord(attempts, levelId);
  const out = [];
  for (const w of levelWords) {
    const h = hist.get(w.w);
    if (!h || h.length === 0) continue;
    const last = h[0].result, prev = h[1] && h[1].result;
    const needs = last !== 'self' || (prev !== undefined && prev !== 'self');
    if (needs) out.push({ word: w, ts: h[0].ts });
  }
  out.sort((a, b) => b.ts - a.ts);
  return out.slice(0, max).map(x => x.word);
}

// Nya ord först, sedan de som övats för längst sedan.
export function pickWords(levelWords, attempts, levelId, n, exclude = [], rng = Math.random) {
  const hist = historyByWord(attempts, levelId);
  const ex = new Set(exclude.map(w => (typeof w === 'string' ? w : w.w)));
  const fresh = [], old = [];
  for (const w of levelWords) {
    if (ex.has(w.w)) continue;
    const h = hist.get(w.w);
    if (!h) fresh.push(w); else old.push({ w, ts: h[0].ts });
  }
  old.sort((a, b) => a.ts - b.ts);
  const picked = shuffle(fresh, rng).slice(0, n);
  for (const o of old) { if (picked.length >= n) break; picked.push(o.w); }
  return picked;
}

// ---- Stavning ----

const DISTRACTOR_POOL = ['a','b','d','e','f','g','h','i','k','l','m','n','o','p','r','s','t','u','v','å','ä','ö'];

export function spellingTiles(parts, rng = Math.random, distractors = 2) {
  const used = new Set(parts.map(p => p.toLowerCase()));
  const pool = DISTRACTOR_POOL.filter(c => !used.has(c));
  const extra = shuffle(pool, rng).slice(0, distractors);
  return shuffle([...parts, ...extra], rng);
}

export function checkSpelling(tiles, word) {
  const answer = tiles.join('');
  if (answer === word) return { ok: true, firstWrong: -1 };
  let i = 0;
  while (i < answer.length && i < word.length && answer[i] === word[i]) i++;
  return { ok: false, firstWrong: i };
}

// ---- Statistik ----

const DAY = 86400000;
function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

export function weekMinutes(sessions, now = Date.now()) {
  const from = now - 7 * DAY;
  return sessions.filter(s => s.ts >= from).reduce((sum, s) => sum + (s.minutes || 0), 0);
}

export function totalMinutes(sessions) {
  return sessions.reduce((sum, s) => sum + (s.minutes || 0), 0);
}

// Antal dagar i rad med minst ett pass, räknat bakåt från idag (eller igår).
export function streakDays(sessions, now = Date.now()) {
  const days = new Set(sessions.map(s => dayKey(s.ts)));
  if (days.size === 0) return 0;
  let cursor = now;
  if (!days.has(dayKey(cursor))) {
    cursor -= DAY;
    if (!days.has(dayKey(cursor))) return 0;
  }
  let n = 0;
  while (days.has(dayKey(cursor))) { n++; cursor -= DAY; }
  return n;
}

export function levelStats(attempts, levelId) {
  const a = attempts.filter(x => x.level === levelId);
  const self = a.filter(x => x.result === 'self').length;
  const help = a.filter(x => x.result === 'help').length;
  return { n: a.length, self, help, no: a.length - self - help, pct: a.length ? Math.round(100 * self / a.length) : null };
}

// Ord som oftast behövt hjälp (senaste resultat ej 'self'), över alla nivåer.
export function troubleWords(attempts, max = 12) {
  const byWord = new Map();
  for (const a of attempts.slice().sort((x, y) => y.ts - x.ts)) {
    const k = `${a.level}:${a.word}`;
    if (!byWord.has(k)) byWord.set(k, { word: a.word, level: a.level, last: a.result, fails: 0 });
    if (a.result !== 'self') byWord.get(k).fails++;
  }
  return [...byWord.values()].filter(x => x.last !== 'self').sort((a, b) => b.fails - a.fails).slice(0, max);
}

// Enkelt mål: nivån är "klar" när 80 % av orden lästs korrekt själv senast.
export function levelMastery(attempts, levelId, levelWords) {
  const hist = historyByWord(attempts, levelId);
  let mastered = 0;
  for (const w of levelWords) {
    const h = hist.get(w.w);
    if (h && h[0].result === 'self') mastered++;
  }
  return { mastered, total: levelWords.length, pct: levelWords.length ? Math.round(100 * mastered / levelWords.length) : 0 };
}

export function toCsv(state) {
  const esc = v => `"${String(v).replace(/"/g, '""')}"`;
  const lines = ['Typ,Datum,Nivå,Ord,Resultat'];
  for (const a of state.attempts) lines.push(['läsning', new Date(a.ts).toISOString().slice(0, 10), a.level, a.word, a.result].map(esc).join(','));
  for (const s of state.spelling) lines.push(['stavning', s.ts ? new Date(s.ts).toISOString().slice(0, 10) : '', s.level, s.word, s.ok ? 'rätt' : 'fel'].map(esc).join(','));
  for (const f of state.fluency) lines.push(['flyt', new Date(f.ts).toISOString().slice(0, 10), f.level, f.text, f.rating].map(esc).join(','));
  for (const s of state.sessions) lines.push(['pass', new Date(s.ts).toISOString().slice(0, 10), s.level, `${s.minutes} min`, `${s.self}/${s.words}`].map(esc).join(','));
  return '﻿' + lines.join('\r\n');
}
