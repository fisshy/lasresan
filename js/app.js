// Vanligt skript: LEVELS m.fl. kommer från data.js, Store från store.js, Speech från speech.js.
const S = Store;
const { speak, canSpeak, hasSwedishVoice, ding, stop } = Speech;

// ---------- state ----------
const state = S.load(localStorage);
const ui = { view: 'home', session: null, timerId: null, toast: null };
const $app = document.getElementById('app');
const WEEK_GOAL_MIN = 100; // 5 pass × 20 min, i linje med Levlin & Nakeva von Mentzer (2,5 h/vecka)

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const level = () => LEVELS.find(l => l.id === state.levelId) || LEVELS[0];
const levelIndex = id => LEVELS.findIndex(l => l.id === id);
const persist = () => S.save(localStorage, state);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const cheer = () => pick(CHEERS);

function fox(size = 96, mood = 'happy') {
  const mouth = mood === 'happy' ? 'M40 66 Q50 76 60 66' : mood === 'wow' ? 'M44 66 a6 7 0 1 0 12 0 a6 7 0 1 0 -12 0' : 'M42 68 Q50 72 58 68';
  return `<svg class="fox fox-${mood}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
  <polygon points="14,8 38,34 12,44" fill="#f28c28"/><polygon points="86,8 62,34 88,44" fill="#f28c28"/>
  <polygon points="19,16 34,32 18,38" fill="#ffd9b3"/><polygon points="81,16 66,32 82,38" fill="#ffd9b3"/>
  <circle cx="50" cy="52" r="34" fill="#f28c28"/>
  <path d="M26 60 Q50 92 74 60 Q62 78 50 76 Q38 78 26 60Z" fill="#fff4e3"/>
  <circle cx="38" cy="48" r="5" fill="#2b2d42"/><circle cx="62" cy="48" r="5" fill="#2b2d42"/>
  <circle cx="40" cy="46" r="1.8" fill="#fff"/><circle cx="64" cy="46" r="1.8" fill="#fff"/>
  <ellipse cx="50" cy="62" rx="5" ry="4" fill="#2b2d42"/>
  <path d="${mouth}" stroke="#2b2d42" stroke-width="2.5" fill="${mood === 'wow' ? '#2b2d42' : 'none'}" stroke-linecap="round"/>
  </svg>`;
}

function tiles(parts, cls = '', focus = -1) {
  return `<div class="tiles ${cls}">${parts.map((p, i) => `<span class="tile ${i === focus ? 'focus' : ''}" data-i="${i}">${esc(p)}</span>`).join('')}</div>`;
}

function listenBtn(text, label = 'Lyssna') {
  if (!state.settings.tts || !canSpeak()) return '';
  return `<button class="btn ghost small" data-action="speak" data-text="${esc(text)}">🔊 ${label}</button>`;
}

// ---------- rendering ----------
function render() {
  if (ui.view === 'home') renderHome();
  else if (ui.view === 'session') renderSession();
  else if (ui.view === 'adult') renderAdult();
  document.querySelectorAll('.topnav button').forEach(b => b.classList.toggle('active', b.dataset.nav === ui.view));
  window.scrollTo({ top: 0 });
}

function renderHome() {
  const lv = level();
  const week = S.weekMinutes(state.sessions);
  const streak = S.streakDays(state.sessions);
  const stars = state.sessions.reduce((a, s) => a + (s.stars || 0), 0);
  const name = state.name ? `, ${esc(state.name)}` : '';
  const queue = S.repeatQueue(state.attempts, lv.id, lv.words);
  $app.innerHTML = `
  <section class="hero card">
    <div class="hero-fox">${fox(120)}</div>
    <div class="hero-text">
      <p class="bubble">Hej${name}! Ska vi läsa en stund?</p>
      <h1>Läsresan</h1>
      <p class="lead">Idag: <b>${lv.emoji} ${esc(lv.title)}</b></p>
      <button class="btn big primary" data-action="start" data-level="${lv.id}">▶ Starta dagens pass</button>
      <p class="hint">Cirka 20 minuter tillsammans med en vuxen.</p>
    </div>
  </section>
  <section class="stats">
    <div class="stat"><span class="stat-emoji">🔥</span><b>${streak}</b><span>dagar i rad</span></div>
    <div class="stat"><span class="stat-emoji">⭐</span><b>${stars}</b><span>stjärnor</span></div>
    <div class="stat"><span class="stat-emoji">⏱️</span><b>${week}</b><span>min denna vecka</span>
      <div class="meter"><div style="width:${Math.min(100, 100 * week / WEEK_GOAL_MIN)}%"></div></div></div>
  </section>
  <h2 class="map-title">🗺️ Resekartan</h2>
  <ol class="map">
    ${LEVELS.map((l, i) => {
      const m = S.levelMastery(state.attempts, l.id, l.words);
      const cur = l.id === lv.id;
      return `<li class="station ${cur ? 'current' : ''} ${m.pct >= 80 ? 'done' : ''}" style="--c:${l.color}">
        <button class="station-btn" data-action="level" data-level="${l.id}" aria-pressed="${cur}">
          <span class="station-emoji">${l.emoji}</span>
          <span class="station-body"><b>${i + 1}. ${esc(l.title)}</b><small>${esc(l.sub)}</small>
          <span class="meter small"><span style="width:${m.pct}%"></span></span></span>
          <span class="station-pct">${m.pct >= 80 ? '🏆' : m.pct + '%'}</span>
        </button></li>`;
    }).join('')}
  </ol>
  <section class="card level-card" style="--c:${lv.color}">
    <h2>${lv.emoji} ${esc(lv.title)}</h2>
    <p>${esc(lv.skill)}</p>
    ${queue.length ? `<p class="hint">🔁 ${queue.length} ord väntar på repetition: ${queue.map(w => `<span class="chip">${esc(w.w)}</span>`).join(' ')}</p>` : ''}
    <div class="grid2">
      <button class="btn" data-action="free" data-block="sounds">👂 Ljudlek</button>
      <button class="btn" data-action="free" data-block="words">📖 Läs ord</button>
      <button class="btn" data-action="free" data-block="text">📜 Läs text</button>
      <button class="btn" data-action="free" data-block="spell">✏️ Stava</button>
    </div>
  </section>`;
}

