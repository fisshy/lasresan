// Talsyntes (Web Speech API) – används för att barnet ska kunna se och höra
// ordet samtidigt, och för att höra ordet vid stavning. Aldrig ett krav:
// saknas svensk röst fungerar allt ändå, den vuxne säger ordet.

const Speech = (() => {
let voice = null;
let loaded = false;

function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

function pickVoice() {
  if (!canSpeak()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  loaded = true;
  const sv = voices.filter(v => /^sv/i.test(v.lang));
  // Föredra lokala/naturliga röster om flera finns.
  voice = sv.find(v => /natural|premium|enhanced/i.test(v.name)) || sv.find(v => v.localService) || sv[0] || null;
  return voice;
}

function hasSwedishVoice() {
  if (!loaded) pickVoice();
  return !!voice;
}

if (canSpeak()) {
  pickVoice();
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

function speak(text, { rate = 0.85, pitch = 1.05 } = {}) {
  if (!canSpeak() || !text) return false;
  if (!loaded) pickVoice();
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'sv-SE';
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;
    window.speechSynthesis.speak(u);
    return true;
  } catch (e) {
    return false;
  }
}

function stop() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

// Små glada ljud via WebAudio (ingen fil behövs).
let ctx = null;
function ding(kind = 'ok') {
  try {
    if (typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) return;
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = kind === 'ok' ? [523, 659, 784] : kind === 'win' ? [523, 659, 784, 1047] : [330, 262];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.12 + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.12);
      o.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  } catch (e) { /* ljud är bara krydda */ }
}

  return { canSpeak, hasSwedishVoice, speak, stop, ding };
})();

if (typeof module !== 'undefined') module.exports = Speech;