// ---------- session building ----------
function buildBlock(id, lv, n) {
  const attempts = state.attempts;
  if (id === 'repeat') {
    const items = S.repeatQueue(attempts, lv.id, lv.words).map(w => ({ word: w }));
    return { id, items, idx: 0 };
  }
  if (id === 'words') {
    const queue = S.repeatQueue(attempts, lv.id, lv.words);
    const items = S.pickWords(lv.words, attempts, lv.id, n || 8, queue).map(w => ({ word: w }));
    if (state.settings.troll && lv.troll.length) {
      S.shuffle(lv.troll).slice(0, 2).forEach(t => items.splice(2 + Math.floor(Math.random() * (items.length - 1)), 0, { word: { w: t, p: [t], e: '👹', troll: true } }));
    }
    return { id, items, idx: 0 };
  }
  if (id === 'sounds') {
    const items = [];
    const ws = S.shuffle(lv.words);
    const games = lv.games;
    for (let i = 0; i < (n || 4); i++) {
      const game = games[i % games.length];
      if (game === 'swap' && lv.swaps.length) {
        const [from, to] = pick(lv.swaps);
        items.push({ game, word: lv.words.find(w => w.w === from), to });
      } else if (game === 'swap') {
        items.push({ game: 'blend', word: ws[i % ws.length] });
      } else {
        items.push({ game, word: ws[i % ws.length] });
      }
    }
    return { id, items, idx: 0, step: 0 };
  }
  if (id === 'text') {
    const k = state.sessions.filter(s => s.level === lv.id).length;
    const sents = lv.sentences.slice(); const start = (k * 3) % sents.length;
    const chosen = [0, 1, 2].map(i => sents[(start + i) % sents.length]);
    const text = lv.texts[k % lv.texts.length];
    return { id, items: [{ sentences: chosen, text }], idx: 0, sIdx: 0, phase: 'sentences', reads: 0 };
  }
  if (id === 'spell') {
    const words = S.shuffle(lv.words.filter(w => w.e !== '💬')).slice(0, n || 4);
    return { id, items: words.map(w => ({ word: w, tiles: S.spellingTiles(w.p), answer: [], checked: null })), idx: 0 };
  }
}

function startSession(levelId, only = null) {
  const lv = LEVELS.find(l => l.id === levelId) || level();
  state.levelId = lv.id; persist();
  const ids = only ? [only] : SESSION_PLAN.map(b => b.id);
  const blocks = ids.map(id => buildBlock(id, lv, only ? (only === 'words' ? 10 : only === 'sounds' ? 6 : only === 'spell' ? 6 : undefined) : undefined)).filter(b => b.items.length);
  ui.session = { level: lv, blocks, b: 0, start: Date.now(), words: 0, self: 0, only, done: false, helpUsed: false, feedback: null };
  ui.view = 'session';
  if (ui.timerId) clearInterval(ui.timerId);
  ui.timerId = setInterval(() => { const el = document.getElementById('timer'); if (el) el.textContent = elapsed(); }, 1000);
  render();
}

function elapsed() {
  const s = Math.floor((Date.now() - ui.session.start) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function currentBlock() { return ui.session.blocks[ui.session.b]; }

function nextItem() {
  const ses = ui.session, blk = currentBlock();
  ses.helpUsed = false; ses.feedback = null; stop();
  blk.idx++;
  if (blk.idx >= blk.items.length) { ses.b++; if (ses.b >= ses.blocks.length) finishSession(); }
  render();
}

function finishSession() {
  const ses = ui.session;
  if (ses.done) return;
  ses.done = true;
  clearInterval(ui.timerId); ui.timerId = null;
  const minutes = Math.min(60, Math.max(1, Math.round((Date.now() - ses.start) / 60000)));
  const share = ses.words ? ses.self / ses.words : 1;
  const stars = ses.only ? 1 : share >= 0.8 ? 3 : share >= 0.5 ? 2 : 1;
  state.sessions.push({ ts: Date.now(), level: ses.level.id, minutes, words: ses.words, self: ses.self, stars });
  const m = S.levelMastery(state.attempts, ses.level.id, ses.level.words);
  ses.summary = { minutes, stars, mastery: m };
  const i = levelIndex(ses.level.id);
  if (!ses.only && m.pct >= 80 && i < LEVELS.length - 1 && state.levelId === ses.level.id) {
    state.levelId = LEVELS[i + 1].id; ses.summary.unlocked = LEVELS[i + 1];
  }
  persist();
  if (state.settings.sound) ding('win');
  setTimeout(confetti, 150);
}

// ---------- session rendering ----------
function renderSession() {
  const ses = ui.session, lv = ses.level;
  if (ses.done) return renderDone();
  const blk = currentBlock();
  const plan = SESSION_PLAN.find(p => p.id === blk.id);
  const head = `
  <header class="session-head" style="--c:${lv.color}">
    <button class="btn ghost small" data-action="quit">✕ Avsluta</button>
    <div class="steps">${ses.blocks.map((b, i) => `<span class="step ${i < ses.b ? 'past' : i === ses.b ? 'now' : ''}" title="${esc(SESSION_PLAN.find(p => p.id === b.id).title)}">${SESSION_PLAN.find(p => p.id === b.id).emoji}</span>`).join('')}</div>
    <span class="timer ${state.settings.timer ? '' : 'hidden'}" id="timer">${elapsed()}</span>
  </header>
  <div class="block-title"><h2>${plan.emoji} ${esc(plan.title)} <small>${blk.idx + 1} / ${blk.items.length}</small></h2><p class="adult-hint">👩‍🏫 ${esc(plan.hint)}</p></div>`;
  let body = '';
  if (blk.id === 'repeat' || blk.id === 'words') body = renderWord(blk);
  else if (blk.id === 'sounds') body = renderSound(blk);
  else if (blk.id === 'text') body = renderText(blk);
  else if (blk.id === 'spell') body = renderSpell(blk);
  $app.innerHTML = head + `<section class="stage card" aria-live="polite">${body}</section>`;
  const input = $app.querySelector('[autofocus]'); if (input) input.focus();
}

function feedbackHtml() {
  const f = ui.session.feedback;
  if (!f) return '';
  return `<div class="feedback ${f.ok ? 'ok' : 'meh'}">${f.ok ? fox(56, 'wow') : fox(56, 'calm')}<span>${esc(f.text)}</span></div>`;
}

function renderWord(blk) {
  const it = blk.items[blk.idx], w = it.word, ses = ui.session;
  if (ses.feedback) {
    return `<div class="word-big">${esc(w.w)}</div>${w.troll ? '' : `<div class="emoji-big pop">${w.e}</div>`}${feedbackHtml()}<button class="btn big primary" data-action="next" autofocus>Nästa →</button>`;
  }
  return `
    ${w.troll ? '<p class="troll">👹 Trollord – ett låtsasord! Ljuda det bara.</p>' : ''}
    <div class="word-big">${esc(w.w)}</div>
    ${it.showParts ? tiles(w.p, 'pop') : ''}
    <div class="row">
      <button class="btn ghost small" data-action="parts">🧩 Visa ljuden</button>
      ${w.troll ? '' : listenBtn(w.w)}
    </div>
    <p class="adult-label">Vuxen: hur gick läsningen?</p>
    <div class="grid3">
      <button class="btn ok" data-action="result" data-r="self" ${ses.helpUsed ? 'disabled title="Hjälp användes"' : ''}>✅ Själv</button>
      <button class="btn warm" data-action="result" data-r="help">🤝 Med hjälp</button>
      <button class="btn grey" data-action="result" data-r="no">🔁 Inte än</button>
    </div>
    ${ses.helpUsed ? '<p class="hint">Hjälp användes, så ordet räknas som "med hjälp".</p>' : ''}`;
}

function soundName(part, word) {
  if (part === 'ng') return 'ng-ljudet';
  if (['sj', 'stj', 'sk', 'skj', 'sch'].includes(part)) return 'sj-ljudet';
  if (['kj', 'tj'].includes(part) || (part === 'k' && /^k[yöäei]/.test(word))) return 'tj-ljudet';
  if (['hj', 'dj', 'lj', 'gj'].includes(part) || (part === 'g' && /^g[iyeäö]/.test(word))) return 'j-ljudet';
  if (part === 'ck') return 'k-ljudet (stavas ck)';
  if (part === 'x') return 'ks-ljudet';
  return `ljudet ${part}`;
}

function renderSound(blk) {
  const it = blk.items[blk.idx], w = it.word, g = it.game;
  const title = `<h3 class="game-title">${esc(GAME_NAMES[g])}</h3>`;
  const next = `<button class="btn big primary" data-action="next">Nästa →</button>`;
  if (g === 'blend') {
    return title + `<p class="adult-label">Vuxen: säg ljuden långsamt – ${w.p.map(p => `/${esc(p)}/`).join(' ')}. Vad blir ordet?</p>
      ${it.step ? `<div class="word-big pop">${esc(w.w)}</div><div class="emoji-big pop">${w.e}</div>${next}` : `${tiles(w.p, 'apart')}<button class="btn big primary" data-action="step">🧲 Sätt ihop!</button>`}`;
  }
  if (g === 'segment') {
    const shown = it.step || 0;
    return title + `<div class="emoji-big">${w.e}</div><p class="adult-label">Vuxen: säg ordet <b>${esc(w.w)}</b>. Vilka ljud hör du? ${listenBtn(w.w)}</p>
      ${tiles(w.p.map((p, i) => (i < shown ? p : '?')), shown ? 'pop' : '')}
      ${shown < w.p.length ? `<button class="btn big primary" data-action="step">Visa nästa ljud</button>` : next}`;
  }
  if (g === 'swap') {
    const from = w.w, to = it.to;
    let i = 0; while (i < from.length && i < to.length && from[i] === to[i]) i++;
    const instr = to.length < from.length ? `Ta bort /${esc(from[i])}/` : from.length < to.length ? `Lägg till /${esc(to[i])}/` : `Byt /${esc(from[i])}/ mot /${esc(to[i])}/`;
    return title + `<div class="word-big">${esc(from)}</div><div class="emoji-big">${w.e}</div>
      <p class="adult-label">Vuxen: ${instr}. Vad blir det för ord?</p>
      ${it.step ? `<div class="word-big pop">${esc(to)}</div>${next}` : `<button class="btn big primary" data-action="step">👀 Visa</button>`}`;
  }
  if (g === 'clap') {
    const n = w.p.length;
    return title + `<div class="emoji-big">${w.e}</div><div class="word-big">${esc(w.w)}</div>
      <p class="adult-label">Klappa stavelserna! Hur många blev det?</p>
      ${it.step ? `${tiles(w.p, 'pop')}<p class="cheer">${'👏'.repeat(n)} ${n} stavelser!</p>${next}` :
        `<div class="grid4">${[1, 2, 3, 4].map(k => `<button class="btn ${it.wrong === k ? 'shake' : ''}" data-action="clap" data-n="${k}">${k}</button>`).join('')}</div>`}`;
  }
  if (g === 'hide') {
    return title + `<div class="word-big">${esc(w.w)}</div><div class="emoji-big">${w.e}</div>
      <p class="adult-label">Vilka två ord gömmer sig i ordet?</p>
      ${it.step ? `${tiles(w.p, 'pop two')}${next}` : `<button class="btn big primary" data-action="step">🔍 Visa</button>`}`;
  }
  if (g === 'find') {
    const letters = w.w.split('');
    const sel = it.sel || [];
    const offset = w.p.slice(0, w.focus).join('').length, len = w.p[w.focus].length;
    if (it.step) {
      return title + `${tiles(w.p, 'pop', w.focus)}<div class="emoji-big">${w.e}</div>
        <p class="cheer">${it.ok ? '🎯 Rätt!' : 'Här är det:'} <b>${esc(w.p[w.focus])}</b> låter som ${esc(soundName(w.p[w.focus], w.w))}.</p>${listenBtn(w.w)}${next}`;
    }
    return title + `<div class="emoji-big">${w.e}</div><p class="adult-label">Tryck på bokstaven eller bokstäverna som gör det kluriga ljudet.</p>
      <div class="tiles">${letters.map((c, i) => `<button class="tile ${sel.includes(i) ? 'sel' : ''}" data-action="sel" data-i="${i}">${esc(c)}</button>`).join('')}</div>
      <button class="btn big primary" data-action="findcheck" data-o="${offset}" data-l="${len}" ${sel.length ? '' : 'disabled'}>Rätta</button>`;
  }
  if (g === 'flash') {
    if (it.step === 2) return title + `<div class="word-big pop">${esc(w.w)}</div><p class="adult-label">Kände barnet igen ordet direkt?</p>
      <div class="grid2"><button class="btn ok" data-action="flashres" data-r="self">⚡ Ja, direkt</button><button class="btn warm" data-action="flashres" data-r="help">🐌 Behövde ljuda</button></div>`;
    if (it.step === 1) return title + `<div class="word-big hiddenword">?</div><p class="adult-label">Vad stod det?</p><button class="btn big primary" data-action="step">👀 Visa</button>`;
    return title + `<p class="adult-label">Ordet visas en kort stund. Läs det så snabbt du kan!</p><div class="word-big flash" data-action="flashshow">${esc(w.w)}</div><button class="btn big primary" data-action="step">Jag såg det!</button>`;
  }
  return next;
}

function renderText(blk) {
  const it = blk.items[0], lv = ui.session.level;
  if (blk.phase === 'sentences') {
    const s = it.sentences[blk.sIdx];
    return `<h3 class="game-title">Meningar <small>${blk.sIdx + 1} / ${it.sentences.length}</small></h3>
      <div class="sentence">${esc(s)}</div>${listenBtn(s)}
      <button class="btn big primary" data-action="sentnext">${blk.sIdx + 1 < it.sentences.length ? 'Nästa mening →' : 'Till texten →'}</button>`;
  }
  const t = it.text;
  const textHtml = `<article class="story"><h3>${esc(t.title)}</h3>${t.lines.map(l => `<p>${esc(l)}</p>`).join('')}</article>`;
  if (blk.phase === 'read') {
    return `<h3 class="game-title">Läsning ${blk.reads + 1} av 2</h3>${textHtml}${listenBtn(t.lines.join(' '), 'Lyssna på texten')}
      <button class="btn big primary" data-action="readdone">${blk.reads === 0 ? '📖 Läst en gång – läs igen!' : '✅ Läst två gånger'}</button>`;
  }
  if (blk.phase === 'rate') {
    return `<h3 class="game-title">Hur flöt det andra gången?</h3>${fox(80)}<div class="grid3">${FLUENCY.map(f => `<button class="btn" data-action="rate" data-r="${f.id}"><span class="big-emoji">${f.emoji}</span>${f.label}</button>`).join('')}</div>`;
  }
  if (blk.phase === 'question') {
    return `<h3 class="game-title">Fråga om texten</h3><p class="question">${esc(t.q)}</p>
      <div class="options">${t.options.map((o, i) => `<button class="btn ${blk.wrong === i ? 'shake grey' : ''}" data-action="answer" data-i="${i}">${esc(o)}</button>`).join('')}</div>
      ${blk.wrong !== undefined ? '<p class="hint">Inte riktigt. Titta i texten igen!</p><details><summary>Visa texten</summary>' + textHtml + '</details>' : ''}`;
  }
  if (blk.phase === 'answered') {
    return `<p class="question">${esc(t.q)}</p><div class="cheer big">🎉 ${esc(t.options[t.answer])}</div>${feedbackHtml()}<button class="btn big primary" data-action="next" autofocus>Nästa →</button>`;
  }
}

function renderSpell(blk) {
  const it = blk.items[blk.idx], w = it.word;
  const slots = w.p.map((_, i) => `<button class="tile slot ${it.answer[i] !== undefined ? 'filled' : ''} ${it.checked && !it.checked.ok && i === wrongTile(it) ? 'wrong' : ''} ${it.checked && it.checked.ok ? 'right' : ''}" data-action="unput" data-i="${i}">${it.answer[i] !== undefined ? esc(it.tiles[it.answer[i]]) : ''}</button>`).join('');
  const bank = it.tiles.map((t, i) => `<button class="tile bank ${it.answer.includes(i) ? 'used' : ''}" data-action="put" data-i="${i}" ${it.answer.includes(i) ? 'disabled' : ''}>${esc(t)}</button>`).join('');
  return `<div class="emoji-big">${w.e}</div>
    <p class="adult-label">Vuxen: säg ordet högt. Barnet ljudar och bygger. ${listenBtn(w.w, 'Lyssna på ordet')}
      <button class="btn ghost small" data-action="peek">${it.peek ? `Ordet: <b>${esc(w.w)}</b>` : '👁️ Visa ordet för vuxen'}</button></p>
    <div class="tiles slots">${slots}</div>
    <div class="tiles bankrow">${bank}</div>
    ${it.checked && it.checked.ok ? `${feedbackHtml()}<button class="btn big primary" data-action="next" autofocus>Nästa →</button>` :
      `<div class="grid2"><button class="btn primary" data-action="spellcheck" ${it.answer.length ? '' : 'disabled'}>Rätta</button><button class="btn ghost" data-action="spellshow">Visa rätt</button></div>
       ${it.checked && !it.checked.ok ? '<p class="hint">Nästan! Den röda rutan är fel. Ljuda igen.</p>' : ''}`}`;
}

// index i delar som innehåller första fel bokstav
function wrongTile(it) {
  if (!it.checked || it.checked.ok) return -1;
  let pos = 0;
  for (let i = 0; i < it.answer.length; i++) {
    const t = it.tiles[it.answer[i]];
    if (it.checked.firstWrong < pos + t.length) return i;
    pos += t.length;
  }
  return it.answer.length;
}

function renderDone() {
  const ses = ui.session, s = ses.summary;
  const starsHtml = '⭐'.repeat(s.stars) + '<span class="dim">' + '⭐'.repeat(3 - s.stars) + '</span>';
  $app.innerHTML = `<section class="card done">
    ${fox(140, 'wow')}
    <h1>${esc(cheer())}</h1>
    <div class="stars">${ses.only ? '⭐' : starsHtml}</div>
    <div class="stats">
      <div class="stat"><b>${s.minutes}</b><span>minuter</span></div>
      <div class="stat"><b>${ses.words}</b><span>ord lästa</span></div>
      <div class="stat"><b>${ses.words ? Math.round(100 * ses.self / ses.words) : '–'}${ses.words ? '%' : ''}</b><span>själv</span></div>
    </div>
    <p class="hint">${esc(ses.level.title)}: ${s.mastery.mastered} av ${s.mastery.total} ord lästa själv senast.</p>
    ${s.unlocked ? `<p class="unlock">🔓 Nästa station upplåst: <b>${s.unlocked.emoji} ${esc(s.unlocked.title)}</b></p>` : ''}
    <button class="btn big primary" data-action="home">🗺️ Tillbaka till kartan</button>
  </section>`;
}

// ---------- adult ----------
function renderAdult() {
  const total = S.totalMinutes(state.sessions);
  const week = S.weekMinutes(state.sessions);
  const trouble = S.troubleWords(state.attempts);
  const flu = state.fluency.slice(-6).reverse();
  const st = state.settings;
  $app.innerHTML = `
  <section class="card adult">
    <h1>Vuxenpanel</h1>
    <p class="muted">Här ser du hur träningen går. Resultaten visar träningsförsök, inte en standardiserad läsbedömning.</p>
    <div class="stats">
      <div class="stat"><b>${state.sessions.length}</b><span>pass</span></div>
      <div class="stat"><b>${total}</b><span>min totalt</span></div>
      <div class="stat"><b>${week}/${WEEK_GOAL_MIN}</b><span>min denna vecka</span></div>
      <div class="stat"><b>${S.streakDays(state.sessions)}</b><span>dagar i rad</span></div>
    </div>
    <p class="hint">Forskningen visar att dosen spelar roll: sikta på 5 pass à 20 min per vecka under minst 6 veckor.</p>
  </section>
  <section class="card adult">
    <h2>Per nivå</h2>
    <table class="tbl"><thead><tr><th>Nivå</th><th>Försök</th><th>Själv</th><th>Behärskar</th></tr></thead><tbody>
    ${LEVELS.map(l => { const s = S.levelStats(state.attempts, l.id), m = S.levelMastery(state.attempts, l.id, l.words); return `<tr class="${l.id === state.levelId ? 'cur' : ''}"><td>${l.emoji} ${esc(l.title)}</td><td>${s.n}</td><td>${s.pct === null ? '–' : s.pct + '%'}</td><td>${m.mastered}/${m.total}</td></tr>`; }).join('')}
    </tbody></table>
    <label class="field">Aktuell nivå <select data-action="setlevel">${LEVELS.map(l => `<option value="${l.id}" ${l.id === state.levelId ? 'selected' : ''}>${l.emoji} ${esc(l.title)}</option>`).join('')}</select></label>
  </section>
  <section class="card adult">
    <h2>Ord att öva extra</h2>
    ${trouble.length ? `<p>${trouble.map(t => `<span class="chip">${esc(t.word)} <small>×${t.fails}</small></span>`).join(' ')}</p>` : '<p class="muted">Inga ord har behövt hjälp ännu.</p>'}
    <h2>Läsflyt (senaste)</h2>
    ${flu.length ? `<ul class="plain">${flu.map(f => `<li>${esc(f.text)} – ${esc((FLUENCY.find(x => x.id === f.rating) || {}).label || f.rating)} <small class="muted">${new Date(f.ts).toLocaleDateString('sv-SE')}</small></li>`).join('')}</ul>` : '<p class="muted">Inga texter lästa ännu.</p>'}
  </section>
  <section class="card adult">
    <h2>Inställningar</h2>
    <label class="field">Barnets namn <input data-action="name" value="${esc(state.name)}" maxlength="20" placeholder="t.ex. Elsa"></label>
    <label class="toggle"><input type="checkbox" data-action="toggle" data-k="tts" ${st.tts ? 'checked' : ''}> Uppläsning med talsyntes ${canSpeak() ? (hasSwedishVoice() ? '<small class="muted">(svensk röst hittad)</small>' : '<small class="muted">(ingen svensk röst i den här webbläsaren)</small>') : '<small class="muted">(stöds inte här)</small>'}</label>
    <label class="toggle"><input type="checkbox" data-action="toggle" data-k="sound" ${st.sound ? 'checked' : ''}> Glada ljud</label>
    <label class="toggle"><input type="checkbox" data-action="toggle" data-k="timer" ${st.timer ? 'checked' : ''}> Visa klocka under passet</label>
    <label class="toggle"><input type="checkbox" data-action="toggle" data-k="troll" ${st.troll ? 'checked' : ''}> Trollord (låtsasord) i ordläsningen <small class="muted">– motverkar gissning, max 2 per pass</small></label>
    <div class="grid2"><button class="btn" data-action="export">⬇️ Ladda ner resultat (CSV)</button><button class="btn grey" data-action="clear">🗑️ Radera alla resultat</button></div>
  </section>
  <section class="card adult">
    <h2>Så här tränar ni</h2>
    <ol class="plain num">
      <li><b>Korrekt före snabbt.</b> Låt barnet ljuda. Rätta direkt och vänligt, visa ljuden, läs ordet tillsammans.</li>
      <li><b>Visa, gör tillsammans, låt barnet göra själv.</b> Trappan i ljudleken.</li>
      <li><b>Prata om orden.</b> Vad betyder ordet? Fanns det med i texten?</li>
      <li><b>Läs och skriv.</b> Stavningsblocket är inte valfritt: det förstärker avkodningen.</li>
      <li><b>Varje dag, kort.</b> 20 minuter fem dagar i veckan slår ett långt pass i veckan.</li>
      <li><b>Håll koll på responsen.</b> Blir ett ord fel gång på gång? Stanna på nivån. Nivån byts när 80 % av orden läses själv.</li>
    </ol>
    <details><summary>Forskningen bakom Läsresan</summary>
      <ul class="plain">
        <li>Hall m.fl. (2023), metaanalys av 53 studier: systematisk, explicit avkodningsträning har effekt (g = 0,33). Stavningsträning och dos höjer effekten.</li>
        <li>Levlin & Nakeva von Mentzer (2020): 30 min/dag i 6 veckor lyfte 69 % av svenska åk 2-elever till jämnårig ljudande läsning.</li>
        <li>Schuele & Boudreau (2008): fonemisk medvetenhet tränas med bokstäver, "teach, don't test".</li>
        <li>Castles, Rastle & Nation (2018) och Share (1995): ordbilder lagras när ordet ljudas rätt och kopplas till betydelse.</li>
        <li>Lee & Yoon (2017): upprepad läsning av text på rätt nivå ger läsflyt.</li>
        <li>Sammanfattat av Anna Eva Hallin på <a href="https://www.sprakforskning.se/forskningsbloggen2/2023/10/5/40arsforskning" target="_blank" rel="noopener">sprakforskning.se</a>.</li>
      </ul>
    </details>
  </section>`;
}

// ---------- confetti ----------
function confetti() {
  const c = document.getElementById('confetti'); if (!c) return;
  const ctx = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight; c.classList.add('on');
  const colors = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#8e7dbe', '#f28c28'];
  const ps = Array.from({ length: 140 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.5, r: 5 + Math.random() * 7, vy: 2 + Math.random() * 3, vx: -1.5 + Math.random() * 3, rot: Math.random() * 6, col: pick(colors) }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of ps) { p.y += p.vy; p.x += p.vx; p.rot += 0.1; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6); ctx.restore(); }
    if (t - t0 < 3200) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, c.width, c.height); c.classList.remove('on'); }
  })(t0);
}

// ---------- events ----------
function recordWord(result, mode = 'words') {
  const ses = ui.session, blk = currentBlock(), w = blk.items[blk.idx].word;
  if (!w.troll) state.attempts.push({ ts: Date.now(), level: ses.level.id, word: w.w, result, mode });
  ses.words++; if (result === 'self') ses.self++;
  persist();
  ses.feedback = { ok: result === 'self', text: result === 'self' ? cheer() : result === 'help' ? 'Bra kämpat! Det här ordet kommer tillbaka.' : 'Vi tar det igen en annan dag.' };
  if (state.settings.sound) ding(result === 'self' ? 'ok' : 'meh');
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-action],[data-nav]'); if (!b) return;
  if (b.dataset.nav) { if (ui.view === 'session' && !ui.session.done && !confirm('Avsluta passet? Det som redan är gjort sparas.')) return; if (ui.view === 'session') abortSession(); ui.view = b.dataset.nav; render(); return; }
  const a = b.dataset.action;
  if (a === 'start') return startSession(b.dataset.level);
  if (a === 'free') return startSession(state.levelId, b.dataset.block);
  if (a === 'level') { state.levelId = b.dataset.level; persist(); return render(); }
  if (a === 'home') { ui.view = 'home'; ui.session = null; return render(); }
  if (a === 'quit') { if (confirm('Avsluta passet? Det som redan är gjort sparas.')) { abortSession(); ui.view = 'home'; render(); } return; }
  if (a === 'speak') { speak(b.dataset.text); return; }
  if (a === 'export') { const blob = new Blob([S.toCsv(state)], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = url; l.download = 'lasresan-resultat.csv'; l.click(); setTimeout(() => URL.revokeObjectURL(url), 500); return; }
  if (a === 'clear') { if (confirm('Radera alla sparade resultat på den här enheten?')) { const name = state.name, settings = state.settings; Object.assign(state, S.emptyState(), { name, settings }); persist(); render(); } return; }
  if (ui.view !== 'session' || !ui.session) return;
  const ses = ui.session, blk = currentBlock(); const it = blk && blk.items[blk.idx];
  if (a === 'next') return nextItem();
  if (a === 'parts') { it.showParts = true; ses.helpUsed = true; return renderSession(); }
  if (a === 'result') { recordWord(b.dataset.r, blk.id); return renderSession(); }
  if (a === 'step') { it.step = (it.step || 0) + 1; if (state.settings.sound && it.game !== 'flash') ding('ok'); return renderSession(); }
  if (a === 'clap') { const n = +b.dataset.n; if (n === it.word.p.length) { it.step = 1; if (state.settings.sound) ding('ok'); } else { it.wrong = n; if (state.settings.sound) ding('meh'); } return renderSession(); }
  if (a === 'sel') { const i = +b.dataset.i; it.sel = it.sel || []; it.sel = it.sel.includes(i) ? it.sel.filter(x => x !== i) : [...it.sel, i]; return renderSession(); }
  if (a === 'findcheck') { const o = +b.dataset.o, l = +b.dataset.l; const want = Array.from({ length: l }, (_, k) => o + k); const got = (it.sel || []).slice().sort((x, y) => x - y); it.ok = JSON.stringify(want) === JSON.stringify(got); it.step = 1; if (state.settings.sound) ding(it.ok ? 'ok' : 'meh'); return renderSession(); }
  if (a === 'flashres') { recordWord(b.dataset.r, 'flash'); return nextItem(); }
  if (a === 'sentnext') { blk.sIdx++; if (blk.sIdx >= it.sentences.length) { blk.phase = 'read'; } return renderSession(); }
  if (a === 'readdone') { blk.reads++; if (blk.reads >= 2) blk.phase = 'rate'; return renderSession(); }
  if (a === 'rate') { state.fluency.push({ ts: Date.now(), level: ses.level.id, text: it.text.title, rating: b.dataset.r }); persist(); blk.phase = 'question'; return renderSession(); }
  if (a === 'answer') { const i = +b.dataset.i; if (i === it.text.answer) { blk.phase = 'answered'; ses.feedback = { ok: true, text: 'Rätt! Du förstod texten.' }; if (state.settings.sound) ding('ok'); } else { blk.wrong = i; if (state.settings.sound) ding('meh'); } return renderSession(); }
  if (a === 'put') { if (it.answer.length < it.word.p.length) { it.answer.push(+b.dataset.i); it.checked = null; } return renderSession(); }
  if (a === 'unput') { const i = +b.dataset.i; if (i < it.answer.length) { it.answer.splice(i, 1); it.checked = null; } return renderSession(); }
  if (a === 'peek') { it.peek = !it.peek; return renderSession(); }
  if (a === 'spellcheck') {
    const res = S.checkSpelling(it.answer.map(i => it.tiles[i]), it.word.w);
    it.checked = res;
    if (it.firstTry === undefined) { it.firstTry = res.ok; state.spelling.push({ ts: Date.now(), level: ses.level.id, word: it.word.w, ok: res.ok }); persist(); }
    if (res.ok) { ses.feedback = { ok: true, text: it.firstTry ? 'Rätt stavat!' : 'Nu blev det rätt!' }; if (state.settings.sound) ding('ok'); } else if (state.settings.sound) ding('meh');
    return renderSession();
  }
  if (a === 'spellshow') {
    if (it.firstTry === undefined) { it.firstTry = false; state.spelling.push({ ts: Date.now(), level: ses.level.id, word: it.word.w, ok: false }); persist(); }
    const used = new Set();
    it.answer = it.word.p.map(p => { const j = it.tiles.findIndex((t, k) => t === p && !used.has(k)); used.add(j); return j; });
    it.checked = { ok: true, firstWrong: -1 }; ses.feedback = { ok: true, text: `Så stavas ${it.word.w}. Läs det högt!` };
    return renderSession();
  }
});

document.addEventListener('change', e => {
  const el = e.target.closest('[data-action]'); if (!el) return;
  const a = el.dataset.action;
  if (a === 'toggle') { state.settings[el.dataset.k] = el.checked; persist(); if (el.dataset.k === 'tts') renderAdult(); }
  if (a === 'setlevel') { state.levelId = el.value; persist(); renderAdult(); }
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-action="name"]'); if (!el) return;
  state.name = el.value.trim(); persist();
});

function abortSession() {
  if (!ui.session || ui.session.done) { ui.session = null; return; }
  const ses = ui.session; clearInterval(ui.timerId); ui.timerId = null; stop();
  const minutes = Math.round((Date.now() - ses.start) / 60000);
  if (minutes >= 3 || ses.words >= 3) { state.sessions.push({ ts: Date.now(), level: ses.level.id, minutes: Math.max(1, Math.min(60, minutes)), words: ses.words, self: ses.self, stars: 0, aborted: true }); persist(); }
  ui.session = null;
}

window.addEventListener('beforeunload', () => { if (ui.session && !ui.session.done) abortSession(); });
window.addEventListener('resize', () => { const c = document.getElementById('confetti'); if (c) { c.width = innerWidth; c.height = innerHeight; } });

render();
