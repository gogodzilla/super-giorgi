'use strict';
// Super Giorgi: Batumi — a one-level side-scroller drawn entirely in code: no assets, no dependencies.
(() => {

// ---------- constants ----------
const BASE_W = 384, H = 224, T = 16;       // reference view width, world view height, tile size
let W = BASE_W;                             // view width, follows the window (see resize)
let TOP = 0;                                // extra sky above the world in tall windows
const COLS = 232, ROWS = 14;
const GROUND_Y = 12 * T;                    // top of the sidewalk
const EMPTY = 0, GROUND = 1, BALC = 2, BALC_COIN = 3, BALC_KHACH = 4, USED = 5, CONCRETE = 6, PEBBLE = 7;
const PHYS = { walk: 90, run: 150, acc: 520, accAir: 380, fric: 700, jumpV: 390, g: 2000, hold: 0.45, maxFall: 520 };
const TIME_LIMIT = 300;
const CHECKPOINT_X = 89 * T;                // respawn point: flat sidewalk, clear of pits, cars and the sewer at 99
const FLAG_TOP = GROUND_Y - 50, FLAG_BOTTOM = GROUND_Y - 14;
const FINISH_X = 206 * T;
const STATUE_X = 210 * T;
const SEA_COL = 222;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, to, d) => (v < to ? Math.min(v + d, to) : Math.max(v - d, to));
const rand = (a, b) => a + Math.random() * (b - a);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function hash(a, b) {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

// ---------- language ----------
// Russian, English or Georgian: ?lang=ru|en|ka, else the first of them among the browser's languages,
// else English. Every word the player sees comes from STR; the bitmap font has glyphs for all three.
const LANGS = ['ru', 'en', 'ka'];
const LANG = (() => {
  const q = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(q)) return q;
  for (const l of navigator.languages || [navigator.language || '']) {
    const p = l.slice(0, 2).toLowerCase();
    if (LANGS.includes(p)) return p;
  }
  return 'en';
})();
const STR = {
  ru: {
    lifeUp: '+1 ЖИЗНЬ', eww: 'ФУ!', slipper: 'тапок!', goodDog: 'хороший пёс ♥', jumpedOver: 'перепрыгнул! +100',
    woof: 'ГАВ!', woofWoof: 'ГАВ! ГАВ!', delivery: 'ДОСТАВКА!', tour: 'ЭКСКУРСИЯ!', scooter: 'ПОСТОРОНИСЬ!', zoom: 'ВЖУХ! +100', honk: 'БИП-БИП!', order: 'ЗАКАЗ! +100',
    beep: 'БИП! +100', khachapuri: 'ХАЧАПУРИ!', checkpoint: 'ЧЕКПОИНТ',
    hud: ['ГИОРГИ', 'ЛАРИ', 'ВРЕМЯ', 'ЖИЗНИ'], soundOff: 'звук выкл (M)', god: 'режим бога',
    tap: 'Коснись экрана', press: 'Enter или пробел', start: ' — старт', retry: ' — заново', again: ' — ещё раз',
    title: 'СУПЕР ГИОРГИ', city: 'Б А Т У М И',
    intro: 'Перепрыгивай Prius-ы и бездомных собак, выбивай головой балконы, ешь хачапури.',
    goal: 'Дойди до Али и Нино на набережной.',
    touchHelp: '←→ идти, БЕГ бегом, ▲ прыжок', fsHelp: '⛶ — на весь экран',
    homeHelp: 'Во весь экран: Поделиться → На экран «Домой»',
    keysHelp: '←→ идти  Shift бег  Пробел прыжок  P пауза  M звук  F экран',
    best: 'Рекорд: ', gameOver: 'ИГРА ОКОНЧЕНА', lost: 'Батуми ждёт реванша. Счёт: ',
    win: 'ГАМАРДЖОБА!', won: 'Али и Нино дождались тебя. Счёт: ', newBest: 'Новый рекорд!', pause: 'ПАУЗА',
    page: 'Супер Гиорги: Батуми', short: 'Супер Гиорги', run: 'БЕГ',
    aria: { game: 'Игра «Супер Гиорги: Батуми»', left: 'Влево', right: 'Вправо', pause: 'Пауза', mute: 'Звук',
      fs: 'Во весь экран', run: 'Бег', jump: 'Прыжок' },
  },
  en: {
    lifeUp: '+1 LIFE', eww: 'EWW!', slipper: 'slipper!', goodDog: 'good dog ♥', jumpedOver: 'jumped over! +100',
    woof: 'WOOF!', woofWoof: 'WOOF! WOOF!', delivery: 'DELIVERY!', tour: 'CITY TOUR!', scooter: 'OUTTA MY WAY!', zoom: 'ZOOM! +100', honk: 'BEEP-BEEP!', order: 'ORDER! +100',
    beep: 'BEEP! +100', khachapuri: 'KHACHAPURI!', checkpoint: 'CHECKPOINT',
    hud: ['GIORGI', 'LARI', 'TIME', 'LIVES'], soundOff: 'sound off (M)', god: 'god mode',
    tap: 'Tap the screen', press: 'Enter or Space', start: ' — start', retry: ' — try again', again: ' — play again',
    title: 'SUPER GIORGI', city: 'B A T U M I',
    intro: 'Jump over Priuses and stray dogs, knock out balconies with your head, eat khachapuri.',
    goal: 'Get to Ali and Nino on the seafront.',
    touchHelp: '←→ walk, RUN to run, ▲ jump', fsHelp: '⛶ — full screen',
    homeHelp: 'Full screen: Share → Add to Home Screen',
    keysHelp: '←→ walk  Shift run  Space jump  P pause  M sound  F screen',
    best: 'Best: ', gameOver: 'GAME OVER', lost: 'Batumi awaits your rematch. Score: ',
    win: 'GAMARJOBA!', won: 'Ali and Nino waited for you. Score: ', newBest: 'New record!', pause: 'PAUSE',
    page: 'Super Giorgi: Batumi', short: 'Super Giorgi', run: 'RUN',
    aria: { game: 'Super Giorgi: Batumi game', left: 'Left', right: 'Right', pause: 'Pause', mute: 'Sound',
      fs: 'Full screen', run: 'Run', jump: 'Jump' },
  },
  ka: {
    lifeUp: '+1 სიცოცხლე', eww: 'ფუ!', slipper: 'ჩუსტი!', goodDog: 'კარგი ძაღლი ♥', jumpedOver: 'გადაახტი! +100',
    woof: 'ჰავ!', woofWoof: 'ჰავ! ჰავ!', delivery: 'მიწოდება!', tour: 'ექსკურსია!', scooter: 'გზა მომეცით!', zoom: 'ვჟუხ! +100', honk: 'ბიპ-ბიპ!', order: 'შეკვეთა! +100',
    beep: 'ბიპ! +100', khachapuri: 'ხაჭაპური!', checkpoint: 'ჩეკპოინტი',
    hud: ['გიორგი', 'ლარი', 'დრო', 'სიცოცხლე'], soundOff: 'ხმა გამორთულია (M)', god: 'ღმერთის რეჟიმი',
    tap: 'შეეხე ეკრანს', press: 'Enter ან Space', start: ' — დაწყება', retry: ' — თავიდან', again: ' — კიდევ ერთხელ',
    title: 'სუპერ გიორგი', city: 'ბ ა თ უ მ ი',
    intro: 'გადაახტი პრიუსებს და ქუჩის ძაღლებს, თავით დაამტვრიე აივნები, ჭამე ხაჭაპური.',
    goal: 'მიდი ალისა და ნინომდე ბულვარზე.',
    touchHelp: '←→ სვლა, რბენა, ▲ ხტომა', fsHelp: '⛶ — სრულ ეკრანზე',
    homeHelp: 'სრულ ეკრანზე: გაზიარება → მთავარ ეკრანზე დამატება',
    keysHelp: '←→ სვლა  Shift რბენა  Space ხტომა  P პაუზა  M ხმა  F ეკრანი',
    best: 'რეკორდი: ', gameOver: 'თამაში დასრულდა', lost: 'ბათუმი რევანშს გელოდება. ქულა: ',
    win: 'გამარჯობა!', won: 'ალი და ნინო დაგელოდნენ. ქულა: ', newBest: 'ახალი რეკორდი!', pause: 'პაუზა',
    page: 'სუპერ გიორგი: ბათუმი', short: 'სუპერ გიორგი', run: 'რბენა',
    aria: { game: 'თამაში „სუპერ გიორგი: ბათუმი“', left: 'მარცხნივ', right: 'მარჯვნივ', pause: 'პაუზა', mute: 'ხმა',
      fs: 'სრულ ეკრანზე', run: 'რბენა', jump: 'ხტომა' },
  },
}[LANG];
document.documentElement.lang = LANG;
document.title = STR.page;
document.querySelector('meta[name="apple-mobile-web-app-title"]').content = STR.short;
document.getElementById('game').setAttribute('aria-label', STR.aria.game);
for (const b of document.querySelectorAll('#touch button')) b.setAttribute('aria-label', STR.aria[b.dataset.act || b.dataset.dir || b.id]);
document.querySelector('#touch [data-act="run"]').textContent = STR.run;

// ---------- canvas ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const buf = document.createElement('canvas');
const g = buf.getContext('2d');
let touchMode = false;
let phone = false;                            // touch screen held upright: the phone layout (see resize)
const PHONE_W = 168;                          // narrowest view in the phone layout, sets how big the world gets
const HUD_BAND = 26;                          // phone layout: strip above the world that holds the HUD
const PAD_H = 166;                            // phone layout: least room for the gamepad under the world (css px)
// Safe-area insets (notch, home bar) in css px, read through a probe since JS has no direct access.
const safeProbe = document.createElement('div');
safeProbe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;left:0;top:0;' +
  'width:env(safe-area-inset-bottom,0px);height:env(safe-area-inset-top,0px)';
document.body.appendChild(safeProbe);

// The game fills the whole browser window. The view keeps the world's 224px height and its width
// follows the window (224..640 px). Windows taller than that get extra sky above the world (TOP) with
// the HUD in it. Phones held upright get their own layout instead: the HUD in a strip on top, the world
// as wide as the screen and zoomed in (down to PHONE_W px of view), the gamepad filling the rest below.
function resize() {
  const portrait = innerHeight > innerWidth;
  phone = touchMode && portrait;
  let fit;
  if (phone) {
    const safeTop = safeProbe.offsetHeight, safeBottom = safeProbe.offsetWidth;
    fit = Math.min(innerWidth / PHONE_W, (innerHeight - safeTop - safeBottom - PAD_H) / (H + HUD_BAND));
    W = Math.min(640, Math.ceil(innerWidth / fit));
    fit = innerWidth / W;
    TOP = HUD_BAND;
  } else {
    fit = innerHeight / H;
    W = Math.floor(innerWidth / fit);
    if (W < 224 || W > 640) { W = clamp(W, 224, 640); fit = innerWidth / W; }
    TOP = Math.max(0, Math.round(innerHeight / fit) - H);
  }
  document.body.classList.toggle('phone', phone);
  buf.width = W; buf.height = H + TOP;
  g.imageSmoothingEnabled = false;
  const dpr = window.devicePixelRatio || 1, cssW = innerWidth, cssH = (H + TOP) * fit;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  document.body.style.setProperty('--game-h', cssH + 'px');
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
}
addEventListener('resize', resize);
resize();

// ---------- input ----------
const input = { left: false, right: false, jump: false, run: false, pressed: new Set() };
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump',
  ShiftLeft: 'run', ShiftRight: 'run', KeyX: 'run',
  Enter: 'start', KeyP: 'pause', Escape: 'pause', KeyM: 'mute',
};
function setAction(a, down) {
  if (down && !input[a]) input.pressed.add(a);
  input[a] = down;
  if (down) initAudio();
}
addEventListener('keydown', e => {
  const a = KEYMAP[e.code];
  if (!a) return;
  e.preventDefault();
  if (!e.repeat) setAction(a, true);
});
addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) setAction(a, false); });
addEventListener('blur', () => { for (const a of ['left', 'right', 'jump', 'run']) input[a] = false; });

// Touch controls show on coarse pointers, or as soon as anything touches the screen.
function enableTouch() { touchMode = true; document.body.classList.add('touch'); resize(); }
if (matchMedia('(pointer: coarse)').matches) enableTouch();
addEventListener('touchstart', enableTouch, { once: true, passive: true });
for (const b of document.querySelectorAll('#touch button[data-act]')) {
  const a = b.dataset.act;
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); setAction(a, true); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => setAction(a, false));
}
// ◀ ▶ work as one pad: the thumb can slide from one to the other without lifting.
const dpad = document.querySelector('#touch .dpad');
let padDir = null;
function setDir(d) {
  if (d === padDir) return;
  if (padDir) setAction(padDir, false);
  padDir = d;
  if (d) setAction(d, true);
  for (const b of dpad.querySelectorAll('button')) b.classList.toggle('on', b.dataset.dir === d);
}
const dirAt = e => { const r = dpad.getBoundingClientRect(); return e.clientX < r.left + r.width / 2 ? 'left' : 'right'; };
dpad.addEventListener('pointerdown', e => { e.preventDefault(); dpad.setPointerCapture(e.pointerId); setDir(dirAt(e)); });
dpad.addEventListener('pointermove', e => { if (padDir) setDir(dirAt(e)); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) dpad.addEventListener(ev, () => setDir(null));
// Fullscreen where the browser allows it (Android, desktop; iPhone only via "Add to Home Screen").
const canFullscreen = !!document.documentElement.requestFullscreen;
function goFullscreen() {
  if (!canFullscreen || document.fullscreenElement) return;
  document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
}
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else goFullscreen();
}
document.getElementById('fs').addEventListener('click', toggleFullscreen);
addEventListener('keydown', e => { if (e.code === 'KeyF' && !e.repeat) toggleFullscreen(); });
if (!canFullscreen) document.getElementById('fs').hidden = true;
// A tap anywhere outside the buttons starts, restarts or unpauses; on phones the first one also goes fullscreen.
addEventListener('pointerdown', e => {
  if (e.target.closest('button, #touch .grp')) return;
  if (touchMode && game.state !== 'play') goFullscreen();
  setAction('start', true); setAction('start', false);
});
addEventListener('contextmenu', e => e.preventDefault());

// ---------- audio ----------
const SFX_VOLUME = 0.6;    // master gain of the synth: effects and the built-in tune
const SONG_VOLUME = 0.22;  // music.mp3, kept low so jumps, coins and barks cut through
let actx = null, master = null, noiseBuf = null, muted = false;
let songGain = null;
function initAudio() {
  if (!actx) {
    // iPhone: play through the silent switch like a game/video would, not like a ringtone.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* not supported */ }
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain();
      master.gain.value = SFX_VOLUME;
      master.connect(actx.destination);
    } catch (e) { actx = null; return; }
    // iOS ignores <audio>.volume, so over http(s) the song goes through a gain node instead.
    // Not from file://: there the element counts as cross-origin and would be routed as silence.
    if (location.protocol.startsWith('http')) {
      try {
        songGain = actx.createGain();
        songGain.gain.value = muted ? 0 : SONG_VOLUME;
        actx.createMediaElementSource(song).connect(songGain);
        songGain.connect(actx.destination);
        song.volume = 1;
      } catch (e) { songGain = null; }
    }
  }
  if (actx.state === 'suspended') actx.resume();
}
// Mobile browsers only allow audio to start inside a real gesture, and a touch's pointerdown is not one
// (touchend/pointerup are). So every gesture resumes audio and (re)starts the song if it should be playing;
// the first one also plays-and-pauses it once, which lets later programmatic play() calls through on iOS.
let songPrimed = false, songBlocked = false;
function unlockAudio() {
  initAudio();
  songBlocked = false;
  if (!songReady) return;
  if (music.on && !game.paused) { if (song.paused) playSong(); }
  else if (!songPrimed) song.play().then(() => { if (!music.on || game.paused) song.pause(); }).catch(() => {});
  songPrimed = true;
}
for (const ev of ['touchend', 'pointerup', 'click', 'keydown']) addEventListener(ev, unlockAudio, true);
function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : SFX_VOLUME;
  song.muted = muted;
  if (songGain) songGain.gain.value = muted ? 0 : SONG_VOLUME;
  document.querySelector('#touch [data-act="mute"]').classList.toggle('off', muted);
}
function tone(f, d, type = 'square', f2 = null, vol = 0.3, when = 0) {
  if (!actx) return;
  const t = actx.currentTime + Math.max(0, when);
  const o = actx.createOscillator(), gn = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  gn.gain.setValueAtTime(vol, t);
  gn.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(gn); gn.connect(master);
  o.start(t); o.stop(t + d + 0.02);
}
function noise(d, vol = 0.3, when = 0) {
  if (!actx) return;
  if (!noiseBuf) {
    noiseBuf = actx.createBuffer(1, actx.sampleRate >> 1, actx.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  const t = actx.currentTime + when;
  const s = actx.createBufferSource(), gn = actx.createGain();
  s.buffer = noiseBuf;
  gn.gain.setValueAtTime(vol, t);
  gn.gain.exponentialRampToValueAtTime(0.001, t + d);
  s.connect(gn); gn.connect(master);
  s.start(t); s.stop(t + d);
}
const arp = (notes, step, vol = 0.14, d = 0.09) => notes.forEach((f, i) => tone(f, d, 'square', null, vol, i * step));
const sfx = {
  jump: () => tone(260, 0.16, 'square', 620, 0.16),
  coin: () => { tone(988, 0.07, 'square', null, 0.13); tone(1319, 0.25, 'square', null, 0.13, 0.07); },
  brk: () => { noise(0.25, 0.4); tone(140, 0.12, 'triangle', 60, 0.3); },
  bump: () => tone(110, 0.08, 'triangle', 80, 0.35),
  stomp: () => tone(400, 0.1, 'square', 120, 0.2),
  bark: () => { tone(520, 0.07, 'sawtooth', 300, 0.16); tone(560, 0.08, 'sawtooth', 280, 0.16, 0.12); },
  honk: () => { for (const w of [0, 0.24]) { tone(415, 0.18, 'square', null, 0.1, w); tone(523, 0.18, 'square', null, 0.08, w); } },
  beep: () => { tone(415, 0.1, 'square', null, 0.1); tone(523, 0.1, 'square', null, 0.08); },
  scooter: () => { tone(520, 0.5, 'sawtooth', 980, 0.05); tone(990, 0.05, 'square', null, 0.06, 0.15); },
  cart: () => { tone(660, 0.08, 'triangle', null, 0.07); tone(660, 0.08, 'triangle', null, 0.07, 0.14); },
  moped: () => { tone(140, 0.45, 'sawtooth', 210, 0.07); tone(880, 0.06, 'square', null, 0.08, 0.1); tone(880, 0.06, 'square', null, 0.08, 0.2); },
  splash: () => { noise(0.4, 0.35); tone(220, 0.3, 'sine', 70, 0.25); },
  squish: () => { noise(0.12, 0.22); tone(170, 0.14, 'sine', 55, 0.22); },
  sprout: () => tone(300, 0.3, 'triangle', 900, 0.2),
  power: () => arp([523, 659, 784, 1047, 1319], 0.07),
  hurt: () => tone(600, 0.3, 'square', 150, 0.2),
  die: () => arp([784, 659, 523, 392, 330, 262], 0.13, 0.15, 0.14),
  win: () => arp([523, 659, 784, 1047, 784, 1047, 1319], 0.12, 0.14, 0.16),
};

// Original tune in a Georgian folk manner: an Acharuli-style dance in 6/8, G mixolydian with the
// flat-seventh cadence F→G, a lower voice moving in parallel fourths under the melody, a drone bass
// on G/D and a doli drum pattern. Melody is [MIDI note, length in eighths]; 8 bars of 6 eighths.
const MODE = [55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];
const MELODY = [
  [74, 2], [76, 1], [74, 1], [72, 1], [71, 1],
  [72, 2], [74, 1], [72, 1], [71, 1], [69, 1],
  [71, 1], [72, 1], [74, 1], [76, 1], [77, 1], [76, 1],
  [74, 3], [79, 2], [77, 1],
  [76, 2], [74, 1], [72, 1], [74, 1], [72, 1],
  [71, 1], [72, 1], [71, 1], [69, 2], [65, 1],
  [67, 2], [69, 1], [71, 1], [69, 1], [65, 1],
  [67, 6],
];
const midi = m => 440 * 2 ** ((m - 69) / 12);
const TRACK = (() => {
  const steps = Array.from({ length: 48 }, () => []);
  let s = 0;
  for (const [m, d] of MELODY) {
    steps[s].push([m, d, 'square', 0.045]);
    const i = MODE.indexOf(m);
    if (i >= 3) steps[s].push([MODE[i - 3], d, 'triangle', 0.07]);
    s += d;
  }
  for (let b = 0; b < 8; b++) {   // drone: tonic and fifth, dipping to F under the cadence
    steps[b * 6].push([b === 6 ? 41 : 43, 3, 'triangle', 0.1]);
    steps[b * 6 + 3].push([b === 6 ? 48 : 50, 3, 'triangle', 0.08]);
  }
  return steps;
})();
// If music.mp3 sits next to index.html it plays instead of the built-in tune (not part of the repo).
const song = new Audio('music.mp3');
song.loop = true; song.volume = SONG_VOLUME; song.preload = 'auto';
let songReady = false;
// Phones don't preload media, so canplaythrough may never come before the first play(); a HEAD request
// tells whether the file is there (it fails on file://, where the desktop preload works anyway).
song.addEventListener('canplaythrough', () => { songReady = true; });
song.addEventListener('error', () => { songReady = false; });
fetch('music.mp3', { method: 'HEAD' }).then(r => { if (r.ok) songReady = true; }).catch(() => {});
let songPending = false;
function playSong() {
  if (songPending || songBlocked) return;
  songPending = true;
  song.play().then(() => { songPending = false; }, () => { songPending = false; songBlocked = true; });
}

const music = { on: false, step: 0, next: 0 };
function musicStart() {
  if (!actx) return;
  music.on = true; music.step = 0; music.next = actx.currentTime + 0.05;
  if (songReady) { song.currentTime = 0; playSong(); }
}
function musicStop() {
  music.on = false;
  song.pause();
}
function musicTick() {
  if (songReady) {
    const want = music.on && !game.paused;
    if (want && song.paused) playSong();   // if blocked, the next gesture retries (unlockAudio)
    else if (!want && !song.paused) song.pause();
    return;
  }
  if (!actx || !music.on || game.paused) return;
  const spb = 0.15;
  if (music.next < actx.currentTime - 0.1) music.next = actx.currentTime + 0.05;
  while (music.next < actx.currentTime + 0.25) {
    const i = music.step % TRACK.length, when = music.next - actx.currentTime;
    for (const [m, d, type, vol] of TRACK[i]) tone(midi(m), spb * d * 0.9, type, null, vol, when);
    const beat = i % 6;   // doli: DUM . tak DUM tak tak
    if (beat === 0 || beat === 3) tone(110, 0.12, 'sine', 50, beat ? 0.18 : 0.26, when);
    else if (beat !== 1) noise(0.04, beat === 2 ? 0.09 : 0.05, when);
    music.next += spb; music.step++;
  }
}

// ---------- sprites ----------
function sprite(rows, pal) {
  const c = document.createElement('canvas');
  c.width = rows[0].length; c.height = rows.length;
  const k = c.getContext('2d');
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const col = pal[row[i]];
      if (col) { k.fillStyle = col; k.fillRect(i, j, 1, 1); }
    }
  });
  return c;
}
function mirrored(c) {
  const m = document.createElement('canvas');
  m.width = c.width; m.height = c.height;
  const k = m.getContext('2d');
  k.translate(c.width, 0); k.scale(-1, 1); k.drawImage(c, 0, 0);
  return m;
}
const pair = (rows, pal) => { const r = sprite(rows, pal); return { r, l: mirrored(r) }; };

// Giorgi wears a black cap, a white T-shirt and black jeans. To roll back to the original red cap and
// blue overalls, set OUTFIT to 'classic' (or open the game with ?outfit=classic to compare).
const OUTFIT = new URLSearchParams(location.search).get('outfit') === 'classic' ? 'classic' : 'giorgi';
// ?god=1 for play-testing: nothing kills Giorgi, holes and sewers toss him back up, the clock never runs out.
const GOD = new URLSearchParams(location.search).has('god');
const HERO_OUTFITS = {
  giorgi: {
    pal: { C: '#18181c', c: '#3a3a44', S: '#f8b890', K: '#1c1010', H: '#1c1814', W: '#f4f4ef', w: '#c3c9d2', B: '#25272f', O: '#4a2c14' },
    top: [
      '...CCCCC....',
      '..CCCCCCccc.',
      '..HHHSSKS...',
      '.HSHSSSKSSS.',
      '.HSSSSSSSSSS',
      '..SSSKKKKK..',
      '...SSSSSS...',
      '..WWWWWWW...',
      '.WWWWWWWWWW.',
      'SSWWWWWWWWSS',
      'SS.wwwwww.SS',
    ],
  },
  classic: {
    pal: { R: '#d8281c', r: '#9c1810', S: '#f8b890', K: '#1c1010', H: '#5a3418', B: '#2b54c4', O: '#4a2c14' },
    top: [
      '...RRRRR....',
      '..RRRRRRRRR.',
      '..HHHSSKS...',
      '.HSHSSSKSSS.',
      '.HSSSSSSSSSS',
      '..SSSKKKKK..',
      '...SSSSSS...',
      '..RRRrRRR...',
      '.RRRRrRRRRR.',
      'SSRRRRRRRRSS',
      'SS.BBBBBB.SS',
    ],
  },
};
const { pal: HERO_PAL, top: HERO_TOP } = HERO_OUTFITS[OUTFIT];
// The favicon and home-screen icon: Giorgi face-on, cap and moustache (owner), drawn here like everything else.
const HERO_FACE = [
  '...............',
  '.....CCCCC.....',
  '....CCCCCCC....',
  '...CCCCCCCCC...',
  '...ccccccccc...',
  '...HSSSSSSSH...',
  '...SSKSSSKSS...',
  '..SSSSSSSSSSS..',
  '...SSSSSSSSS...',
  '...SKKKKKKKS...',
  '...SKKSSSKKS...',
  '....SSSSSSS....',
  '.....SSSSS.....',
  '..WWWWSSSWWWW..',
  '.WWWWWWWWWWWWW.',
  'WWWWWWWWWWWWWWW',
];
function heroIcon(size, bg) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const k = c.getContext('2d'), z = Math.floor(size / HERO_FACE.length);
  const ox = Math.floor((size - z * HERO_FACE[0].length) / 2), oy = Math.floor((size - z * HERO_FACE.length) / 2);
  if (bg) { k.fillStyle = bg; k.fillRect(0, 0, size, size); }
  HERO_FACE.forEach((r, j) => [...r].forEach((ch, i) => {
    if (ch !== '.') { k.fillStyle = HERO_PAL[ch]; k.fillRect(ox + i * z, oy + j * z, z, z); }
  }));
  return c.toDataURL();
}
for (const [rel, size, bg] of [['icon', 64, null], ['apple-touch-icon', 180, '#6ab8ea']]) {
  const l = document.createElement('link'); l.rel = rel; l.href = heroIcon(size, bg); document.head.appendChild(l);
}
const HERO_LEGS = {
  stand: ['...BBBBBB...', '...BBBBBB...', '...BB..BB...', '..OOO..OOO..', '..OOO..OOO..'],
  walk1: ['..BBBBBBB...', '.BBB...BBB..', '.BB.....BB..', 'OOO.....OOO.', 'OO.......OO.'],
  walk2: ['...BBBBBB...', '....BBBB....', '....BBBB....', '....OOOO....', '...OOOOO....'],
  jump: ['...BBBBBBB..', '..BBB..BBBB.', '.BBB....OOO.', 'OOO.....OO..', 'OO..........'],
};
const HERO = {};
for (const k in HERO_LEGS) HERO[k] = pair(HERO_TOP.concat(HERO_LEGS[k]), HERO_PAL);

const DOG_BODY = [
  '...........dd...',
  '..........dYDD..',
  'd.........DDKDD.',
  'dd.......DDDDDDK',
  '.dDDDDDDDDDDDP..',
  '..DDDDDDDDDDD...',
  '..DDDDDDDDDDD...',
];
// Legs stay under the belly (cols 2..12): front legs further right used to dangle past the chest.
const DOG_LEGS_A = ['..DD.DD.DD.DD...', '..DD.DD.DD.DD...', '..dd.dd.dd.dd...'];
const DOG_LEGS_B = ['..DD.DD.DD.DD...', '.DD...DD.DD..DD.', '.dd...dd.dd..dd.'];
const DOG_WAG_TOP = ['...........dd...', 'd.........dYDD..', '.d........DDKDD.', '.dd......DDDDDDK'];
const DOG_SLEEP = [
  '..........dYd...',
  '...DDDDDDDDDDD..',
  '..DDDDDDDDDDKDD.',
  '.dDDDDDDDDDDDDDK',
  'dd.dd.dd...dd.dd',
];
// Resting poses: lying with the head up, and sitting with the tail on the ground.
const DOG_LIE = [
  '...........dd...',
  '..........dYDD..',
  '..........DDKDD.',
  '.........DDDDDDK',
  'd..DDDDDDDDDDP..',
  '.dDDDDDDDDDDD...',
  '..dDDDDDDDDDDDDd',
];
const DOG_SIT = [
  '.........dd.....',
  '........dYDD....',
  '........DDKDD...',
  '.......DDDDDDK..',
  '.......DDDDDP...',
  '......DDDDDD....',
  '.....DDDDDDD....',
  '....DDDDD.DD....',
  '...DDDDDd.DD....',
  '...DDDDDd.DD....',
  'ddddDDDdd.dd....',
];
// Batumi strays come in every colour; Y is the ear tag of a vaccinated street dog (see DOG_TAGS).
// Plain coats only, no patches of any colour (owner's call).
const DOG_COATS = [
  { D: '#c99a5b', d: '#8a6234' },                             // ginger
  { D: '#2e2a28', d: '#171412', K: '#6a5a50' },               // black
  { D: '#ece6da', d: '#bcb2a0' },                             // white
  { D: '#8f8b86', d: '#5e5a56' },                             // grey
  { D: '#e2c48e', d: '#b08a52' },                             // cream
  { D: '#7a4a2a', d: '#4a2a14' },                             // brown
];
// Ear tags of vaccinated street dogs come in yellow, red, blue and green.
const DOG_TAGS = ['#ffd21f', '#e8302a', '#2f6fe0', '#2fae4a'];
function dogSprites(coat, tag) {
  const pal = { K: '#1a1210', Y: tag, P: '#ff7a8a', ...coat };
  return {
    a: pair(DOG_BODY.concat(DOG_LEGS_A), pal),
    b: pair(DOG_BODY.concat(DOG_LEGS_B), pal),
    wag: pair(DOG_WAG_TOP.concat(DOG_BODY.slice(4), DOG_LEGS_A), pal),
    sleep: pair(DOG_SLEEP, pal),
    lie: pair(DOG_LIE, pal),
    sit: pair(DOG_SIT, pal),
  };
}
const DOGS = DOG_COATS.map(coat => DOG_TAGS.map(tag => dogSprites(coat, tag)));
const HEART = sprite(['.H.H.', 'HHHHH', '.HHH.', '..H..'], { H: '#ff4d6d' });
const ZZZ = sprite(['ZZZZ', '..Z.', '.Z..', 'ZZZZ'], { Z: '#ffffff' });
const KHACH = sprite([
  'd............d',
  'dd..........dd',
  '.dDDDDDDDDDDd.',
  '.DCCCCWWCCCCD.',
  '.DCCCWYYWCCCD.',
  '.DCCCWYYWCCCD.',
  '.dDCCCWWCCCDd.',
  '..ddDDDDDDdd..',
], { D: '#d9913a', d: '#a8601c', C: '#ffe27a', W: '#fff6e0', Y: '#ffa400' });

// ---------- background layers (pre-rendered, tiled horizontally) ----------
// Background layers must be the same chunky pixel art as the world, not smooth vector shapes blown up.
// Canvas paths are always anti-aliased, so each layer is drawn SUPERSAMPLE× bigger, shrunk back with
// nearest-neighbour sampling and its alpha snapped to 0/255: hard edges, no in-between blur pixels.
// `draw` works in game units on a context already scaled by SUPERSAMPLE; keep lines ≥ 1 unit wide.
const SUPERSAMPLE = 4;
function layer(w, draw) {
  const big = document.createElement('canvas');
  big.width = w * SUPERSAMPLE; big.height = H * SUPERSAMPLE;
  const bk = big.getContext('2d');
  bk.scale(SUPERSAMPLE, SUPERSAMPLE);
  draw(bk, w);
  const c = document.createElement('canvas');
  c.width = w; c.height = H;
  const k = c.getContext('2d');
  k.imageSmoothingEnabled = false;
  k.drawImage(big, 0, 0, w, H);
  const img = k.getImageData(0, 0, w, H), d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 128 ? 0 : 255;
  k.putImageData(img, 0, 0);
  return c;
}
function ridge(k, w, color, base, amp, k1, k2) {
  k.fillStyle = color;
  k.beginPath(); k.moveTo(0, H);
  for (let i = 0; i <= w; i += 4) {
    k.lineTo(i, base - amp * Math.sin(2 * Math.PI * k1 * i / w) - amp * 0.5 * Math.sin(2 * Math.PI * k2 * i / w + 1.3));
  }
  k.lineTo(w, H); k.closePath(); k.fill();
}
const HILLS = layer(768, (k, w) => {
  ridge(k, w, '#a9c9c4', 118, 16, 2, 3);
  ridge(k, w, '#86ad9f', 142, 12, 3, 5);
});
const SKYLINE = layer(960, k => {
  const base = 194, col = '#a3b8cb', win = '#bed0df', dark = '#8ea6bb';
  const block = (x, w, h) => {
    k.fillStyle = col; k.fillRect(x, base - h, w, h);
    k.fillStyle = win;
    for (let y = base - h + 4; y < base - 4; y += 5) for (let i = x + 2; i < x + w - 3; i += 4) k.fillRect(i, y, 2, 3);
  };
  [[0, 40, 70], [46, 32, 104], [84, 28, 58], [250, 42, 118], [298, 30, 78], [470, 36, 92],
    [512, 26, 128], [690, 40, 72], [738, 32, 108], [850, 44, 88], [900, 30, 62]].forEach(b => block(...b));
  // Alphabet Tower, after photos: a wide white lattice cylinder (31 m across, 130 m tall) around a dark lift
  // core, two helical bands carrying the letters wound three times round it, a mirror-glass sphere on top
  let x = 190;
  const r = 18, top = base - 140, turn = 3 * 2 * Math.PI / 140;
  const band = front => {
    for (let y = top + 2; y < base - 2; y++) for (const ph of [0, Math.PI]) {
      const a = (base - y) * turn + ph;
      if ((Math.cos(a) > 0) !== front) continue;
      const bx = Math.round(x + Math.sin(a) * (r - 1));
      k.fillStyle = front ? '#e4ecf3' : dark; k.fillRect(bx - 1, y, 3, 3);
      if (front && (base - y) % 11 === 0 && Math.abs(Math.sin(a)) < 0.8) { k.fillStyle = '#8ea6bb'; k.fillRect(bx, y + 1, 1, 2); }   // a letter
    }
  };
  k.fillStyle = '#7f95ab'; k.beginPath(); k.arc(x, top, r, 0, Math.PI * 2); k.fill();   // the sphere
  k.fillStyle = '#94aabf'; k.beginPath(); k.arc(x - 5, top - 6, 9, 0, Math.PI * 2); k.fill();
  k.fillStyle = '#c9d8e5'; k.fillRect(x - 9, top - 12, 4, 2); k.fillRect(x - 11, top - 9, 2, 3);
  k.fillStyle = '#8ea6bb'; k.fillRect(x - r, top - 1, 2 * r, 2);                        // its equator ring
  k.fillStyle = dark; k.fillRect(x - 4, top, 8, base - top);                             // the lift core
  band(false);
  k.fillStyle = col;                                                                     // the lattice
  for (let i = -r; i <= r; i += 6) k.fillRect(x + i - (i === r ? 1 : 0), top, 1, base - top);
  for (let y = top + 12; y < base; y += 12) k.fillRect(x - r, y, 2 * r, 1);
  band(true);
  // Ferris wheel on the boulevard
  x = 400;
  const cy = base - 46, R = 36;
  k.strokeStyle = col; k.lineWidth = 2;
  k.beginPath(); k.arc(x, cy, R, 0, Math.PI * 2); k.stroke();
  k.lineWidth = 1.1;
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    k.beginPath(); k.moveTo(x, cy); k.lineTo(x + Math.cos(a) * R, cy + Math.sin(a) * R); k.stroke();
    k.fillStyle = col; k.fillRect(Math.round(x + Math.cos(a) * R) - 2, Math.round(cy + Math.sin(a) * R) - 1, 4, 4);
  }
  k.lineWidth = 2;
  k.beginPath(); k.moveTo(x - 20, base); k.lineTo(x, cy); k.lineTo(x + 20, base); k.stroke();
  // tower cranes, naturally — Batumi is always building: a lattice mast, the jib one way, a counterweight the other
  const crane = (x, h, jib, dir, color, hook) => {
    const y = base - h;
    k.fillStyle = color;
    k.fillRect(x, y, 1, h); k.fillRect(x + 4, y, 1, h);                                  // the mast
    for (let i = y + 2; i < base - 4; i += 6) { k.fillRect(x, i, 5, 1); k.fillRect(x + 1, i + 2, 1, 1); k.fillRect(x + 2, i + 3, 1, 1); k.fillRect(x + 3, i + 4, 1, 1); }
    k.fillRect(x - 1, y - 2, 7, 5);                                                      // the cab
    const jx = dir > 0 ? x + 5 : x - jib, cx = dir > 0 ? x - 22 : x + 6;
    k.fillRect(jx, y - 3, jib, 2); k.fillRect(cx, y - 3, 22, 2);                         // jib and counter-jib
    k.fillRect(dir > 0 ? cx : cx + 14, y - 1, 8, 5);                                     // the counterweight
    k.fillRect(x + 1, y - 13, 3, 10);                                                    // the peak with its ties
    k.lineWidth = 1; k.strokeStyle = color;
    k.beginPath(); k.moveTo(x + 2.5, y - 13); k.lineTo(dir > 0 ? x + 5 + jib * 0.7 : x - jib * 0.7, y - 3); k.stroke();
    k.beginPath(); k.moveTo(x + 2.5, y - 13); k.lineTo(dir > 0 ? cx + 2 : cx + 20, y - 3); k.stroke();
    const hx = dir > 0 ? x + 5 + hook : x - hook;
    k.fillRect(hx, y - 1, 1, 24 + (hook % 17)); k.fillRect(hx - 2, y + 23 + (hook % 17), 5, 3);   // cable and hook
  };
  crane(132, 112, 46, 1, '#c9a24a', 30);
  crane(336, 146, 58, -1, '#c98a5a', 40);
  crane(560, 124, 52, 1, '#c4ccd4', 22);
  crane(652, 98, 40, -1, '#c9a24a', 18);
  crane(820, 130, 48, 1, '#c9a24a', 40);
});
// A palm: a curved tapering trunk with growth rings and a crown of feathery, drooping fronds.
function palm(k, x, h, seed) {
  const base = 194, bend = 7 * (seed % 2 ? 1 : -1);
  const at = u => x + Math.sin(u * 1.4) * bend;
  for (let i = 0; i <= h; i += 0.5) {
    const u = i / h, w = 3.6 - u * 1.4;
    k.fillStyle = Math.floor(i / 2.2) % 2 ? '#86663f' : '#9c7a50';
    k.fillRect(at(u) - w / 2, base - i, w, 0.6);
  }
  const tx = at(1), ty = base - h;
  k.fillStyle = '#6b4a2a';
  for (const [dx, dy] of [[-1.5, 1.5], [1.2, 1.8], [0, 2.5]]) { k.beginPath(); k.arc(tx + dx, ty + dy, 1.3, 0, Math.PI * 2); k.fill(); }
  k.lineCap = 'round';
  const fronds = [Math.PI + 0.35, Math.PI - 0.25, Math.PI - 0.85, -Math.PI / 2 - 0.35, -Math.PI / 2 + 0.3, -0.75, -0.2, 0.4];
  fronds.forEach((a, n) => {
    const len = 17 + (hash(seed, n) % 6), col = ['#2e7040', '#3f8f4f', '#4c9d58'][n % 3];
    const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.7 + len * 0.45;
    const qx = tx + Math.cos(a) * len * 0.55, qy = ty + Math.sin(a) * len * 0.55 - 4;
    k.strokeStyle = col; k.lineWidth = 1.6;
    k.beginPath(); k.moveTo(tx, ty); k.quadraticCurveTo(qx, qy, ex, ey); k.stroke();
    k.lineWidth = 1.1;
    for (let t = 0.12; t <= 1; t += 0.11) {   // leaflets hanging off the rib
      const px = (1 - t) ** 2 * tx + 2 * (1 - t) * t * qx + t * t * ex;
      const py = (1 - t) ** 2 * ty + 2 * (1 - t) * t * qy + t * t * ey;
      const l = 4.5 * (1 - t) + 1.5;
      for (const s of [-1, 1]) {
        k.beginPath(); k.moveTo(px, py);
        k.lineTo(px + s * l * 0.45 + Math.cos(a) * l * 0.3, py + l * 0.9);
        k.stroke();
      }
    }
  });
}
// ---------- landmarks: a nearer parallax layer with the buildings everyone knows ----------
// Sheraton: a white lighthouse-like tower with tall arched windows, setbacks and a golden spire.
function sheraton(k, x, base) {
  const white = '#f2f0ea', shade = '#d3cfc4', win = '#55708c';
  k.fillStyle = shade; k.fillRect(x - 10, base - 22, 52, 22);
  k.fillStyle = white; k.fillRect(x - 11, base - 24, 54, 2);
  let y = base - 22;
  for (const [ins, w, h] of [[0, 32, 112], [4, 24, 20], [8, 16, 14]]) {
    y -= h;
    k.fillStyle = white; k.fillRect(x + ins, y, w, h);
    k.fillStyle = shade; k.fillRect(x + ins + w - 3, y, 3, h);
    k.fillStyle = win;
    const seg = h > 30 ? 26 : h - 6;
    for (let sy = y + 4; sy + seg <= y + h - 1; sy += seg + 4) {
      for (let i = x + ins + 3; i + 2 <= x + ins + w - 3; i += 4) { k.fillRect(i, sy + 1, 2, seg - 1); k.fillRect(i, sy, 1, 1); }
    }
    k.fillStyle = white; k.fillRect(x + ins - 1, y, w + 2, 2);
  }
  k.fillStyle = white;
  k.beginPath(); k.arc(x + 16, y, 7, Math.PI, 0); k.fill();
  k.fillStyle = '#d9a93a';
  k.fillRect(x + 15, y - 24, 2, 18);
  k.beginPath(); k.arc(x + 16, y - 11, 3, 0, Math.PI * 2); k.fill();
}
// Orbi City, after the owner's photo: three identical overlapping slabs in a row (owner), each roof a straight slope rising
// to the right under a blue cornice with ORBI CITY; a pale striped face on the left and deep blue glass swept up from
// the foot to the high corner along a concave curve; a cream podium with arches joins them.
function orbi(k, x, base) {
  for (const dx of [60, 30, 0]) {   // overlapping: drawn right to left, so the right one is at the back
    const w = 44, hl = 82, hr = 134, g0 = 0.15, cx = 0.7, cy = 0.45;
    const x0 = x + dx, x1 = x0 + w;
    const slab = () => { k.beginPath(); k.moveTo(x0, base); k.lineTo(x0, base - hl); k.lineTo(x1, base - hr); k.lineTo(x1, base); k.closePath(); };
    const glass = () => { k.beginPath(); k.moveTo(x0 + w * g0, base); k.quadraticCurveTo(x0 + w * cx, base - hr * cy, x1 - 2, base - hr + 5); k.lineTo(x1, base - hr); k.lineTo(x1, base); k.closePath(); };
    slab(); k.fillStyle = '#c3d1e2'; k.fill();
    k.save(); slab(); k.clip();
    k.fillStyle = '#93abc8'; for (let y = base - 2; y > base - hr; y -= 3) k.fillRect(x0, y, w, 1);   // the floors
    glass(); k.fillStyle = '#2459b4'; k.fill();
    k.save(); glass(); k.clip();
    k.fillStyle = '#3b70c8'; for (let y = base - 2; y > base - hr; y -= 3) k.fillRect(x0, y, w, 1);
    k.restore();
    k.fillStyle = '#1d4aa6';                                                       // the cornice along the roof
    k.beginPath(); k.moveTo(x0, base - hl); k.lineTo(x1, base - hr); k.lineTo(x1, base - hr + 7); k.lineTo(x0, base - hl + 7); k.fill();
    k.restore();
    k.fillStyle = '#7d93b0'; k.fillRect(x0, base - hl, 1, hl);                     // its left edge against the one behind
    k.fillStyle = '#f2f6fb';                                                       // ORBI CITY on it
    for (let i = 0; i < 6; i++) { const u = 0.45 + i * 0.07; k.fillRect(x0 + w * u, base - hl - (hr - hl) * u + 3, 2, 1); }
  }
  k.fillStyle = '#e9dcc4'; k.fillRect(x - 6, base - 14, 116, 14);                 // the podium
  k.fillStyle = '#c4b394';
  for (let i = x - 2; i < x + 100; i += 12) { k.beginPath(); k.moveTo(i, base); k.lineTo(i, base - 7); k.arc(i + 5, base - 7, 5, Math.PI, 0); k.lineTo(i + 10, base); k.fill(); }
}
// White Magnolia: the huge, long-unfinished residential block on the seafront, after the owner's photo from
// the sea. A wide symmetric white facade: a lower part of pilastered bays with tall arched openings under a
// cornice, terraced glazed floors stepping back above it, and a projecting centre with a giant arch flanked
// by paired columns, the courtyard houses showing through it.
function magnolia(k, x, base) {
  const w = 148, low = 50, white = '#f1efe9', shade = '#d6d3cb', glass = '#a9b6c1', win = '#7d8995';
  for (let i = 0; i < 4; i++) {                                                     // terraced upper floors
    const inset = 4 + i * 7, y = base - low - (i + 1) * 7;
    k.fillStyle = white; k.fillRect(x + inset, y, w - 2 * inset, 7);
    k.fillStyle = glass; k.fillRect(x + inset + 1, y + 2, w - 2 * inset - 2, 4);
    k.fillStyle = white; for (let j = x + inset + 3; j < x + w - inset - 1; j += 3) k.fillRect(j, y + 2, 1, 4);
    k.fillStyle = shade; k.fillRect(x + inset, y + 6, w - 2 * inset, 1);
  }
  for (const tx of [x + 6, x + w - 26]) {                                           // the taller corner blocks
    k.fillStyle = white; k.fillRect(tx, base - low - 34, 20, 34);
    k.fillStyle = win; for (let j = 0; j < 4; j++) for (let q = 0; q < 4; q++) k.fillRect(tx + 2 + q * 5, base - low - 31 + j * 7, 2, 3);
  }
  k.fillStyle = white; k.fillRect(x, base - low, w, low);                           // lower part
  k.fillStyle = '#ffffff'; k.fillRect(x - 1, base - low - 2, w + 2, 2);             // cornice
  k.fillStyle = shade; k.fillRect(x, base - low, w, 1);
  for (let bx = x + 2; bx < x + w - 6; bx += 12) {                                  // bays between pilasters
    k.fillStyle = shade; k.fillRect(bx + 10, base - low + 2, 1, low - 2);
    k.fillStyle = '#ffffff'; k.fillRect(bx + 8, base - low + 1, 2, low - 1);
    k.fillStyle = glass;                                                            // tall arched opening
    k.beginPath(); k.moveTo(bx + 1, base - 26); k.lineTo(bx + 1, base - 42); k.arc(bx + 4, base - 42, 3, Math.PI, 0); k.lineTo(bx + 7, base - 26); k.fill();
    k.fillStyle = white; for (let y = base - 40; y < base - 26; y += 4) k.fillRect(bx + 1, y, 6, 1);   // balcony rails
    k.fillStyle = win; for (let y = base - 22; y < base - 2; y += 6) { k.fillRect(bx + 1, y, 2, 3); k.fillRect(bx + 5, y, 2, 3); }
  }
  const cx = x + w / 2;                                                             // projecting centre
  k.fillStyle = white; k.fillRect(cx - 20, base - low - 8, 40, low + 8);
  k.fillStyle = '#ffffff'; k.fillRect(cx - 21, base - low - 10, 42, 2);
  k.fillStyle = shade; k.fillRect(cx + 19, base - low - 8, 1, low + 8);
  k.fillStyle = win; for (let j = 0; j < 2; j++) for (const dx of [-17, -13, 11, 15]) k.fillRect(cx + dx, base - low - 5 + j * 6, 2, 3);
  k.fillStyle = '#b9b5ab'; k.beginPath(); k.moveTo(cx - 13, base); k.lineTo(cx - 13, base - 36); k.arc(cx, base - 36, 13, Math.PI, 0); k.lineTo(cx + 13, base); k.fill();
  k.fillStyle = '#cdc9bf'; k.beginPath(); k.moveTo(cx - 11, base); k.lineTo(cx - 11, base - 36); k.arc(cx, base - 36, 11, Math.PI, 0); k.lineTo(cx + 11, base); k.fill();
  k.fillStyle = win; for (let y = base - 40; y < base - 2; y += 6) for (let q = -8; q < 8; q += 4) k.fillRect(cx + q, y, 2, 3);   // courtyard houses
  k.fillStyle = '#ffffff';
  for (const dx of [-17, -14, 12, 15]) k.fillRect(cx + dx, base - 30, 2, 30);       // paired columns
  k.fillRect(cx - 18, base - 31, 7, 1); k.fillRect(cx + 11, base - 31, 7, 1);
}
// Courtyard by Marriott, after the owner's photo: the whole tower is a tall white blunt oval (owner), cut by the
// ground a little below its middle so it narrows towards the foot, banded with close horizontal stripes, with
// a tall oval of blue glass left of centre and the name along the left slope of the crown.
function courtyard(k, x, base) {
  const w = 56, h = 124, oy = h * 0.6, cy = base - h + oy;
  const oval = (cx, cy, rx, ry, n) => {   // a superellipse: an oval with a blunter top than an ellipse
    k.beginPath();
    for (let i = 0; i <= 64; i++) {
      const t = i / 64 * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      k.lineTo(cx + rx * Math.sign(c) * Math.abs(c) ** (2 / n), cy + ry * Math.sign(s) * Math.abs(s) ** (2 / n));
    }
    k.closePath();
  };
  const shape = () => oval(x + w / 2, cy, w / 2, oy, 2.6);
  shape(); k.fillStyle = '#f4f4f1'; k.fill();
  k.save(); shape(); k.clip();
  k.fillStyle = '#e1e3e6'; k.fillRect(x + w * 0.76, base - h, w * 0.24, h);          // the side turning away
  k.fillStyle = '#b8bdc3'; for (let y = base - 2; y > base - h; y -= 3) k.fillRect(x, y, w, 1);   // the bands
  k.restore();
  const ex = x + w * 0.38, rx = w * 0.18, ry = h * 0.4, ey = base - h * 0.42;        // the glass oval
  k.fillStyle = '#5d6670'; oval(ex, ey, rx + 1.3, ry + 1.3, 2.3); k.fill();
  k.fillStyle = '#4f7fc0'; oval(ex, ey, rx, ry, 2.3); k.fill();
  k.save(); oval(ex, ey, rx, ry, 2.3); k.clip();
  for (let y = ey - ry; y < ey + ry; y += 3) {
    for (let i = ex - rx; i < ex + rx; i += 3) {
      const hh = hash(Math.round(i * 3 + y), 71) % 6;
      k.fillStyle = hh === 0 ? '#9cc0ea' : hh === 1 ? '#34598e' : '#4f7fc0';
      k.fillRect(i, y, 2, 2);
    }
  }
  k.restore();
  k.fillStyle = '#cfd2d4'; k.fillRect(x + 4, base - 4, w - 8, 4);                    // podium
}
// Batumi Tower (the Technological University), after the owner's photo: a slender white tower slashed with
// dark slits, blue glass at the foot cut on a slant with a white ribbon, a blue-violet band, a golden Ferris
// wheel set into the upper facade, and a stepped crown with a needle spire.
function batumiTower(k, x, base) {
  const w = 28, top = base - 128, white = '#f2f4f6', slit = '#36557f', glass = '#2f5f93';
  k.fillStyle = '#c8d0d8'; k.fillRect(x - 10, base - 8, w + 20, 8);                // the low annex at its foot
  k.fillStyle = white; k.fillRect(x, top, w, base - top);
  k.fillStyle = slit;                                                              // dark vertical slits of varying length
  for (let i = 0; i < 9; i++) for (let y = top + 3 + hash(i, 7) % 9; y < base - 30; y += 14 + hash(i, y) % 8) {
    k.fillRect(x + 2 + i * 3, y, 1, 4 + hash(y, i) % 7);
  }
  k.fillStyle = '#dfe3e8'; k.fillRect(x + w - 3, top, 3, base - top);              // the shaded side
  k.fillStyle = glass;                                                             // blue glass at the bottom, cut on a slant
  k.beginPath(); k.moveTo(x, base); k.lineTo(x, base - 48); k.lineTo(x + w, base - 30); k.lineTo(x + w, base); k.fill();
  k.fillStyle = '#4a7bb0'; for (let y = base - 44; y < base; y += 4) k.fillRect(x, y, w, 1);
  k.strokeStyle = white; k.lineWidth = 1.5;                                        // the white ribbon running down the glass
  k.beginPath(); k.moveTo(x + 2, base - 46); k.lineTo(x + w - 2, base); k.stroke();
  k.fillStyle = '#5d66cf'; k.fillRect(x, base - 76, w, 6);                         // the blue-violet band
  k.fillStyle = '#8890e6'; k.fillRect(x, base - 76, w, 1);
  k.fillStyle = white;                                                             // crown and spire
  k.beginPath(); k.moveTo(x, top); k.lineTo(x + 9, top - 24); k.lineTo(x + 19, top - 24); k.lineTo(x + w, top); k.fill();
  k.fillStyle = '#c9ced6'; k.beginPath(); k.moveTo(x + 4, top); k.lineTo(x + 10, top - 24); k.lineTo(x + 11, top - 24); k.lineTo(x + 6, top); k.fill();
  k.fillStyle = white; k.fillRect(x + 11, top - 38, 6, 14); k.fillRect(x + 12, top - 62, 4, 24);
  k.fillStyle = '#dfe3e8'; k.fillRect(x + 15, top - 62, 1, 38);
  const cx = x + 9, cy = top + 24, R = 9;                                          // the golden Ferris wheel in the facade
  k.fillStyle = '#b8861e'; k.beginPath(); k.arc(cx, cy, R + 1, 0, Math.PI * 2); k.fill();
  k.fillStyle = '#e9b937'; k.beginPath(); k.arc(cx, cy, R - 1, 0, Math.PI * 2); k.fill();
  k.strokeStyle = '#a87518'; k.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    k.beginPath(); k.moveTo(cx, cy); k.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); k.stroke();
  }
  k.fillStyle = '#ffe07a';
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.39; k.fillRect(Math.round(cx + Math.cos(a) * R) - 1.5, Math.round(cy + Math.sin(a) * R) - 1.5, 3, 3); }
  k.fillStyle = '#7a5410'; k.fillRect(cx - 1, cy - 1, 2, 2);
}
// Alliance Privilege / Marriott, after the owner's photo: the whole tower is a tall oval of cream vertical
// fins, and its narrow rounded end, a smaller oval of white diagrid over dark glass, sits inside it on the
// left, sharing the outline. At its foot the oval narrows over a glass lobby, and a white ribbon dips in a U
// and rises into a low arched annex on the right.
function marriott(k, x, base) {
  const cream = '#efe7da', rib = '#d3c8b6', glass = '#2c4868';
  k.fillStyle = glass; k.fillRect(x + 12, base - 44, 36, 44);                      // the glass lobby
  const annex = () => { k.beginPath(); k.moveTo(x + 46, base); k.lineTo(x + 46, base - 26); k.bezierCurveTo(x + 46, base - 63, x + 74, base - 63, x + 74, base - 26); k.lineTo(x + 74, base); k.closePath(); };
  annex(); k.fillStyle = cream; k.fill();
  k.save(); annex(); k.clip();
  k.fillStyle = rib; for (let i = x + 47; i < x + 74; i += 2) k.fillRect(i, base - 62, 1, 62);
  k.fillStyle = glass; k.beginPath(); k.moveTo(x + 48, base); k.lineTo(x + 48, base - 30); k.bezierCurveTo(x + 49, base - 44, x + 58, base - 44, x + 59, base - 30); k.lineTo(x + 59, base); k.fill();
  k.restore();
  const tower = () => { k.beginPath(); k.ellipse(x + 23, base - 93, 23, 93, 0, 0, Math.PI * 2); };   // the outer oval
  tower(); k.fillStyle = cream; k.fill();
  k.save(); tower(); k.clip();
  k.fillStyle = rib; for (let i = x + 1; i < x + 46; i += 2) k.fillRect(i, base - 186, 1, 186);   // vertical fins
  k.restore();
  k.strokeStyle = '#f6f1e8'; k.lineWidth = 2;                                      // the ribbon: down in a U, up into the annex
  k.beginPath(); k.moveTo(x + 40, base - 46); k.bezierCurveTo(x + 40, base - 4, x + 47, base - 4, x + 47, base - 28); k.stroke();
  const cx = x + 11, cy = base - 90, rx = 11, ry = 90;                              // the diagrid oval inside it
  const shell = () => { k.beginPath(); k.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); };
  shell(); k.fillStyle = glass; k.fill();
  k.save(); shell(); k.clip();
  k.strokeStyle = '#eef2f5'; k.lineWidth = 1.1;
  k.beginPath();
  for (let s = -260; s < 120; s += 10) {   // diagrid
    k.moveTo(cx + s, base); k.lineTo(cx + s + 64, base - 192);
    k.moveTo(cx - s, base); k.lineTo(cx - s - 64, base - 192);
  }
  k.stroke();
  k.restore();
  shell(); k.strokeStyle = '#f6f1e8'; k.lineWidth = 1.6; k.stroke();
  k.fillStyle = '#d8283a'; k.fillRect(x + 25, base - 176, 3, 3);                   // the sign on the crown
  k.fillStyle = '#ffffff'; k.fillRect(x + 29, base - 175, 10, 2);
}
// Each landmark sits where it shows through a gap between the khrushchyovkas: a gap centred at world x
// is mid-screen when it lines up with layer x = 0.42 * x + 0.58 * BASE_W / 2 (see LANDMARK_FACTOR);
// other view widths are handled by the shift passed to drawLayer.
const LANDMARK_FACTOR = 0.42;
const LANDMARKS = layer(1500, k => {
  sheraton(k, 280, 194);       // gap at tiles 21–33
  courtyard(k, 469, 194);      // gap at tiles 52–62
  orbi(k, 608, 194);           // gap at tiles 71–90
  batumiTower(k, 920, 194);    // gap at tiles 118–129
  marriott(k, 1034, 194);      // gap at tiles 136–146
  magnolia(k, 1297, 194);      // gap at tiles 179–196, near the end
});
const PALMS = layer(512, (k, w) => {
  k.fillStyle = '#4f8a55'; k.fillRect(0, 185, w, 9);
  for (let x = 0; x < w; x += 4) {   // a clipped hedge with some texture
    k.fillStyle = hash(x, 3) % 2 ? '#5c9a60' : '#559256';
    k.beginPath(); k.arc(x + 2, 186 + (hash(x, 5) % 3) * 0.5, 3.2, 0, Math.PI * 2); k.fill();
  }
  palm(k, 40, 70, 1); palm(k, 190, 84, 2); palm(k, 330, 62, 3); palm(k, 450, 78, 4);
  for (const x of [115, 265, 395]) {
    k.fillStyle = '#3a3f48'; k.fillRect(x, 194 - 46, 2, 46); k.fillRect(x - 6, 194 - 46, 14, 2);
    k.fillStyle = '#fff3c4'; k.fillRect(x - 7, 194 - 45, 3, 3); k.fillRect(x + 6, 194 - 45, 3, 3);
  }
});
const SUN = layer(27, k => { k.fillStyle = '#fff4d6'; k.beginPath(); k.arc(13.5, 13.5, 13, 0, Math.PI * 2); k.fill(); });
const skyGrad = g.createLinearGradient(0, 0, 0, H);
skyGrad.addColorStop(0, '#5fb4ea');
skyGrad.addColorStop(0.6, '#a9dcf2');
skyGrad.addColorStop(1, '#fbe3bf');

// ---------- level ----------
const CAR_COLORS = ['#b8352a', '#2f68a8', '#d9d9d4', '#36383d', '#6f8f3a', '#d9a62e', '#6b4c8c'];
const PASTEL = ['#ead9b8', '#f0c9b8', '#c9dcea', '#e8c98f', '#d8e1c0', '#f2e2d2'];
const isBalc = t => t === BALC || t === BALC_COIN || t === BALC_KHACH;

// metallic paints: [body, shade, highlight]
const PRIUS_COLORS = [
  ['#c9cfd6', '#8e97a1', '#f2f5f8'],   // silver
  ['#e9ecef', '#b3bac2', '#ffffff'],   // pearl white
  ['#8e98a3', '#5f6873', '#c9d0d8'],   // grey
  ['#a3b5c7', '#6c7f93', '#dbe6f1'],   // blue-silver
  ['#b8352a', '#7d1f18', '#e8766a'],   // red
  ['#2f5a9a', '#1d3a68', '#7aa0d6'],   // blue
  ['#3a3d42', '#1f2124', '#767c85'],   // black
  ['#c9b48a', '#93805c', '#efe3c4'],   // champagne
  ['#5f8a5a', '#3d5e3a', '#a2c79c'],   // green
];
const pick = a => a[Math.floor(Math.random() * a.length)];
// Every new game reshuffles the street (owner): vehicles, dogs, what the balconies hold, the poop. The generator
// is seeded per game (game.seed), so a death rebuilds the same street and a tricky spot can be learnt.
const seeded = s => () => {   // mulberry32
  s = (s + 0x6D2B79F5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
let lrand = Math.random;   // the level's generator, reset by buildLevel()
const lpick = a => a[Math.floor(lrand() * a.length)];
const newSeed = () => Math.floor(Math.random() * 2 ** 32);

// kind: 'side' — parked along the street; 'front' / 'rear' — parked across it, nose or boot towards us.
// police: a Georgian patrol car (white, a black stripe with POLICE along the side, light bar) instead of a plain sedan.
// Easter egg: a terracotta pickup parked on the beach past the finish, its bed full of watermelons and mandarins.
const makePickup = x => ({ kind: 'pickup', x, y: GROUND_Y - 20, w: 50, h: 20, face: 1, rects: [{ x, y: GROUND_Y - 12, w: 50, h: 12 }, { x: x + 18, y: GROUND_Y - 18, w: 24, h: 6 }] });
function makeCar(x, i, kind = 'side', police = false) {
  const y = GROUND_Y - 20, color = police ? '#f2f2ee' : CAR_COLORS[(i * 3 + 1) % CAR_COLORS.length], phase = i * 0.37;
  if (kind === 'side') return { kind, x, y, w: 46, h: 20, color, phase, police, face: hash(x, 7) % 2 ? 1 : -1, rects: [{ x, y: y + 9, w: 46, h: 11 }, { x: x + 8, y: y + 2, w: 30, h: 7 }] };
  return { kind, x, y, w: 22, h: 20, color, phase, police, rects: [{ x, y: y + 9, w: 22, h: 11 }, { x: x + 3, y: y + 2, w: 16, h: 7 }] };
}
const DOG_REST = ['sleep', 'sleep', 'lie', 'sit'];   // a resting dog is asleep, lying with its head up or sitting
const makeDog = (x, mode, row, coat, tag) => ({ x, coat, tag, safeX: x, pose: DOG_REST[Math.floor(Math.random() * DOG_REST.length)], sitT: 0, nextSit: rand(3, 8), poseT: 0, y: row * T - 10, w: 14, h: 10, vx: 0, vy: 0, dir: -1, mode, t: Math.random(), active: false, onGround: false, grace: 0, barkT: 1 });
const makeTaxi = x => {   // every Prius gets a random paint each time the level is built (owner)
  const [body, shade, hi] = lpick(PRIUS_COLORS);
  return { kind: 'prius', x, y: GROUND_Y - 18, w: 44, h: 18, vx: 0, vy: 0, dir: -1, active: false, onGround: false, body, shade, hi };
};
// Food-delivery moped: rides with the taxis, faster, a light-blue box on the rear rack.
const MOPED_COLORS = ['#e8e8e8', '#d8281c', '#2b2e33', '#3f7fd8', '#f2c12e', '#2f8f4e', '#e86a1c'];
const makeMoped = x => ({ kind: 'moped', x, y: GROUND_Y - 22, w: 26, h: 22, vx: 0, vy: 0, dir: -1, active: false, onGround: false, color: lpick(MOPED_COLORS) });
// The unhinged e-scooter (owner): a kid in a hoodie standing on a rental scooter, flat out, speeding up and
// slowing down at random and hopping off the kerb now and then. Same taxi logic, same stomp and side hit.
// An electric sightseeing cart from the boulevard (owner): an open frame with two benches of people, a woman
// in a black hijab on the back one. Slow, but it drives the same way as a Prius and is stomped the same way.
const makeCart = x => ({ kind: 'cart', x, y: GROUND_Y - 25, w: 31, h: 25, vx: 0, vy: 0, dir: -1, active: false, onGround: false });
const HOODIES = ['#e8344a', '#2fb37a', '#f2c12e', '#8a4fd0', '#ff7a1a'];
const makeScooter = x => ({ kind: 'scooter', x, y: GROUND_Y - 24, w: 16, h: 24, vx: 0, vy: 0, dir: -1, active: false, onGround: false, hoodie: lpick(HOODIES), phase: lrand() * 6 });

function buildLevel() {
  lrand = seeded(game.seed);
  const tiles = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
  const L = { tiles, cars: [], solids: [], dogs: [], taxis: [], coins: [], items: [], pits: [], buildings: [], ropes: [], fountains: [], poops: [], doors: new Set() };
  for (let c = 0; c < COLS; c++) tiles[12][c] = tiles[13][c] = c >= 214 ? (c >= SEA_COL ? EMPTY : PEBBLE) : GROUND;

  const pit = (x, w) => {
    for (let c = x; c < x + w; c++) tiles[12][c] = tiles[13][c] = EMPTY;
    L.pits.push({ x: x * T, w: w * T });
  };
  const CH = { B: BALC, '?': BALC_COIN, K: BALC_KHACH, '#': CONCRETE };
  const row = (x, y, s) => {   // a row keeps its length and its khachapuri; which balcony holds what is shuffled
    const a = [...s].map(ch => ch !== 'K' && ch !== '#' && lrand() < 0.25 ? (ch === 'B' ? '?' : 'B') : ch);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(lrand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    a.forEach((ch, i) => { if (CH[ch]) tiles[y][x + i] = CH[ch]; });
  };
  const stairs = (x, hs) => hs.forEach((h, i) => { for (let k = 0; k < h; k++) tiles[11 - k][x + i] = CONCRETE; });
  const coins = (x, y, n, arc = 0) => {
    for (let i = 0; i < n; i++) {
      const dy = arc && n > 1 ? Math.round(Math.sin(Math.PI * i / (n - 1)) * arc * T) : 0;
      L.coins.push({ x: (x + i) * T + 4, y: y * T + 3 - dy, taken: false });
    }
  };
  const car = (x, police = false) => L.cars.push(makeCar(x * T, L.cars.length, 'side', police));
  const across = (x, n, police = -1) => {   // police: index of the patrol car in the row, if any
    for (let i = 0; i < n; i++) {
      const c = makeCar(x * T + i * 25, L.cars.length, i === police || hash(x, i) % 2 ? 'front' : 'rear', i === police);
      if (police >= 0 && !c.police && c.color === '#d9d9d4') c.color = '#2f68a8';   // no white car next to the patrol car
      L.cars.push(c);
    }
  };
  const dogAt = (x, mode = 'sleep', r = 12) => L.dogs.push(makeDog(x * T, mode, r, (L.dogs.length * 5) % DOG_COATS.length, hash(x, 3) % DOG_TAGS.length));
  const buddies = [];
  const dog = (x, mode, r) => {   // a spot gets no dog now and then, sometimes a second one asleep next to it
    if (lrand() < 0.25) return;
    dogAt(x, mode, r);
    if (!r && lrand() < 0.3) buddies.push(x + 2);
  };
  const rides = [];
  const ride = x => rides.push(x);   // a stretch of sidewalk with one vehicle on it, picked at the end
  // flat sidewalk to put something down on: no hole or stairs over it, no parked car, off the respawn points
  const flat = x => x > 6 && x < 197 && [x - 1, x, x + 1].every(c => tiles[12][c] === GROUND && tiles[11][c] === EMPTY) &&
    Math.abs(x * T - CHECKPOINT_X) > 2 * T && (x * T < BIRZHA_X - T || x * T > BIRZHA_X + 4 * T) && !L.cars.some(c => c.rects.some(q => q.x < (x + 2) * T && q.x + q.w > (x - 1) * T));
  const taxi = x => L.taxis.push(makeTaxi(x * T));
  const moped = x => L.taxis.push(makeMoped(x * T));       // mopeds and the scooter share the taxi logic
  const scooter = x => L.taxis.push(makeScooter(x * T));
  const cart = x => L.taxis.push(makeCart(x * T));
  // A burst sewer: a pit full of sewage with a geyser in it. You sink on touching it.
  const sewer = (x, w) => { pit(x, w); L.pits[L.pits.length - 1].sewer = true; };
  // Dog poop on the sidewalk: step in it and it splatters. Pure decoration, no effect on the game.
  const poop = x => L.poops.push({ x: x * T + 5, squashed: false });

  // Balconies only on rows 8 and 5: those are the floor lines of floors 3 and 5 (see FLOOR).
  // warm-up
  row(11, 8, '?');
  row(15, 8, 'B?BKB');
  row(17, 5, '?');
  dog(20); dog(24);
  across(27, 3, 1);
  dog(31);
  coins(32, 9, 3);
  row(35, 8, 'BB?BB');
  dog(38, 'patrol');
  pit(43, 2);
  coins(42, 9, 4, 1);
  row(47, 8, 'B?B');
  // cars parked on the sidewalk, a dog asleep between them
  car(53); dog(56); car(57);
  // traffic: one vehicle per stretch of sidewalk (owner: a moped and a taxi together is too hard early on); which
  // one is random, but they get harder along the street — cart, Prius, moped, scooter (owner); see the end
  // the first stretch long enough for traffic
  row(64, 8, 'BBBBBB');
  row(66, 5, '?K?');
  dog(61); dog(70, 'patrol');
  ride(76);
  stairs(78, [1, 2, 3, 4]); pit(82, 2); stairs(84, [4, 3, 2, 1]);
  coins(88, 10, 3);
  row(92, 8, 'B?B?B');
  dog(93, 'patrol'); dog(97, 'patrol');
  sewer(99, 3);
  coins(99, 9, 3);
  dog(106);
  across(103, 2);
  row(108, 8, 'B?B');
  row(112, 5, 'BBKBB');
  dog(116); dog(118);
  ride(122);
  sewer(126, 3);
  coins(125, 8, 5, 2);
  row(131, 8, 'BKB');
  dog(134); dog(136);
  car(139, true); across(143, 2);
  row(148, 8, '??');
  dog(147);
  coins(150, 6, 4);
  L.fountains.push({ x: 156 * T + 8 });   // Neptune, as in front of the drama theatre
  ride(158);
  pit(160, 2);
  row(163, 8, 'BBB');
  dog(166, 'patrol');
  row(171, 8, 'B?B?B?B');
  coins(176, 9, 4);
  dog(174); dog(184, 'patrol');
  ride(177);
  across(179, 3, 1);
  ride(191);
  stairs(197, [1, 2, 3, 4, 5, 6, 7, 8]);
  L.cars.push(makePickup(215 * T));   // the easter egg

  // the traffic: a random ramp, so the easy ones come first — position along the street plus a tile of noise
  const RIDES = [cart, taxi, moped, scooter];
  rides.map((x, i) => clamp(Math.round(i / (rides.length - 1) * 3 + lrand() * 2 - 1), 0, 3))
    .sort((a, b) => a - b).forEach((k, i) => RIDES[k](rides[i]));
  for (const x of buddies) if (flat(x) && !L.dogs.some(d => Math.abs(d.x - x * T) < 2 * T)) dogAt(x);
  // just a few piles (owner), scattered on flat sidewalk, well apart
  for (let n = 0, tries = 0; n < 4 && tries < 200; tries++) {
    const x = 8 + Math.floor(lrand() * 188);
    if (flat(x) && L.poops.every(p => Math.abs(p.x - x * T) > 12 * T)) { poop(x); n++; }
  }

  buildBuildings(L);
  for (const c of L.cars) L.solids.push(...c.rects);
  return L;
}

// Every cluster of balconies gets a khrushchyovka behind it: five floors plus a sixth one somebody added later.
// Floors are 24px, so balcony tiles on rows 8 and 5 sit exactly on the floor lines of floors 3 and 5.
const FLOOR = 24, FLOORS = 5;
const ROOF_Y = GROUND_Y - FLOOR * FLOORS;   // roof of the original five floors
const ADDON_Y = ROOF_Y - FLOOR;             // the added top floor
const CLOTH_COLORS = ['#e8483a', '#3d6fd0', '#ffd23f', '#f4f4f4', '#7ac27a', '#ff9ac0', '#8a5ad0'];

function buildBuildings(L) {
  const spans = [];
  let cur = null;
  for (let c = 0; c < COLS; c++) {
    let has = false;
    for (let r = 0; r < 12; r++) if (isBalc(L.tiles[r][c])) { has = true; L.doors.add(c + ',' + r); }
    if (!has) continue;
    if (cur && c - cur.b <= 5) cur.b = c; else { cur = { a: c, b: c }; spans.push(cur); }
  }
  spans.forEach((s, n) => {
    let x0 = s.a - 1, x1 = s.b + 1;
    const next = spans[n + 1];
    while (x1 - x0 + 1 < 6) { if (!next || x1 + 1 < next.a - 3) x1++; else x0--; }
    L.buildings.push(makeBuilding(x0, x1, n, L));
  });
  // washing lines strung across the gaps between houses that are close enough
  for (let i = 0; i + 1 < L.buildings.length; i++) {
    const a = L.buildings[i], b = L.buildings[i + 1], gap = b.x0 - a.x1 - 1;
    if (gap < 2 || gap > 12) continue;
    const x1 = (a.x1 + 1) * T, x2 = b.x0 * T;
    for (const f of gap > 6 ? [4] : [3, 4]) {
      const items = [], count = Math.floor((x2 - x1 - 6) / 10);
      for (let j = 0; j < count; j++) {
        const h = hash(x1 + j, f);
        if (h % 5 === 0) continue;   // a free spot on the line
        items.push({ u: (j + 1) / (count + 1), kind: h % 4, color: CLOTH_COLORS[(h >>> 4) % CLOTH_COLORS.length] });
      }
      L.ropes.push({ x1, x2, y: GROUND_Y - FLOOR * f + 16, sag: Math.min(14, (x2 - x1) * 0.08), items });
    }
  }
}
function makeBuilding(x0, x1, n, L) {
  const w = (x1 - x0 + 1) * T, top = ADDON_Y - 16;
  const c = document.createElement('canvas');
  c.width = w; c.height = GROUND_Y - top;
  const k = c.getContext('2d');
  k.translate(0, -top);   // draw in world y
  const brick = n % 3 === 1;
  k.fillStyle = brick ? '#e4dfd3' : PASTEL[n % PASTEL.length];
  k.fillRect(0, ROOF_Y, w, GROUND_Y - ROOF_Y);
  if (brick) {   // white silicate brick
    k.fillStyle = 'rgba(0,0,0,0.07)';
    for (let y = ROOF_Y; y < GROUND_Y; y += 3) {
      k.fillRect(0, y, w, 1);
      for (let x = ((y - ROOF_Y) / 3) % 2 * 4; x < w; x += 8) k.fillRect(x, y + 1, 1, 2);
    }
  } else {       // panel seams
    k.fillStyle = 'rgba(0,0,0,0.08)';
    for (let f = 1; f < FLOORS; f++) k.fillRect(0, GROUND_Y - f * FLOOR, w, 1);
    for (let x = 32; x < w; x += 32) k.fillRect(x, ROOF_Y, 1, GROUND_Y - ROOF_Y);
  }
  k.fillStyle = 'rgba(0,0,0,0.12)'; k.fillRect(w - 3, ROOF_Y, 3, GROUND_Y - ROOF_Y);
  k.fillStyle = 'rgba(0,0,0,0.25)'; k.fillRect(0, ROOF_Y, w, 2);
  k.fillStyle = '#9a948a'; k.fillRect(0, GROUND_Y - 5, w, 5);
  // ground-floor shops, clear of the entrances (offsets 1, 5, 9): a greengrocer two columns wide or a
  // SPAR three columns wide, each in about a third of the houses; the one long house left without a shop
  // gets the Mtiuluri restaurant, seven columns wide (it takes the middle entrance's place)
  const kind = n % 3, spar = kind === 1 && x1 - x0 >= 5, resto = kind === 2 && x1 - x0 >= 10;
  const bulba = spar && n === 1;   // the first SPAR's place goes to the Belarusian shop (owner)
  const arch = n === 2;            // the first house with nothing downstairs: a passage under a Camex sign at its right end (owner)
  const shop = arch ? x1 - x0 - 1 : (kind === 0 && x1 - x0 >= 4) || spar || resto ? 2 : -1, shopW = resto ? 7 : bulba ? 4 : spar ? 3 : 2;
  for (let f = 0; f < FLOORS; f++) {
    const fy = GROUND_Y - (f + 1) * FLOOR, fb = fy + FLOOR, balcRow = fb % T === 0 ? fb / T - 1 : -1;
    for (let col = x0; col <= x1; col++) {
      const lx = (col - x0) * T;
      if (f === 0 && shop >= 0 && col - x0 >= shop && col - x0 < shop + shopW) continue;
      if (f === 0 && (col - x0) % 4 === 1) {   // entrance with a concrete canopy
        k.fillStyle = '#5a3d2a'; k.fillRect(lx + 3, fy + 6, 10, FLOOR - 6);
        k.fillStyle = '#b9b2a6'; k.fillRect(lx + 1, fy + 4, 14, 2);
        k.fillStyle = '#d9b26a'; k.fillRect(lx + 10, fy + 14, 1, 2);
      } else if (balcRow >= 0 && L.doors.has(col + ',' + balcRow)) {
        k.fillStyle = '#4a3a30'; k.fillRect(lx + 5, fy + 4, 6, FLOOR - 4);
      } else {
        flatWindow(k, lx + 4, fy + 6, hash(col, f), f === 0);
      }
    }
  }
  if (arch) camexArch(k, shop * T); else if (resto) restoShop(k, shop * T); else if (bulba) bulbaShop(k, shop * T); else if (spar) sparShop(k, shop * T); else if (shop >= 0) vegShop(k, shop * T, n);
  addonFloor(k, w, n);
  return { x0, x1, top, canvas: c };
}
// SPAR supermarket in the ground floor, 48px wide: green fascia with a white panel carrying the red
// SPAR wordmark and the fir-tree emblem, glass shopfront with a sliding door, red stripe along the base.
// Colours after the brand: green #157946, red #ec1b24, white.
const SPAR_GREEN = '#157946', SPAR_RED = '#ec1b24';
const SPAR_TREE = ['..RRR..', '.RRGRR.', 'RRGGGRR', 'RGGGGGR', 'RRRGRRR', '.RRGRR.', '..RRR..'];
function sparShop(k, x) {
  const fy = GROUND_Y - FLOOR, w = 48;
  k.fillStyle = SPAR_GREEN; k.fillRect(x, fy + 1, w, 11);
  k.fillStyle = '#ffffff'; k.fillRect(x + 4, fy + 2, w - 8, 9);
  SPAR_TREE.forEach((r, j) => [...r].forEach((ch, i) => {
    if (ch !== '.') { k.fillStyle = ch === 'R' ? SPAR_RED : SPAR_GREEN; k.fillRect(x + 7 + i, fy + 3 + j, 1, 1); }
  }));
  [...'SPAR'].forEach((ch, i) => FONT[ch].split(' ').forEach((r, j) => [...r].forEach((c, q) => {
    if (c === '#') { k.fillStyle = SPAR_RED; k.fillRect(x + 17 + i * 6 + q, fy + 3 + j, 1, 1); }
  })));
  const gy = fy + 12, gh = GROUND_Y - 5 - gy;
  k.fillStyle = '#9cc3d8'; k.fillRect(x + 1, gy, w - 2, gh);                       // glass
  k.fillStyle = '#c4e0ee'; for (let i = 0; i < 4; i++) k.fillRect(x + 3 + i * 12, gy + 1, 2, 3);   // reflections
  k.fillStyle = '#ffd23f'; k.fillRect(x + 4, gy + 3, 5, 3);                          // promo posters
  k.fillStyle = SPAR_RED; k.fillRect(x + 38, gy + 3, 5, 3);
  k.fillStyle = '#4a4f57';                                                           // mullions and the sliding door
  for (const mx of [x, x + 15, x + 32, x + w - 1]) k.fillRect(mx, gy, 1, gh);
  k.fillRect(x + 23, gy, 1, gh);
  k.fillStyle = '#d9d9d9'; k.fillRect(x + 21, gy + 3, 1, 3); k.fillRect(x + 25, gy + 3, 1, 3);
  k.fillStyle = SPAR_RED; k.fillRect(x, GROUND_Y - 5, w, 2);
  k.fillStyle = SPAR_GREEN; k.fillRect(x, GROUND_Y - 3, w, 1);
}
// BULBALAND, the Belarusian shop in Batumi, after the owner's photo, 64px wide: a white fascia with a small BULBALAND
// in red embroidered letters, a red band edged with white vyshyvanka ornament (the trilingual sign), then a
// curtained window, a white pillar with the red Bulba / Charka / Shkvarka icons, the glass door over granite
// steps and a window with a blue poster.
// A rectangular passage through the ground floor into the courtyard — dark, with the green yard at its end —
// and over it a white Camex sign (the parcel service) in its blue wide flat letters.
const CAMEX_WORD = [['####', '#...', '####'], ['.##.', '#..#', '#..#'], ['#####', '#.#.#', '#.#.#'], ['####', '###.', '####'], ['#..#', '.##.', '#..#']];
function camexArch(k, x) {
  const fy = GROUND_Y - FLOOR, w = 32, cx = x + w / 2, top = fy + 9;
  k.fillStyle = '#cfc8bb'; k.fillRect(x + 3, top, w - 6, GROUND_Y - top);           // the frame
  k.fillStyle = '#2a2622'; k.fillRect(x + 4, top + 1, w - 8, GROUND_Y - top - 1);   // the passage
  k.fillStyle = '#6f8f5a'; k.fillRect(cx - 5, top + 8, 10, GROUND_Y - top - 8);     // the yard at the far end
  k.fillStyle = '#a8c4d8'; k.fillRect(cx - 5, top + 6, 10, 2);
  k.fillStyle = '#4d6b40'; k.fillRect(cx - 5, GROUND_Y - 3, 10, 3);
  k.fillStyle = '#3a342e'; k.fillRect(x + 4, GROUND_Y - 1, w - 8, 1);
  k.fillStyle = '#ffffff'; k.fillRect(x + 2, fy + 1, w - 4, 7);                    // the sign
  k.fillStyle = '#3a7bd5'; k.fillRect(x + 2, fy + 7, w - 4, 1);
  let tx = x + 4;
  for (const rows of CAMEX_WORD) {
    rows.forEach((r, j) => [...r].forEach((c, q) => { if (c === '#') k.fillRect(tx + q, fy + 3 + j, 1, 1); }));
    tx += rows[0].length + 1;
  }
}
const BULBA_FONT = {
  B: ['##.', '#.#', '##.', '#.#', '##.'], U: ['#.#', '#.#', '#.#', '#.#', '###'], L: ['#..', '#..', '#..', '#..', '###'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'], N: ['#.#', '###', '###', '#.#', '#.#'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
};
function bulbaShop(k, x) {
  const fy = GROUND_Y - FLOOR, w = 64, red = '#c8102e', deep = '#9a0b23';
  k.fillStyle = '#f4f2ee'; k.fillRect(x, fy, w, 7);                                  // fascia
  let tx = x + 15;
  for (const ch of 'BULBALAND') {                                                    // small 3×5 letters (owner)
    BULBA_FONT[ch].forEach((r, j) => [...r].forEach((c, q) => {
      if (c === '#') { k.fillStyle = (q + j) % 2 ? deep : red; k.fillRect(tx + q, fy + 1 + j, 1, 1); }   // stitched
    }));
    tx += 4;
  }
  k.fillStyle = red; k.fillRect(x, fy + 7, w, 5);                                     // the red band
  k.fillStyle = '#ffffff';
  for (let i = 0; i < w; i += 4) { k.fillRect(x + i + 1, fy + 7, 1, 1); k.fillRect(x + i + 3, fy + 11, 1, 1); }   // ornament
  for (const [a, b] of [[5, 18], [27, 40], [49, 60]]) for (let i = x + a; i < x + b; i += 2) k.fillRect(i, fy + 9, 1, 1);   // the sign, in three languages
  k.fillStyle = '#e6e8ea'; k.fillRect(x + 22, fy + 7, 1, 5); k.fillRect(x + 44, fy + 7, 1, 5);
  const gy = fy + 12, gh = GROUND_Y - 3 - gy;
  k.fillStyle = '#c9cdd2'; k.fillRect(x + 1, gy, 16, gh);                             // curtained window
  k.fillStyle = '#a9aeb5'; for (let i = x + 2; i < x + 17; i += 2) k.fillRect(i, gy, 1, gh);
  k.fillStyle = '#f7f7f5'; k.fillRect(x + 17, gy, 6, gh);                             // white pillar with the icons
  k.fillStyle = red; k.fillRect(x + 19, gy + 1, 2, 1); k.fillRect(x + 19, gy + 3, 2, 2); k.fillRect(x + 19, gy + 6, 2, 1);
  k.fillStyle = '#2f3238'; k.fillRect(x + 23, gy, 21, gh);                            // the open door, the shop inside
  k.fillStyle = '#6b5a48'; k.fillRect(x + 27, gy + 2, 6, gh - 2);
  k.fillStyle = '#9cc3d8'; k.fillRect(x + 36, gy + 1, 7, gh - 1);
  k.fillStyle = '#9cc3d8'; k.fillRect(x + 45, gy, 18, gh);                            // right window with a blue poster
  k.fillStyle = '#2a6db0'; k.fillRect(x + 50, gy + 1, 10, gh - 1);
  k.fillStyle = '#ffffff'; k.fillRect(x + 54, gy + 2, 2, 1); k.fillRect(x + 53, gy + 3, 4, 1);
  k.fillStyle = '#4a4f57'; for (const mx of [x, x + 23, x + 44, x + w - 1]) k.fillRect(mx, gy, 1, gh);
  k.fillStyle = '#b4b6b8'; k.fillRect(x, GROUND_Y - 3, w, 3);                         // granite base
  k.fillStyle = '#cfd1d3'; k.fillRect(x + 24, GROUND_Y - 3, 20, 1); k.fillRect(x + 22, GROUND_Y - 1, 24, 1);   // the steps
}
// Restaurant «Mtiuluri» (a real one in Batumi), 112px wide: a dark fascia with the lit sign
// «რესტორანი მთიულური» (white, then red) over a light bar, a string of bulbs along the awning, rough grey
// stone pillars with patches of brick and wicker lanterns, and glass fronts with the warm room behind.
function restoShop(k, x) {
  const fy = GROUND_Y - FLOOR, w = 112;
  k.fillStyle = '#1f2125'; k.fillRect(x, fy, w, 12);                                // fascia
  let tx = x + 3;
  for (const [word, face, shade] of [['რესტორანი', '#f4f1ea', '#8d8a84'], ['მთიულური', '#ff3347', '#7a1420']]) {
    for (const ch of word) {
      FONT[ch].split(' ').forEach((r, j) => [...r].forEach((c, q) => {
        if (c !== '#') return;
        k.fillStyle = shade; k.fillRect(tx + q, fy + 2 + j, 1, 2);                   // the letters are 3D boxes
        k.fillStyle = face; k.fillRect(tx + q, fy + 2 + j, 1, 1);
      }));
      tx += 6;
    }
    tx += 6;
  }
  k.fillStyle = '#fff6d8'; k.fillRect(x + 3, fy + 10, w - 6, 1);                    // light bar under the sign
  k.fillStyle = '#3a3d44'; k.fillRect(x, fy + 11, w, 2);                            // awning edge
  k.fillStyle = '#fff4c2'; for (let i = 2; i < w; i += 5) k.fillRect(x + i, fy + 12, 1, 1);   // bulbs
  const gy = fy + 13, gh = GROUND_Y - 2 - gy;
  k.fillStyle = '#6e3f1e'; k.fillRect(x, gy, w, gh);                                // the room behind the glass
  k.fillStyle = '#b4733a'; k.fillRect(x, gy + 3, w, gh - 3);
  k.fillStyle = '#ffe9a0';
  for (let i = 4; i < w; i += 4) k.fillRect(x + i, gy + 1, 1, 1);                   // bulbs strung inside
  for (const cx of [x + 22, x + 80]) { k.fillRect(cx - 2, gy + 3, 1, 1); k.fillRect(cx, gy + 4, 1, 1); k.fillRect(cx + 2, gy + 3, 1, 1); }   // chandeliers
  k.fillStyle = '#8a5226';
  for (let i = 2; i < w; i += 4) k.fillRect(x + i, gy + 4, 1, gh - 4);              // bead curtains
  k.fillStyle = '#e8c08a';
  for (let i = 8; i < w; i += 26) { k.fillRect(x + i, gy + 5, 1, 2); k.fillRect(x + i + 1, gy + 3, 1, 2); }   // glints on the glass
  k.fillStyle = '#2e2a26';
  for (let i = 0; i <= w; i += 13) k.fillRect(x + i, gy, 1, gh);                    // glass frames
  for (const px of [x, x + 53, x + w - 6]) {                                       // stone pillars
    k.fillStyle = '#6f6b67'; k.fillRect(px, gy - 2, 6, GROUND_Y - gy + 2);
    k.fillStyle = '#55524e';
    for (let j = gy; j < GROUND_Y; j += 3) k.fillRect(px + (j % 2 ? 0 : 3), j, 3, 1);
    k.fillStyle = '#a0583a'; k.fillRect(px + 1, gy + 4, 3, 1); k.fillRect(px + 2, gy + 6, 3, 1);   // brick showing through
    k.fillStyle = '#c9a46a'; k.fillRect(px + 2, gy, 2, 3);                          // wicker lantern
    k.fillStyle = '#ffe0a0'; k.fillRect(px + 2, gy + 1, 1, 1);
  }
  k.fillStyle = '#4a4744'; k.fillRect(x, GROUND_Y - 2, w, 2);                       // sill
}
// Ground-floor greengrocer: open shopfront under a striped awning, crates of produce on the pavement
// (tomatoes, cucumbers, aubergines, Adjarian mandarins, potatoes) and a couple of watermelons.
const PRODUCE = [['#d8331f', '#a81f12'], ['#3f8f3a', '#2c6a28'], ['#5a2d6a', '#3e1d4a'], ['#f08a1a', '#c86a0a'], ['#b08a52', '#8a683a']];
function vegShop(k, x, n) {
  const fy = GROUND_Y - FLOOR, awning = hash(n, 32) % 2 ? ['#2f8f4e', '#f2f2ea'] : ['#d8402c', '#f2f2ea'];
  k.fillStyle = '#3b2f28'; k.fillRect(x + 2, fy + 7, 28, FLOOR - 12);              // open shopfront
  k.fillStyle = '#5a4636'; k.fillRect(x + 2, fy + 12, 28, 1);                       // shelf
  for (let i = 0; i < 13; i++) {                                                     // produce on the shelf
    k.fillStyle = PRODUCE[(i + n) % PRODUCE.length][0]; k.fillRect(x + 3 + i * 2, fy + 10 + (i % 2), 2, 2);
  }
  for (let i = 0; i < 8; i++) { k.fillStyle = awning[i % 2]; k.fillRect(x + i * 4, fy + 2, 4, 4); }
  for (let i = 0; i < 8; i += 2) { k.fillStyle = awning[0]; k.fillRect(x + i * 4 + 1, fy + 6, 2, 1); }
  k.fillStyle = 'rgba(0,0,0,0.2)'; k.fillRect(x, fy + 2, 32, 1);
  for (let i = 0; i < 3; i++) {                                                      // crates on the pavement
    const cx = x + 1 + i * 10, [c, d] = PRODUCE[(hash(n, 40 + i) >>> 3) % PRODUCE.length];
    k.fillStyle = '#a8743a'; k.fillRect(cx, GROUND_Y - 6, 9, 6);
    k.fillStyle = '#7e5426'; k.fillRect(cx, GROUND_Y - 4, 9, 1); k.fillRect(cx, GROUND_Y - 1, 9, 1);
    for (let j = 0; j < 4; j++) { k.fillStyle = j % 2 ? d : c; k.fillRect(cx + j * 2 + 1, GROUND_Y - 8 + (j % 2), 2, 2); }
    k.fillStyle = c; k.fillRect(cx + 2, GROUND_Y - 9, 2, 1); k.fillRect(cx + 5, GROUND_Y - 9, 2, 1);
  }
  if (hash(n, 33) % 2) {                                                             // watermelons
    for (const wx of [x + 31, x + 37]) {
      k.fillStyle = '#2f6f2a'; k.fillRect(wx, GROUND_Y - 5, 6, 5); k.fillRect(wx + 1, GROUND_Y - 6, 4, 1);
      k.fillStyle = '#8fc85a'; k.fillRect(wx + 1, GROUND_Y - 4, 1, 3); k.fillRect(wx + 3, GROUND_Y - 5, 1, 4);
    }
  }
}
function flatWindow(k, x, y, h, ground) {
  k.fillStyle = '#f4efe6'; k.fillRect(x - 1, y - 1, 10, 13);
  k.fillStyle = h % 7 === 0 ? '#ffe9a0' : '#6f93b3'; k.fillRect(x, y, 8, 11);
  k.fillStyle = '#f4efe6'; k.fillRect(x + 4, y, 1, 11); k.fillRect(x, y + 3, 4, 1);
  if (ground) {   // first-floor bars
    k.fillStyle = '#3a3a40';
    for (let i = 0; i < 9; i += 3) k.fillRect(x + i, y - 1, 1, 13);
    k.fillRect(x - 1, y + 5, 10, 1);
  } else if (h % 5 === 0) {   // the obligatory air conditioner
    k.fillStyle = '#e8e8e8'; k.fillRect(x + 5, y + 10, 6, 4);
    k.fillStyle = '#b9b9b9'; k.fillRect(x + 6, y + 11, 4, 1);
  }
}
// The sixth floor: a different material, plastic windows, a lean-to tin roof; sometimes only half built.
function addonFloor(k, w, n) {
  const span = [[0, w], [0, Math.round(w * 0.6 / 8) * 8], [Math.round(w * 0.35 / 8) * 8, w]][hash(n, 7) % 3];
  const [a0, a1] = span, kind = n % 3;
  const y = ADDON_Y;
  k.fillStyle = ['#b4553a', '#bdbab2', '#6fa0b8'][kind];
  k.fillRect(a0, y, a1 - a0, FLOOR);
  k.fillStyle = ['#8f3f2a', '#a19e96', '#5a8aa2'][kind];
  if (kind === 0) {
    for (let yy = y + 2; yy < y + FLOOR; yy += 3) { k.fillRect(a0, yy, a1 - a0, 1); for (let x = a0 + ((yy - y) / 3 % 2) * 3; x < a1; x += 6) k.fillRect(x, yy - 2, 1, 2); }
  } else if (kind === 1) {
    for (let yy = y + 5; yy < y + FLOOR; yy += 6) k.fillRect(a0, yy, a1 - a0, 1);
    for (let x = a0 + 11; x < a1; x += 12) k.fillRect(x, y, 1, FLOOR);
  } else {
    for (let x = a0 + 1; x < a1; x += 3) k.fillRect(x, y, 1, FLOOR);
  }
  for (let x = a0 + 4; x + 11 <= a1; x += 16) {
    k.fillStyle = '#ffffff'; k.fillRect(x - 1, y + 6, 12, 12);
    k.fillStyle = '#8fc0dc'; k.fillRect(x, y + 7, 10, 10);
    k.fillStyle = '#ffffff'; k.fillRect(x + 5, y + 7, 1, 10);
  }
  // lean-to roof of corrugated sheet metal
  const roof = ['#9b5a3a', '#4f7fa8', '#4f8a5f'][(n + 1) % 3], len = a1 - a0 + 4;
  for (let i = 0; i < len; i++) {
    const ry = y - 1 - Math.round(5 * (1 - i / len));
    k.fillStyle = i % 3 ? roof : 'rgba(0,0,0,0.25)';
    k.fillRect(a0 - 2 + i, ry, 1, y - ry + 1);
  }
  k.fillStyle = roof; k.fillRect(a0 - 2, y, len, 1);
  // whatever is left of the old roof: rebar sticking out, a half-built wall, a dish
  const free = a0 > 0 ? [0, a0] : a1 < w ? [a1, w] : null;
  if (free) {
    k.fillStyle = '#6b4a3a';
    for (let x = free[0] + 3; x < free[1] - 2; x += 6) k.fillRect(x, ROOF_Y - 7, 1, 7);
    k.fillStyle = '#bdbab2';
    const sx = a0 > 0 ? a0 - 14 : a1;
    k.fillRect(sx, ROOF_Y - 8, 14, 8);
    k.fillStyle = '#a19e96'; k.fillRect(sx, ROOF_Y - 4, 14, 1); k.fillRect(sx + 7, ROOF_Y - 8, 1, 4);
  }
  const dx = a0 + 6;
  k.fillStyle = '#d8d8d8'; k.fillRect(dx, y - 12, 5, 5);
  k.fillStyle = '#9a9a9a'; k.fillRect(dx + 2, y - 7, 1, 3);
}

// ---------- state ----------
const game = { state: 'title', score: 0, coins: 0, lives: 3, time: TIME_LIMIT, checkpoint: false, paused: false, hi: loadHi(), seed: newSeed(), t: 0, dieT: 0, winDone: false, fw: 0 };
let level, player;
const cam = { x: 0 };
let particles = [], texts = [];
const bumps = new Map();

function loadHi() { try { return +localStorage.getItem('mario-batumi-hi') || 0; } catch (e) { return 0; } }
function saveHi() {
  if (game.score <= game.hi) return;
  game.hi = game.score;
  try { localStorage.setItem('mario-batumi-hi', String(game.hi)); } catch (e) { /* storage unavailable */ }
}

const makePlayer = x => ({ x, y: GROUND_Y - 15, w: 10, h: 15, vx: 0, vy: 0, big: false, face: 1, onGround: false, coyote: 0, buffer: 0, inv: 0, stun: 0, dead: false, anim: 0, prevBottom: 0 });

function startLevel() {
  level = buildLevel();
  level.flagY = game.checkpoint ? FLAG_TOP : FLAG_BOTTOM;
  player = makePlayer(game.checkpoint ? CHECKPOINT_X : 3 * T);
  if (game.checkpoint) player.inv = 1.5;
  game.time = TIME_LIMIT;
  particles = []; texts = []; bumps.clear();
  updateCamera();
}
function newGame() {
  Object.assign(game, { score: 0, coins: 0, lives: 3, checkpoint: false, paused: false, winDone: false, seed: newSeed() });
  startLevel();
  game.state = 'play';
  musicStart();
}
function updateCamera() {
  cam.x = clamp(player.x + player.w / 2 - W * (W < 260 ? 0.3 : 0.42), 0, COLS * T - W);   // narrow views look further ahead
}

const addText = (x, y, s, color = '#ffffff') => texts.push({ x, y, s, color, life: 1 });
function addScore(n, x, y) { game.score += n; if (x !== undefined) addText(x, y, '+' + n); }
function addCoin() {
  game.coins++;
  game.score += 200;
  sfx.coin();
  if (game.coins >= 100) {
    game.coins -= 100; game.lives++;
    addText(player.x + player.w / 2, player.y - 10, STR.lifeUp, '#7dff8a');
  }
}

// ---------- physics ----------
function solidTile(tx, ty) {
  if (tx < 0 || tx >= COLS) return true;
  if (ty < 0 || ty >= ROWS) return false;
  return level.tiles[ty][tx] !== EMPTY;
}
function solidsNear(b) {
  const out = [];
  const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
  const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) if (solidTile(tx, ty)) out.push({ x: tx * T, y: ty * T, w: T, h: T, tx, ty });
  }
  for (const r of level.solids) if (overlap(b, r)) out.push(r);
  return out;
}
// Moves along x then y, resolving against tiles and parked cars. `head` is the tile bonked from below.
function moveBody(b, dt) {
  const res = { hitX: false, head: null };
  b.x += b.vx * dt;
  for (const r of solidsNear(b)) {
    if (!overlap(b, r)) continue;
    if (b.vx > 0) b.x = r.x - b.w; else if (b.vx < 0) b.x = r.x + r.w; else continue;
    res.hitX = true;
  }
  if (res.hitX) b.vx = 0;
  b.onGround = false;
  b.y += b.vy * dt;
  let hitY = false, best = Infinity;
  for (const r of solidsNear(b)) {
    if (!overlap(b, r)) continue;
    if (b.vy > 0) { b.y = r.y - b.h; b.onGround = true; } else if (b.vy < 0) {
      b.y = r.y + r.h;
      if (r.tx !== undefined) {
        const d = Math.abs(r.x + T / 2 - (b.x + b.w / 2));
        if (d < best) { best = d; res.head = r; }
      }
    } else continue;
    hitY = true;
  }
  if (hitY) b.vy = 0;
  return res;
}
function edgeAhead(b, dir) {
  const tx = Math.floor((dir > 0 ? b.x + b.w + 1 : b.x - 1) / T);
  return !solidTile(tx, Math.floor((b.y + b.h + 1) / T));
}

// ---------- player ----------
function updatePlayer(dt) {
  const pl = player;
  if (pl.stun > 0) pl.stun -= dt;
  const dir = pl.stun > 0 ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const max = input.run ? PHYS.run : PHYS.walk;
  if (dir) {
    pl.face = dir;
    const turning = Math.sign(pl.vx) === -dir;
    const a = (pl.onGround ? PHYS.acc : PHYS.accAir) + (turning && pl.onGround ? PHYS.fric : 0);
    pl.vx += dir * a * dt;
    if (Math.abs(pl.vx) > max) pl.vx = Math.sign(pl.vx) * Math.max(max, Math.abs(pl.vx) - (a + PHYS.fric) * dt);
  } else if (pl.onGround) {
    pl.vx = approach(pl.vx, 0, PHYS.fric * dt);
  }
  pl.coyote = pl.onGround ? 0.08 : pl.coyote - dt;
  pl.buffer = input.pressed.has('jump') ? 0.12 : pl.buffer - dt;
  if (pl.buffer > 0 && pl.coyote > 0) {
    pl.vy = -(PHYS.jumpV + Math.abs(pl.vx) * 0.18);
    pl.buffer = 0; pl.coyote = 0; pl.onGround = false;
    sfx.jump();
  }
  const grav = PHYS.g * (input.jump && pl.vy < 0 ? PHYS.hold : 1);
  pl.vy = Math.min(pl.vy + grav * dt, PHYS.maxFall);
  pl.prevBottom = pl.y + pl.h;
  const res = moveBody(pl, dt);
  if (res.head) hitBlock(res.head.tx, res.head.ty);
  if (pl.inv > 0) pl.inv -= dt;
  pl.anim += Math.abs(pl.vx) * dt;
  if (pl.y > H + 16) killPlayer(true);
  if (!pl.splashed && pl.y + pl.h > GROUND_Y + 10 && level.pits.some(p => !p.sewer && pl.x + pl.w > p.x && pl.x < p.x + p.w)) {
    pl.splashed = true;   // into the sea through a hole in the embankment
    for (let i = 0; i < 10; i++) {
      particles.push({ x: pl.x + pl.w / 2 + rand(-6, 6), y: GROUND_Y + 7, vx: rand(-80, 80), vy: rand(-240, -110), g: 900, life: 1, size: 2 + (i % 2), color: i % 3 ? '#7cc3e8' : '#ffffff' });
    }
    sfx.splash();
  }
  for (const p of level.pits) {
    if (p.sewer && !pl.dead && pl.x + pl.w > p.x + 2 && pl.x < p.x + p.w - 2 && pl.y + pl.h > SEWAGE_Y + 2) {
      for (let i = 0; i < 10; i++) {
        particles.push({ x: pl.x + pl.w / 2 + rand(-6, 6), y: SEWAGE_Y - 2, vx: rand(-80, 80), vy: rand(-260, -120), g: 900, life: 1, size: 2 + (i % 2), color: i % 3 ? '#6b6230' : '#9a9256' });
      }
      addText(pl.x + pl.w / 2, SEWAGE_Y - 26, STR.eww, '#c9e26a');
      sfx.splash();
      killPlayer(true);
    }
  }
  if (pl.onGround && !pl.dead) for (const p of level.poops) {
    if (p.squashed || pl.x + pl.w < p.x + 1 || pl.x > p.x + 4 || pl.y + pl.h < GROUND_Y - 1) continue;
    p.squashed = true;
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1;
      particles.push({ x: p.x + 2, y: GROUND_Y - 2, vx: side * rand(30, 110), vy: rand(-190, -70), g: 900, life: 0.55, size: 1 + (i % 3 === 0), color: i % 3 ? '#6b4423' : '#8f5e34' });
    }
    addText(p.x + 2, GROUND_Y - 26, STR.eww, '#c9a26a');
    sfx.squish();
  }
}
function grow() {
  const pl = player;
  pl.big = true;
  pl.x -= 4; pl.w = 18; pl.y -= 15; pl.h = 30;
  if (solidsNear(pl).some(r => overlap(pl, r))) pl.x += 4;
}
function shrink() {
  const pl = player;
  pl.big = false;
  pl.x += 4; pl.w = 10; pl.y += 15; pl.h = 15;
}
function hurtPlayer() {
  if (player.inv > 0 || player.dead) return;
  if (player.big) { shrink(); player.inv = 2; sfx.hurt(); } else killPlayer(false);
}
function killPlayer(fell) {
  if (player.dead) return;
  if (GOD) {
    if (fell) { player.y = Math.min(player.y, GROUND_Y + 8); player.vy = -720; player.splashed = false; }
    if (game.time <= 0) game.time = 300;
    return;
  }
  player.dead = true;
  player.vx = 0;
  player.vy = fell ? 0 : -380;
  game.state = 'dying';
  game.dieT = 0;
  musicStop();
  sfx.die();
}
const stomped = box => player.vy > 0 && player.prevBottom <= box.y + 6;

function hitBlock(tx, ty) {
  const t = level.tiles[ty][tx];
  const x = tx * T, y = ty * T;
  if (t === BALC) {
    level.tiles[ty][tx] = EMPTY;
    sfx.brk();
    game.score += 50;
    for (let i = 0; i < 6; i++) {
      particles.push({
        x: x + 4 + (i % 3) * 4, y: y + 6 + (i > 2 ? 5 : 0), vx: (i % 3 - 1) * 60 + rand(-20, 20), vy: rand(-320, -200),
        g: 900, life: 1.5, size: 3 + (i % 2), color: i % 2 ? '#b8afa2' : '#3d3e46',
      });
    }
    if (Math.random() < 0.3) {
      particles.push({ kind: 'slipper', x: x + 6, y: y + 8, vx: rand(-40, 40), vy: -150, g: 700, life: 1.6 });
      addText(x + 8, y - 6, STR.slipper, '#ffb3d1');
    }
  } else if (t === BALC_COIN || t === BALC_KHACH) {
    level.tiles[ty][tx] = USED;
    bumps.set(tx + ',' + ty, 0.15);
    if (t === BALC_COIN) {
      addCoin();
      particles.push({ kind: 'coin', x: x + 4, y: y - 10, vx: 0, vy: -260, g: 900, life: 0.5 });
    } else {
      level.items.push({ x: x + 1, y: y + 4, w: 14, h: 8, vx: 0, vy: 0, dir: 1, emerging: true, top: y - 8 });
      sfx.sprout();
    }
  } else {
    sfx.bump();
  }
  // a dog napping on the balcony you just hit gets startled into friendship
  for (const d of level.dogs) {
    if (d.mode !== 'happy' && Math.abs(d.y + d.h - y) < 2 && d.x + d.w > x && d.x < x + T) befriend(d);
  }
}

// ---------- enemies & items ----------
function befriend(d) {
  d.mode = 'happy'; d.vx = 0; d.pose = 'wag'; d.poseT = rand(1.5, 3);
  game.score += 200;
  addText(d.x + d.w / 2, d.y - 8, STR.goodDog, '#ffd1dc');
  sfx.stomp();
}
function checkJumpOver(e) {
  const side = Math.sign(player.x + player.w / 2 - (e.x + e.w / 2));
  if (e.jumped || !side) return;
  if (e.lastSide && side !== e.lastSide && !player.onGround && player.y + player.h < e.y + 2) {
    e.jumped = true;
    game.score += 100;
    addText(e.x + e.w / 2, e.y - 10, STR.jumpedOver, '#fff27a');
  }
  e.lastSide = side;
}
function updateDog(d, dt) {
  if (!d.active) { if (d.x < cam.x + W + 32) d.active = true; else return; }
  d.t += dt;
  if (d.grace > 0) d.grace -= dt;
  const pl = player;
  const dx = pl.x + pl.w / 2 - (d.x + d.w / 2);
  let speed = 0;
  if (d.mode === 'sleep') {
    if (Math.abs(dx) < 72 && Math.abs(pl.y - d.y) < 48) wake(d);
  } else if (d.mode === 'chase') {
    if (Math.abs(dx) > 20) d.dir = Math.sign(dx);
    speed = 52;
    d.barkT -= dt;
    if (d.barkT <= 0) { d.barkT = rand(1.2, 2.4); addText(d.x + d.w / 2, d.y - 8, STR.woof); sfx.bark(); }
  } else if (d.mode === 'patrol') {   // walks up and down, sitting down for a moment now and then
    if (d.sitT > 0) d.sitT -= dt;
    else {
      speed = 30;
      if ((d.nextSit -= dt) <= 0) { d.sitT = rand(1, 2.5); d.nextSit = rand(4, 9); }
    }
  } else if (d.mode === 'happy' && (d.poseT -= dt) <= 0) {   // a friend wags, sits or lies down by turns
    d.pose = ['wag', 'wag', 'sit', 'lie'][Math.floor(Math.random() * 4)];
    d.poseT = rand(2, 4);
  }
  if (speed && d.onGround && edgeAhead(d, d.dir)) {
    if (d.mode === 'patrol') d.dir *= -1; else speed = 0;   // chasers stop at the edge and bark from there
  }
  d.vx = speed * d.dir;
  d.vy = Math.min(d.vy + PHYS.g * dt, PHYS.maxFall);
  if (moveBody(d, dt).hitX) d.dir *= -1;
  if (d.onGround) d.safeX = d.x;
  if (d.y > H) { d.x = d.safeX; d.y = GROUND_Y - 40; d.vy = 0; }   // nobody gets lost in a pit
  for (const c of level.taxis) {   // a Prius never runs a dog over: the dog hops onto the roof and off
    if (d.onGround && c.active && overlap(d, { x: c.x - 6, y: c.y, w: c.w + 12, h: c.h })) {
      d.vy = -460;
      if (d.mode === 'sleep') wake(d);
    }
  }
  if (d.mode === 'happy' || pl.dead) return;
  checkJumpOver(d);
  if (!overlap(pl, d)) return;
  if (stomped(d)) {
    pl.vy = input.jump ? -420 : -300;
    befriend(d);
  } else if (d.mode === 'sleep') {
    wake(d);
  } else if (d.grace <= 0) {
    bowlOver(d);
  }
}
// Dogs never hurt anyone: an over-friendly dog just jumps on you and knocks you back.
function bowlOver(d) {
  const pl = player;
  let dir = Math.sign(pl.x + pl.w / 2 - (d.x + d.w / 2)) || -d.dir;
  // never knock Giorgi into a pit or the sewage: close to a gap he only hops on the spot
  const front = dir > 0 ? pl.x + pl.w : pl.x;
  if (level.pits.some(p => (dir > 0 ? p.x - front : front - p.x - p.w) > -4 && (dir > 0 ? p.x - front : front - p.x - p.w) < 80)) dir = 0;
  pl.vx = dir * 170;
  pl.vy = -220;
  pl.stun = 0.35;
  d.grace = 1;
  addText(d.x + d.w / 2, d.y - 8, STR.woofWoof);
  sfx.bark();
}
function wake(d) {
  d.mode = 'chase'; d.grace = 0.4; d.barkT = rand(1.2, 2);
  addText(d.x + d.w / 2, d.y - 8, STR.woof);
  sfx.bark();
}
function updateTaxi(c, dt) {
  if (!c.active) {
    if (c.x >= cam.x + W + 8) return;
    c.active = true;
    if (c.kind === 'moped') { sfx.moped(); addText(c.x + c.w / 2, c.y - 10, STR.delivery, '#7fd6ff'); }
    else if (c.kind === 'scooter') { sfx.scooter(); addText(c.x + c.w / 2, c.y - 10, STR.scooter, '#ff9ad0'); }
    else if (c.kind === 'cart') { sfx.cart(); addText(c.x + c.w / 2, c.y - 10, STR.tour, '#9fe8b0'); }
    else { sfx.honk(); addText(c.x + c.w / 2, c.y - 10, STR.honk, '#ffe27a'); }
  }
  const front = c.dir < 0 ? c.x - 2 : c.x + c.w + 2;   // turn back at the edge of a hole instead of bridging it
  if (c.y + c.h >= GROUND_Y - 1 && level.pits.some(p => front > p.x && front < p.x + p.w)) c.dir *= -1;
  const speed = c.kind === 'scooter' ? 195 + 45 * Math.sin(game.t * 2.3 + c.phase) : c.kind === 'moped' ? 140 : c.kind === 'cart' ? 70 : 110;
  c.vx = speed * c.dir;
  if (c.kind === 'scooter' && c.onGround && Math.random() < dt * 0.9) c.vy = -290;   // hops for no reason
  c.vy = Math.min(c.vy + PHYS.g * dt, PHYS.maxFall);
  if (moveBody(c, dt).hitX) c.dir *= -1;
  if (c.y > H + 20 || c.x < cam.x - 500 || c.x > cam.x + W + 500) { c.dead = true; return; }
  if (player.dead) return;
  const box = { x: c.x + 1, y: c.y + 2, w: c.w - 2, h: c.h - 2 };
  checkJumpOver(c);
  if (!overlap(player, box)) return;
  if (stomped(box)) {
    player.y = box.y - player.h;
    player.vy = input.jump ? -560 : -460;   // the roof works like a trampoline
    game.score += 100;
    if (c.kind === 'moped') { addText(c.x + c.w / 2, c.y - 8, STR.order, '#7fd6ff'); sfx.stomp(); }
    else if (c.kind === 'scooter') { addText(c.x + c.w / 2, c.y - 8, STR.zoom, '#ff9ad0'); sfx.stomp(); }
    else { addText(c.x + c.w / 2, c.y - 8, STR.beep, '#ffe27a'); sfx.beep(); }
  } else {
    hurtPlayer();
  }
}
function updateItems(dt) {
  for (const it of level.items) {
    if (it.emerging) {
      it.y -= 24 * dt;
      if (it.y <= it.top) { it.y = it.top; it.emerging = false; }
    } else {
      it.vx = 50 * it.dir;
      it.vy = Math.min(it.vy + PHYS.g * dt, PHYS.maxFall);
      if (moveBody(it, dt).hitX) it.dir *= -1;
      if (it.y > H) it.dead = true;
    }
    if (!it.dead && !player.dead && overlap(player, it)) {
      it.dead = true;
      sfx.power();
      if (player.big) addScore(1000, it.x + 7, it.y - 6);
      else { grow(); addText(it.x + 7, it.y - 6, STR.khachapuri, '#ffd23f'); game.score += 1000; }
    }
  }
  level.items = level.items.filter(it => !it.dead);
}
function collectCoins() {
  for (const c of level.coins) {
    if (!c.taken && overlap(player, { x: c.x, y: c.y, w: 8, h: 10 })) { c.taken = true; addCoin(); }
  }
}
function firework() {
  const x = cam.x + rand(60, W - 60), y = rand(30, 90);
  const color = ['#ff5a5a', '#ffd23f', '#7dd3ff', '#ffffff', '#7dff8a'][Math.floor(rand(0, 5))];
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2, s = rand(50, 90);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 120, life: 1.1, size: 2, color });
  }
  noise(0.3, 0.12);
}
function updateFx(dt) {
  for (const p of particles) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  particles = particles.filter(p => p.life > 0 && p.y < H + 20);
  for (const t of texts) { t.life -= dt; t.y -= 18 * dt; }
  texts = texts.filter(t => t.life > 0);
  for (const [k, v] of bumps) { if (v - dt <= 0) bumps.delete(k); else bumps.set(k, v - dt); }
}

// ---------- game flow ----------
function win() {
  game.state = 'won';
  game.winDone = false;
  game.fw = 0;
  musicStop();
  sfx.win();
}
function updateDying(dt) {
  game.dieT += dt;
  if (game.dieT > 0.5) { player.vy += PHYS.g * 0.5 * dt; player.y += player.vy * dt; }
  if (game.dieT < 2.8) return;
  game.lives--;
  if (game.lives > 0) { startLevel(); game.state = 'play'; musicStart(); } else { game.state = 'over'; saveHi(); }
}
function updateWon(dt, go) {
  const pl = player;
  pl.vx = pl.x + pl.w < STATUE_X - 30 ? 60 : 0;
  if (pl.vx) pl.face = 1;
  pl.vy = Math.min(pl.vy + PHYS.g * dt, PHYS.maxFall);
  moveBody(pl, dt);
  pl.anim += Math.abs(pl.vx) * dt;
  updateCamera();
  if (game.time > 0) {
    const n = Math.min(Math.ceil(game.time), 2);
    game.time = Math.max(0, Math.ceil(game.time) - n);
    game.score += n * 50;
    if (Math.floor(game.t * 60) % 4 === 0) tone(1200, 0.02, 'square', null, 0.05);
  } else if (!game.winDone) {
    game.winDone = true;
    saveHi();
  }
  game.fw -= dt;
  if (game.fw <= 0) { game.fw = 0.6; firework(); }
  if (game.winDone && go) newGame();
}
function update(dt) {
  game.t += dt;
  const pr = input.pressed;
  if (pr.has('mute')) toggleMute();
  const go = pr.has('start') || pr.has('jump');
  if (game.state === 'title' || game.state === 'over') { if (go) newGame(); return; }
  if (game.state === 'dying') { updateDying(dt); updateFx(dt); return; }
  if (game.state === 'won') { updateWon(dt, go); updateFx(dt); return; }
  if (pr.has('pause') || (game.paused && pr.has('start'))) game.paused = !game.paused;
  if (game.paused) return;
  game.time -= dt;
  if (game.time <= 0) { game.time = 0; killPlayer(false); return; }
  updatePlayer(dt);
  if (game.state !== 'play') return;
  for (const d of level.dogs) updateDog(d, dt);
  for (const c of level.taxis) updateTaxi(c, dt);
  level.taxis = level.taxis.filter(c => !c.dead);
  updateItems(dt);
  collectCoins();
  updateFx(dt);
  updateCamera();
  if (!game.checkpoint && player.x > CHECKPOINT_X) {
    game.checkpoint = true;
    addText(CHECKPOINT_X + 8, GROUND_Y - 60, STR.checkpoint, '#ffd23f');
    sfx.power();
  }
  if (game.checkpoint) level.flagY = Math.max(FLAG_TOP, level.flagY - 32 * dt);   // the flag is hoisted, not teleported
  if (game.state === 'play' && player.x > FINISH_X) win();
}

// ---------- drawing: world ----------
// `shift` moves a layer by screen pixels; LANDMARKS uses it to stay lined up with the gaps at any view width.
function drawLayer(img, factor, shift = 0) {
  const w = img.width;
  let x = (shift - cam.x * factor) % w;
  if (x > 0) x -= w;
  for (; x < W; x += w) g.drawImage(img, Math.round(x), 0);
}
function wheel(x, y) {
  g.fillStyle = '#1d1d21'; g.fillRect(x + 1, y, 5, 6); g.fillRect(x, y + 1, 7, 4);
  g.fillStyle = '#8d939b'; g.fillRect(x + 2, y + 2, 3, 2);
}
function drawBuilding(b) {
  const x = b.x0 * T;
  if (x > cam.x + W || x + b.canvas.width < cam.x) return;
  g.drawImage(b.canvas, x, b.top);
}
// kind: 0 shirt, 1 trousers, 2 bedsheet, 3 socks; hangs from (x, y), `s` is the sway of the free end.
function drawCloth(kind, color, x, y, s) {
  g.fillStyle = color;
  if (kind === 0) { g.fillRect(x - 3, y, 7, 2); g.fillRect(x - 2 + s, y + 2, 5, 4); }
  else if (kind === 1) { g.fillRect(x - 2, y, 5, 2); g.fillRect(x - 2 + s, y + 2, 2, 5); g.fillRect(x + 1 + s, y + 2, 2, 5); }
  else if (kind === 2) { g.fillRect(x - 4, y, 9, 2); g.fillRect(x - 4 + s, y + 2, 9, 6); }
  else { g.fillRect(x - 2, y, 1, 3); g.fillRect(x - 2 + s, y + 3, 2, 1); g.fillRect(x + 2, y, 1, 3); g.fillRect(x + 2 + s, y + 3, 2, 1); }
  g.fillStyle = '#7a5a3a'; g.fillRect(x, y - 1, 1, 1);
}
// Neptune fountain: basin, two-tier pedestal with gilded mermaids, a gilded Neptune with a trident.
// The old Wedding House at the entrance to the boulevard (demolished 25.02.2026), known as "the pig's head",
// drawn after the owner's photo from the boulevard side: a pointed snout on the left, a tall sharp ear on top,
// a crease running down from the ear between the flat left face and the dome, the dome flat on top and rounded
// at the right, the glass "eye" under the snout, all on a saucer-like brim in a pool. The outline is traced
// from the photo; heights are measured from the bottom of the canvas.
const WEDDING = (() => {
  const w = 101, h = 70, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const k = c.getContext('2d'), px = (x, y, col) => { k.fillStyle = col; k.fillRect(x, h - 1 - y, 1, 1); };
  const inPoly = (x, y, pts) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const nearLine = (x, y, pts, d) => pts.slice(1).some(([x2, y2], i) => {
    const [x1, y1] = pts[i], dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - x1 - t * dx, y - y1 - t * dy) < d;
  });
  const SHELL = [[0, 37], [16, 44], [30, 52], [34, 68], [37, 63], [45, 54], [56, 55], [66, 55], [78, 51], [85, 46],
    [90, 41], [94, 33], [97, 21], [97, 10], [25, 10], [7, 30]];
  const GLASS = [[7, 31], [25, 10], [6, 10], [4, 15], [4, 24], [5, 28]];
  const CREASE = [[37, 63], [48, 45], [53, 39], [55, 10]];
  for (let x = 0; x < w; x++) {
    const brimTop = 10.5, brimBottom = 4 + 4 * ((x - 50) / 50) ** 2;
    for (let y = 0; y < h; y++) {
      const X = x + 0.5, Y = y + 0.5;
      if (inPoly(X, Y, SHELL)) {
        const edge = !inPoly(X, Y + 1, SHELL) && Y > 30;
        const col = edge ? '#ffffff' : nearLine(X, Y, CREASE, 0.7) ? '#d3d0c7'
          : X > 89 || Y < 14 ? '#e5e3dc' : X < 54 && Y < 30 - (X - 25) * 0.4 ? '#ebe9e3' : '#f6f5f0';
        px(x, y, col);
      } else if (inPoly(X, Y, GLASS)) px(x, y, (x * 2 + y) % 11 < 2 ? '#c2e3ec' : y < 18 ? '#5f8f9f' : '#7fb0bf');
      else if (Y >= brimBottom && Y <= brimTop) px(x, y, Y > brimTop - 1 ? '#ffffff' : Y < brimBottom + 1 ? '#cfcbc1' : '#eeece6');
    }
  }
  k.fillStyle = '#d9d2c4'; k.fillRect(0, h - 5, w, 1);                           // pool: stone rim, water
  k.fillStyle = '#5fb3d3'; k.fillRect(0, h - 4, w, 4);
  k.fillStyle = '#a5dff0'; for (let x = 3; x < w; x += 7) k.fillRect(x, h - 3, 3, 1);
  return c;
})();
const WEDDING_X = 71 * T + 6;   // in the gap before the stairs
// A bride and groom outside the Wedding House (owner), a little shorter than Giorgi, hearts floating up over them.
const NEWLYWEDS = [
  '.hhhhh....vvv..',
  '.sssss...vsssv.',
  '.sKsKs...vKsKv.',
  '..sss...vvsssvv',
  'bbbwbbb.vdddddv',
  'bbbwbbb.vdddddv',
  'bbbkbbb.vddrddv',
  'bbbbbbsssddgdd.',
  'sbbbbb...ddddd.',
  '.bb.bb...ddddd.',
  '.bb.bb..ddddddd',
  '.bb.bb..ddddddd',
  '.bb.bb..ddddddd',
  'kkk.kkk.eeeeeee',
];
const NEWLYWED_INK = { K: '#1d1f24', h: '#2a1d14', s: '#f0c8a0', w: '#ffffff', b: '#1d1f24', k: '#0d0d0f', v: '#f2f4f8', d: '#fbfbf7', e: '#d8d4ca', r: '#e8344a', g: '#3d8a3a' };
function drawWedding() {
  if (WEDDING_X > cam.x + W || WEDDING_X + WEDDING.width < cam.x) return;
  g.drawImage(WEDDING, WEDDING_X, GROUND_Y - WEDDING.height);
  const x = WEDDING_X + 40, y = GROUND_Y - NEWLYWEDS.length;                       // a little shorter than Giorgi (owner)
  g.fillStyle = '#d9d2c4'; g.fillRect(x - 3, GROUND_Y - 5, 21, 5);                  // a stone path across the pool
  g.fillStyle = '#c4bcac'; g.fillRect(x - 3, GROUND_Y - 1, 21, 1);
  NEWLYWEDS.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '.') { g.fillStyle = NEWLYWED_INK[ch]; g.fillRect(x + i, y + j, 1, 1); }
  }));
  g.fillStyle = '#ff6b9a';
  for (const ph of [0, 0.5]) {
    const u = (game.t * 0.4 + ph) % 1, hx = x + 6 + Math.round(Math.sin(u * 9 + ph * 7) * 2), hy = Math.round(y - 3 - u * 18);
    g.fillRect(hx, hy, 1, 1); g.fillRect(hx + 2, hy, 1, 1); g.fillRect(hx, hy + 1, 3, 1); g.fillRect(hx + 1, hy + 2, 1, 1);
  }
}
// A birzha (ბირჟა, owner): the yard spot where the men of the neighbourhood sit over nardi and dominoes — two
// pairs face to face across little tables (owner), under a tin canopy with a vine on it, between the houses at
// tiles 118–125. The men sit like the people on the cart.
const BIRZHA_X = 119 * T + 2;
const BIRZHA_MEN = [   // x, facing (1 = right), hair, cap, shirt, trousers, moustache
  { x: 3, dir: 1, hair: '#c9c9c4', cap: null, shirt: '#f4f4ef', legs: '#1d1f24', tash: '#8d8d88' },
  { x: 19, dir: -1, hair: '#2a1d14', cap: '#2b2e33', shirt: '#1f2024', legs: '#5a5d63', tash: null },
  { x: 29, dir: 1, hair: '#9a9a96', cap: null, shirt: '#5a7fa8', legs: '#1d1f24', tash: '#3a3a3a' },
  { x: 45, dir: -1, hair: '#16161a', cap: null, shirt: '#8a8f96', legs: '#3b5a8c', tash: '#16161a', smoke: true },
];
function birzhaMan(m, x, gy, hand) {   // drawn facing left with the torso at 0..3, mirrored to face right
  g.save();
  g.translate(x, gy);
  if (m.dir > 0) { g.translate(4, 0); g.scale(-1, 1); }
  g.fillStyle = '#8a6a48'; g.fillRect(-2, -4, 6, 1);                               // his stool
  g.fillStyle = '#6b4f34'; g.fillRect(-1, -3, 1, 3); g.fillRect(3, -3, 1, 3);
  g.fillStyle = '#f0c8a0'; g.fillRect(0, -13, 4, 4); g.fillRect(-3, -8 - hand, 1, 1);
  g.fillStyle = m.cap || m.hair; g.fillRect(0, -14, 4, 2); g.fillRect(3, -12, 1, 2);
  if (m.cap) g.fillRect(-1, -13, 2, 1);                                            // the peak of a flat cap
  g.fillStyle = '#1d1f24'; g.fillRect(1, -12, 1, 1);
  if (m.tash) { g.fillStyle = m.tash; g.fillRect(0, -10, 2, 1); }
  g.fillStyle = m.shirt; g.fillRect(0, -9, 4, 4); g.fillRect(-2, -8 - hand, 2, 2);
  g.fillStyle = m.legs; g.fillRect(-2, -6, 5, 2); g.fillRect(-2, -4, 2, 3);       // thighs on the stool, shins down
  g.fillStyle = '#111114'; g.fillRect(-3, -1, 3, 1);
  if (m.smoke) {
    g.fillStyle = '#f4f4ef'; g.fillRect(-1, -10, 1, 1);
    g.fillStyle = 'rgba(220,220,220,0.6)';
    const u = (game.t * 0.7) % 1;
    g.fillRect(-1 - Math.round(u * 3), -12 - Math.round(u * 8), 1, 1);
  }
  g.restore();
}
function drawBirzha() {
  const x = BIRZHA_X, gy = GROUND_Y;
  if (x + 60 < cam.x || x - 10 > cam.x + W) return;
  g.fillStyle = '#5b5148'; g.fillRect(x, gy - 27, 2, 27); g.fillRect(x + 51, gy - 27, 2, 27);   // posts
  g.fillStyle = '#6d4a2c';                                                         // the vine up the right post
  for (let y = 2; y < 27; y++) g.fillRect(x + 53 + (Math.floor(y / 3) % 2), gy - y, 1, 1);
  g.fillStyle = '#4f6e5a'; g.fillRect(x - 2, gy - 31, 58, 3);                     // corrugated tin roof
  g.fillStyle = '#6a8c74'; for (let i = 0; i < 58; i += 3) g.fillRect(x - 2 + i, gy - 31, 1, 3);
  g.fillStyle = '#3b5444'; g.fillRect(x - 2, gy - 28, 58, 1);
  g.fillStyle = '#3f7a3a';                                                         // vine leaves along the edge
  for (let i = 0; i < 58; i += 4) g.fillRect(x - 2 + i, gy - 28, 3, 1 + hash(i, 11) % 3);
  g.fillStyle = '#5a9a4a'; for (let i = 2; i < 58; i += 8) g.fillRect(x - 2 + i, gy - 28, 2, 1);
  g.fillStyle = '#5b2a5a';                                                         // grapes
  for (const i of [7, 26, 44]) { g.fillRect(x + i, gy - 26, 3, 1); g.fillRect(x + i, gy - 25, 2, 1); g.fillRect(x + i, gy - 24, 1, 1); }
  for (const t of [9, 35]) {                                                       // the two tables
    g.fillStyle = '#8a6a48'; g.fillRect(x + t, gy - 9, 8, 1);
    g.fillStyle = '#6b4f34'; g.fillRect(x + t + 1, gy - 8, 1, 8); g.fillRect(x + t + 6, gy - 8, 1, 8);
  }
  g.fillStyle = '#7a4a24'; g.fillRect(x + 10, gy - 11, 6, 2);                     // an open nardi board
  g.fillStyle = '#e8d6a8'; g.fillRect(x + 11, gy - 11, 1, 1); g.fillRect(x + 14, gy - 11, 1, 1);
  g.fillStyle = '#1d1f24'; g.fillRect(x + 12, gy - 11, 1, 1);
  g.fillStyle = '#f4f4ef'; g.fillRect(x + 36, gy - 10, 2, 1); g.fillRect(x + 39, gy - 10, 2, 1); g.fillRect(x + 41, gy - 11, 1, 2);   // dominoes
  g.fillStyle = '#1d1f24'; g.fillRect(x + 37, gy - 10, 1, 1); g.fillRect(x + 39, gy - 10, 1, 1);
  const shake = Math.floor(game.t * 4) % 3 === 0 ? 1 : 0;                          // one shakes the dice,
  const slam = Math.floor(game.t * 1.3) % 4 === 0 ? 2 : 0;                         // one slams a domino down
  BIRZHA_MEN.forEach((m, i) => birzhaMan(m, x + m.x, gy, i === 0 ? 2 + shake : i === 3 ? slam : 0));
}
function drawFountain(f) {
  const cx = f.x, gy = GROUND_Y;
  if (cx + 40 < cam.x || cx - 40 > cam.x + W) return;
  const stone = '#d8cfbf', rim = '#eee8dc', dark = '#a99f8f', gold = '#d9a93a';
  g.fillStyle = stone; g.fillRect(cx - 30, gy - 8, 60, 8);
  g.fillStyle = dark; g.fillRect(cx - 30, gy - 2, 60, 2);
  g.fillStyle = rim; g.fillRect(cx - 31, gy - 9, 62, 2);
  g.fillStyle = '#6fb3e0'; g.fillRect(cx - 29, gy - 7, 58, 2);
  g.fillStyle = stone; g.fillRect(cx - 9, gy - 28, 18, 20);
  g.fillStyle = dark; g.fillRect(cx + 6, gy - 28, 3, 20);
  g.fillStyle = rim; g.fillRect(cx - 11, gy - 30, 22, 2);
  g.fillStyle = stone; g.fillRect(cx - 5, gy - 40, 10, 10);
  g.fillStyle = dark; g.fillRect(cx + 3, gy - 40, 2, 10);
  g.fillStyle = rim; g.fillRect(cx - 7, gy - 42, 14, 2);
  g.fillStyle = gold;
  for (const s of [-1, 1]) {   // mermaids on the corners of the lower tier
    g.fillRect(cx + s * 11 - 1, gy - 24, 3, 6);
    g.fillRect(cx + s * 12 - 1, gy - 27, 2, 3);
    g.fillRect(cx + s * 13 - 1, gy - 18, 3, 2);
  }
  const ny = gy - 42;
  g.fillRect(cx - 2, ny - 5, 2, 5); g.fillRect(cx + 1, ny - 5, 2, 5);
  g.fillRect(cx - 3, ny - 12, 6, 7);
  g.fillRect(cx - 2, ny - 15, 4, 3);
  g.fillRect(cx - 5, ny - 11, 2, 1); g.fillRect(cx - 6, ny - 10, 1, 3);
  g.fillRect(cx + 3, ny - 13, 1, 2); g.fillRect(cx + 4, ny - 15, 1, 3);
  g.fillStyle = '#b8862a';
  g.fillRect(cx + 5, ny - 24, 1, 22); g.fillRect(cx + 3, ny - 25, 5, 1);
  g.fillRect(cx + 3, ny - 28, 1, 3); g.fillRect(cx + 5, ny - 29, 1, 4); g.fillRect(cx + 7, ny - 28, 1, 3);
  g.fillStyle = '#c6e8fb';   // jets from the mermaids arcing into the basin
  for (const s of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const u = (i / 12 + game.t * 0.9) % 1;
      g.fillRect(Math.round(cx + s * (13 + u * 14)), Math.round(gy - 24 - 10 * u + 24 * u * u), 1, 1);
    }
  }
}
function drawRope(r) {
  if (r.x1 > cam.x + W || r.x2 < cam.x) return;
  const yAt = u => r.y + r.sag * 4 * u * (1 - u);
  g.fillStyle = '#e8e4dc';
  for (let x = r.x1; x < r.x2; x++) g.fillRect(x, Math.round(yAt((x - r.x1) / (r.x2 - r.x1))), 1, 1);
  for (const it of r.items) {
    const s = Math.round(Math.sin(game.t * 2.2 + it.u * 9));
    drawCloth(it.kind, it.color, Math.round(r.x1 + it.u * (r.x2 - r.x1)), Math.round(yAt(it.u)) + 1, s);
  }
}
function drawBarrier(x) {
  g.fillStyle = '#555'; g.fillRect(x + 1, GROUND_Y - 10, 1, 10); g.fillRect(x + 10, GROUND_Y - 10, 1, 10);
  for (let i = 0; i < 12; i += 3) { g.fillStyle = (i / 3) % 2 ? '#ffffff' : '#e23b2e'; g.fillRect(x + i, GROUND_Y - 9, 3, 3); }
}
function drawGeorgianFlag(x, y) {
  g.fillStyle = '#ffffff'; g.fillRect(x, y, 15, 10);
  g.fillStyle = '#e8112d'; g.fillRect(x + 6, y, 3, 10); g.fillRect(x, y + 4, 15, 2);
  for (const [cx, cy] of [[3, 2], [12, 2], [3, 8], [12, 8]]) { g.fillRect(x + cx - 1, y + cy, 3, 1); g.fillRect(x + cx, y + cy - 1, 1, 3); }
}
function drawTile(t, x, y, c, r) {
  if (t === GROUND) {
    if (r === 12 || level.tiles[r - 1][c] === EMPTY) {
      g.fillStyle = '#cfc7ba'; g.fillRect(x, y, T, T);
      g.fillStyle = '#ebe5db'; g.fillRect(x, y, T, 2);
      g.fillStyle = '#ada395'; g.fillRect(x, y + 9, T, 1);
      g.fillRect(x + (c % 2 ? 4 : 12), y + 2, 1, 7); g.fillRect(x + 8, y + 10, 1, 6);
    }   // the row under the sidewalk is the sea (drawSeaBand), the sidewalk is an embankment over it
  } else if (t === PEBBLE) {
    g.fillStyle = '#bdb5a9'; g.fillRect(x, y, T, T);
    for (let k = 0; k < 6; k++) {
      const h = hash(c * 7 + k, r);
      g.fillStyle = k % 2 ? '#a59d91' : '#d6cfc4'; g.fillRect(x + h % 14, y + (h >>> 8) % 14, 2, 2);
    }
  } else if (t === CONCRETE) {
    drawContainer(x, y, c, r);
  } else {
    drawBalcony(t, x, y, c, r);
  }
}
// The stairs are stacks of shipping containers from the port, owner's call. Each row of CONCRETE tiles is cut
// into containers two tiles long (three when the row is odd); a lone tile is a container seen end-on, doors
// and locking bars. Colours: [body, ribs and frame, top rail].
const CONTAINER_COLORS = [
  ['#2a6fb0', '#1d5288', '#5b95cc'], ['#c23b2c', '#912a1f', '#de6a5c'], ['#e07b22', '#b05e14', '#f2a25c'],
  ['#2e8a55', '#1f6640', '#5cb07f'], ['#7d8a8f', '#5d686d', '#a6b1b5'], ['#d1a019', '#a37b0f', '#ecc451'],
  ['#1a9a8c', '#127167', '#4fc0b3'], ['#8a4a2b', '#66341d', '#b0704f'],
];
function drawContainer(x, y, c, r) {
  const row = level.tiles[r];
  let a = c, b = c;
  while (row[a - 1] === CONCRETE) a--;
  while (row[b + 1] === CONCRETE) b++;
  const len = b - a + 1, k = c - a;
  const start = len === 1 ? 0 : len % 2 && k >= len - 3 ? len - 3 : k - k % 2;
  const size = len === 1 ? 1 : len % 2 && k >= len - 3 ? 3 : 2;
  const [body, dark, light] = CONTAINER_COLORS[hash(a + start, r * 7 + 3) % CONTAINER_COLORS.length];
  g.fillStyle = body; g.fillRect(x, y, T, T);
  g.fillStyle = light; g.fillRect(x, y, T, 1);                                    // top rail
  g.fillStyle = dark; g.fillRect(x, y + T - 2, T, 2);                             // bottom rail
  if (size === 1) {                                                                // end-on: two doors, four bars
    g.fillRect(x, y, 2, T); g.fillRect(x + T - 2, y, 2, T); g.fillRect(x + 7, y + 1, 2, T - 3);
    g.fillStyle = '#d9d9d9'; for (const bx of [3, 5, 10, 12]) g.fillRect(x + bx, y + 2, 1, T - 5);
    g.fillStyle = '#4a4a4a'; g.fillRect(x + 4, y + 8, 2, 1); g.fillRect(x + 11, y + 8, 2, 1);
    return;
  }
  g.fillStyle = dark;
  for (let i = 1; i < T; i += 3) g.fillRect(x + i, y + 2, 1, T - 5);              // corrugated sides
  if (k === start) { g.fillRect(x, y, 2, T); g.fillStyle = '#3a3a3a'; g.fillRect(x, y, 2, 2); g.fillRect(x, y + T - 2, 2, 2); }   // end posts, corner castings
  if (k === start + size - 1) { g.fillStyle = dark; g.fillRect(x + T - 2, y, 2, T); g.fillStyle = '#3a3a3a'; g.fillRect(x + T - 2, y, 2, 2); g.fillRect(x + T - 2, y + T - 2, 2, 2); }
  if (k === start && hash(a + start, r) % 2) { g.fillStyle = '#f2f2f2'; g.fillRect(x + 4, y + 4, 6, 1); g.fillRect(x + 4, y + 6, 4, 1); }   // a painted-on code
}
function drawBalcony(t, x, y, c, r) {
  if (t === USED) {
    g.fillStyle = '#a79e91'; g.fillRect(x, y + 10, T, 5);
    g.fillStyle = '#7f776b'; g.fillRect(x, y + 15, T, 1);
    g.fillStyle = '#55555c'; g.fillRect(x + 1, y + 5, 1, 5); g.fillRect(x + 13, y + 7, 1, 3);
    return;
  }
  const h = hash(c, r), glazed = t === BALC && h % 3 === 0, bonus = t !== BALC;
  if (glazed) {   // glazed in by the owner, as one does
    g.fillStyle = '#e9e4da'; g.fillRect(x, y + 1, T, 10);
    g.fillStyle = '#8fb6cf'; g.fillRect(x + 1, y + 2, 6, 8); g.fillRect(x + 9, y + 2, 6, 8);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 2, y + 3, 1, 4); g.fillRect(x + 10, y + 3, 1, 4);
  } else {
    g.fillStyle = '#3d3e46'; g.fillRect(x, y + 3, T, 2);
    for (let i = 1; i < T; i += 3) g.fillRect(x + i, y + 5, 1, 6);
  }
  if (bonus || (!glazed && h % 2 === 0)) {   // laundry drying on the balcony
    const s = Math.round(Math.sin(game.t * 3 + c));
    g.fillStyle = '#f0f0f0'; g.fillRect(x, y + 1, T, 1);
    drawCloth(h % 4, CLOTH_COLORS[(h >>> 3) % CLOTH_COLORS.length], x + 4, y + 2, s);
    drawCloth((h >>> 2) % 4, CLOTH_COLORS[(h >>> 6) % CLOTH_COLORS.length], x + 11, y + 2, s);
  }
  if (bonus && Math.floor(game.t * 2 + c * 0.7) % 3 === 0) {   // a glint gives away the hidden lari
    g.fillStyle = '#ffe066'; g.fillRect(x + 13, y - 3, 1, 3); g.fillRect(x + 12, y - 2, 3, 1);
  }
  g.fillStyle = '#c3baac'; g.fillRect(x, y + 11, T, 4);
  g.fillStyle = '#8f8678'; g.fillRect(x, y + 15, T, 1);
}
function drawTiles() {
  const c0 = Math.max(0, Math.floor(cam.x / T)), c1 = Math.min(COLS - 1, c0 + Math.ceil(W / T) + 1);
  for (let r = 0; r < ROWS; r++) {
    for (let c = c0; c <= c1; c++) {
      const t = level.tiles[r][c];
      if (!t) continue;
      const b = bumps.get(c + ',' + r);
      drawTile(t, c * T, r * T - (b ? Math.round(Math.sin(b / 0.15 * Math.PI) * 4) : 0), c, r);
    }
  }
}
function drawCoin(x, y, phase) {
  const w = Math.max(1, Math.round(8 * Math.abs(Math.cos(game.t * 4 + phase))));
  const l = Math.round(x + 4 - w / 2);
  g.fillStyle = '#c88a00'; g.fillRect(l, y + 1, w, 8); if (w > 2) g.fillRect(l + 1, y, w - 2, 10);
  if (w > 3) { g.fillStyle = '#ffd23f'; g.fillRect(l + 1, y + 2, w - 2, 6); }
  if (w > 5) { g.fillStyle = '#c88a00'; g.fillRect(x + 4, y + 3, 1, 4); g.fillRect(x + 2, y + 7, 4, 1); }   // a tiny ₾
}
// Sedan parked along the kerb, nose at x=0 (flipped when it faces right): long hood with a headlight,
// raked windshield, cabin set back, shorter boot with a red tail lamp.
// 3-pixel-tall letters: the stripe on the patrol car is too thin for the 5x7 font
const POLICE_WORD = [['###', '###', '#..'], ['###', '#.#', '###'], ['#..', '#..', '###'], ['#', '#', '#'], ['###', '#..', '###'], ['###', '##.', '###']];
function drawPickup(c) {   // a double cab: nose at x=0, flipped to face right; four doors, then a short open bed
  g.save();
  g.translate(Math.round(c.x), Math.round(c.y));
  if (c.face > 0) { g.translate(50, 0); g.scale(-1, 1); }
  const body = '#c2603a', shade = '#94452a', hi = '#de8a62';
  g.fillStyle = body;
  g.fillRect(0, 9, 32, 7); g.fillRect(1, 8, 9, 1);                             // hood and front
  for (let r = 0; r < 7; r++) g.fillRect(12 - Math.round(r * 0.8), 2 + r, 20 + Math.round(r * 0.8), 1);   // the long cab
  g.fillRect(32, 7, 18, 9);                                                    // bed
  g.fillStyle = '#2b3f52';
  for (let r = 0; r < 5; r++) g.fillRect(13 - Math.round(r * 0.8), 3 + r, 17 + Math.round(r * 0.8), 1);   // windows
  g.fillStyle = body; g.fillRect(20, 3, 2, 5);                                 // B pillar between the two rows
  g.fillStyle = shade;
  g.fillRect(21, 9, 1, 5); g.fillRect(31, 7, 1, 7);                            // door seams
  g.fillRect(32, 7, 1, 9); g.fillRect(0, 14, 50, 2); g.fillRect(34, 7, 15, 1); // bed wall, sills
  g.fillStyle = '#e8c9b8'; g.fillRect(17, 10, 2, 1); g.fillRect(27, 10, 2, 1); // door handles
  g.fillStyle = hi; g.fillRect(1, 9, 30, 1); g.fillRect(33, 8, 16, 1);
  g.fillStyle = '#3d7a2e'; g.fillRect(35, 4, 7, 4); g.fillRect(36, 3, 5, 1);     // the cargo: a watermelon
  g.fillStyle = '#8fc85a'; g.fillRect(37, 4, 1, 3); g.fillRect(39, 4, 1, 3);
  g.fillStyle = '#f08a1a';                                                     // and mandarins
  for (const [mx, my] of [[43, 5], [45, 6], [44, 4], [46, 5], [34, 6]]) g.fillRect(mx, my, 2, 2);
  g.fillStyle = '#f3efcf'; g.fillRect(0, 10, 2, 2);                            // headlight
  g.fillStyle = '#d02a20'; g.fillRect(48, 9, 2, 2);                            // tail lamp
  g.fillStyle = '#3a3a40'; g.fillRect(0, 13, 3, 3); g.fillRect(47, 13, 3, 3);  // bumpers
  wheel(5, 14); wheel(38, 14);
  g.restore();
}
function drawSedan(c) {
  g.save();
  g.translate(Math.round(c.x), Math.round(c.y));
  if (c.face > 0) { g.translate(46, 0); g.scale(-1, 1); }
  g.fillStyle = c.color;
  for (let r = 0; r < 7; r++) { const l = 15 - Math.round(r * 1.3), e = 34 + Math.round(r * 0.6); g.fillRect(l, 2 + r, e - l, 1); }
  g.fillRect(1, 9, 44, 7); g.fillRect(0, 10, 46, 5);
  g.fillRect(3, 8, 6, 1); g.fillRect(39, 8, 6, 1);
  g.fillStyle = '#2b3f52';
  for (let r = 0; r < 5; r++) { const l = 16 - Math.round(r * 1.3), e = 33 + Math.round(r * 0.6); g.fillRect(l, 3 + r, e - l, 1); }
  g.fillStyle = c.color; g.fillRect(25, 3, 2, 6);                              // B-pillar
  g.fillRect(12, 7, 2, 2);                                                     // mirror
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, 13, 46, 3);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(19, 10, 2, 1); g.fillRect(30, 10, 2, 1);   // door handles
  g.fillStyle = '#f3efcf'; g.fillRect(0, 10, 3, 2);                            // headlight
  g.fillStyle = '#2a2c30'; g.fillRect(0, 12, 3, 1);                            // grille
  g.fillStyle = '#d02a20'; g.fillRect(44, 10, 2, 2);                           // tail lamp
  g.fillStyle = '#c9c9c9'; g.fillRect(0, 14, 4, 2); g.fillRect(42, 14, 4, 2);  // bumpers
  wheel(7, 14); wheel(33, 14);
  if (c.police) {
    g.fillStyle = '#1d1f24'; g.fillRect(3, 9, 40, 5);                          // black stripe along the side
    const ph = Math.floor((game.t + c.phase) * 6) % 4;                         // light bar: blue, red, blue, red
    g.fillStyle = '#2a2c30'; g.fillRect(18, 1, 12, 1);
    g.fillStyle = ph % 2 === 0 ? '#3a7bff' : '#1c2c55'; g.fillRect(18, 0, 6, 1);
    g.fillStyle = ph % 2 === 1 ? '#ff3030' : '#551c1c'; g.fillRect(24, 0, 6, 1);
    g.fillStyle = ph % 2 === 0 ? 'rgba(58,123,255,0.35)' : 'rgba(255,48,48,0.35)';
    g.fillRect(ph % 2 === 0 ? 15 : 23, -2, 10, 4);
    g.restore();
    let tx = Math.round(c.x) + 12;                                               // POLICE on the stripe, never mirrored
    for (const rows of POLICE_WORD) {
      g.fillStyle = '#ffffff';
      rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') g.fillRect(tx + i, Math.round(c.y) + 10 + j, 1, 1); }));
      tx += rows[0].length + 1;
    }
    return;
  }
  const on = Math.floor((game.t + c.phase) * 2.4) % 2 === 0;   // hazard lights: parked "for a minute"
  g.fillStyle = on ? '#ffb020' : '#8a5a20';
  g.fillRect(3, 10, 1, 2); g.fillRect(42, 10, 1, 2);
  if (on) { g.fillStyle = 'rgba(255,176,32,0.35)'; g.fillRect(1, 8, 5, 6); g.fillRect(40, 8, 5, 6); }
  g.restore();
}
// Third-generation Prius (2010) side profile, nose at x=0: very low nose, short hood running into a long
// raked windshield, roof apex pushed back over the rear door, short slope down to a chopped Kamm tail
// with a spoiler. The window line rises and the roof falls towards the rear, so the glass closes into a
// small triangular quarter window.
// Blunt rounded nose and a short flat hood, then the long windshield up to the roof peak.
const PRIUS_TOP = x => (x < 1 ? 9 : x < 2 ? 8 : x < 9 ? 7 : x < 23 ? Math.round(7 - (x - 9) * 6 / 14) : x < 28 ? 1 : x < 41 ? Math.round(1 + (x - 27) / 4) : 5);
const PRIUS_BELT = x => Math.round(8 - (x - 10) * 3 / 28);
function bigWheel(x, y) {   // 15" wheel with the aero cover
  g.fillStyle = '#1d1d21'; g.fillRect(x + 1, y, 6, 7); g.fillRect(x, y + 1, 8, 5);
  g.fillStyle = '#c3c9cf'; g.fillRect(x + 1, y + 1, 6, 5);
  g.fillStyle = '#6a7078';
  g.fillRect(x + 2, y + 2, 1, 1); g.fillRect(x + 5, y + 2, 1, 1); g.fillRect(x + 2, y + 4, 1, 1); g.fillRect(x + 5, y + 4, 1, 1);
  g.fillStyle = '#3a3e45'; g.fillRect(x + 3, y + 3, 2, 1);
}
// Delivery moped, nose at x=0 (flipped when riding right): scooter with a leg shield, courier in a
// helmet, light-blue delivery box on the rear rack. No brand logo on the box.
function drawMoped(c) {
  g.save();
  g.translate(Math.round(c.x), Math.round(c.y));
  if (c.dir > 0) { g.translate(26, 0); g.scale(-1, 1); }
  g.fillStyle = '#1f8fc8'; g.fillRect(17, 4, 9, 9);                      // box
  g.fillStyle = '#5cc8f2'; g.fillRect(17, 4, 8, 8);
  g.fillStyle = '#a5e4ff'; g.fillRect(17, 4, 8, 1);
  g.fillStyle = '#2b2e33'; g.fillRect(16, 13, 10, 1);                    // rack
  g.fillStyle = c.color;
  g.fillRect(14, 14, 10, 5); g.fillRect(17, 17, 8, 2);                   // rear body
  g.fillRect(5, 8, 3, 10); g.fillRect(1, 17, 8, 2);                      // leg shield, front fender
  g.fillStyle = '#3a3e45'; g.fillRect(8, 18, 8, 2);                      // floorboard
  g.fillStyle = '#1d1d21'; g.fillRect(13, 12, 9, 2);                     // seat
  g.fillRect(6, 5, 1, 3); g.fillStyle = '#2a2e33'; g.fillRect(4, 5, 5, 1);   // handlebar
  g.fillStyle = '#fff3b0'; g.fillRect(4, 8, 1, 2);                       // headlight
  g.fillStyle = '#e0281c'; g.fillRect(24, 15, 1, 2);                     // tail lamp
  g.fillStyle = '#25272f'; g.fillRect(10, 11, 6, 2); g.fillRect(10, 13, 2, 5);   // courier's legs
  g.fillStyle = '#1d1d21'; g.fillRect(9, 18, 3, 1);
  g.fillStyle = '#2f3a52'; g.fillRect(11, 4, 5, 7);                      // courier's dark jacket
  g.fillStyle = '#222b3e'; g.fillRect(7, 5, 5, 2);                       // arm to the handlebar
  g.fillStyle = '#f8b890'; g.fillRect(6, 5, 1, 1);
  g.fillStyle = '#f2f2f2'; g.fillRect(11, -1, 5, 5);                     // helmet
  g.fillStyle = '#2b3f52'; g.fillRect(11, 1, 2, 2);                      // visor
  wheel(1, 16); wheel(18, 16);
  g.restore();
}
function drawCart(c) {   // nose at x=0, flipped when driving right; an open frame, no canopy, no body, no bumpers (owner)
  g.save();
  g.translate(Math.round(c.x), Math.round(c.y));
  if (c.dir > 0) { g.translate(31, 0); g.scale(-1, 1); }
  g.fillStyle = '#3a3e45';
  g.fillRect(6, 12, 3, 1); g.fillRect(7, 13, 1, 10);                              // handlebar on a straight column down to the front wheel
  g.fillRect(17, 10, 2, 7); g.fillRect(29, 10, 2, 7);                              // bench backs, a pixel behind them (owner)
  g.fillStyle = '#2b2e33'; g.fillRect(10, 16, 9, 1); g.fillRect(22, 16, 9, 1);     // seat cushions
  g.fillStyle = '#2a1d14'; g.fillRect(12, 6, 4, 2);                               // the driver, sitting up straight
  g.fillStyle = '#f0c8a0'; g.fillRect(12, 7, 4, 4); g.fillRect(9, 12, 1, 1);
  g.fillStyle = '#1d1f24'; g.fillRect(13, 8, 1, 1);
  g.fillStyle = '#f4f4ef'; g.fillRect(12, 11, 4, 4); g.fillRect(10, 12, 2, 2);
  g.fillStyle = '#3b5a8c'; g.fillRect(10, 14, 5, 2); g.fillRect(10, 16, 2, 3);    // his jeans: thighs on the seat, shins down
  g.fillStyle = '#111114'; g.fillRect(9, 19, 3, 1);
  g.fillStyle = '#16161a'; g.fillRect(23, 5, 5, 6); g.fillRect(24, 4, 3, 1);      // the woman, all in black, hijab and all
  g.fillRect(23, 11, 5, 1); g.fillRect(22, 12, 6, 3);
  g.fillRect(21, 14, 5, 2); g.fillRect(21, 16, 2, 3); g.fillRect(20, 19, 3, 1);   // her legs
  g.fillStyle = '#f0c8a0'; g.fillRect(23, 7, 3, 3);
  g.fillStyle = '#5a5a60'; g.fillRect(23, 8, 1, 1);
  g.fillStyle = '#1d1d21'; g.fillRect(4, 21, 6, 4); g.fillRect(24, 21, 6, 4);     // small wheels, the front one under the column
  g.fillStyle = '#8d939b'; g.fillRect(6, 22, 2, 2); g.fillRect(26, 22, 2, 2);
  g.fillStyle = '#4a4f57'; g.fillRect(6, 20, 18, 2);                              // the low floor
  g.fillStyle = '#fff3b0'; g.fillRect(5, 16, 2, 2);                               // a headlight on the column
  g.fillStyle = '#c8241c'; g.fillRect(12, 17, 7, 3); g.fillRect(23, 17, 8, 5);    // red seat bases — the only colour; the rear
  g.fillStyle = '#e8584a'; g.fillRect(12, 17, 7, 1); g.fillRect(23, 17, 8, 1);    // one is massive and is where the cart ends (owner)
  g.restore();
}
function drawScooter(c) {   // nose at x=0, flipped when riding right; leans forward, the hood flaps
  g.save();
  g.translate(Math.round(c.x), Math.round(c.y));
  if (c.dir > 0) { g.translate(16, 0); g.scale(-1, 1); }
  const flap = Math.floor(game.t * 12) % 2;
  g.fillStyle = '#9aa1ab'; g.fillRect(2, 8, 1, 13); g.fillRect(1, 7, 4, 1);    // stem and handlebar
  g.fillStyle = '#2b2e33'; g.fillRect(1, 20, 14, 2);                           // deck
  g.fillStyle = '#4fd06a'; g.fillRect(4, 20, 8, 1);                            // rental green
  g.fillStyle = '#1d1d21'; g.fillRect(0, 21, 4, 3); g.fillRect(12, 21, 4, 3);  // wheels
  g.fillStyle = '#8d939b'; g.fillRect(1, 22, 2, 1); g.fillRect(13, 22, 2, 1);
  g.fillStyle = '#fff3b0'; g.fillRect(2, 9, 1, 1);                             // headlight
  g.fillStyle = '#3b5a8c'; g.fillRect(6, 14, 2, 6); g.fillRect(10, 14, 2, 6);  // jeans
  g.fillStyle = '#f2f2f2'; g.fillRect(5, 19, 3, 1); g.fillRect(10, 19, 3, 1);  // trainers
  g.fillStyle = c.hoodie; g.fillRect(6, 7, 6, 7); g.fillRect(3, 8, 4, 2);      // hoodie, arms to the bar
  g.fillRect(11 + flap, 5, 3, 3);                                              // the hood flapping behind
  g.fillStyle = '#f0c8a0'; g.fillRect(6, 1, 5, 6); g.fillRect(2, 8, 1, 1);     // head, hand
  g.fillStyle = '#1d1f24'; g.fillRect(6, 0, 6, 2); g.fillRect(11, 2, 2, 1);    // cap on backwards
  g.fillRect(6, 3, 1, 1); g.fillStyle = '#7a2a20'; g.fillRect(6, 5, 2, 1);     // eye, yelling mouth
  g.fillStyle = '#ffffff'; g.fillRect(10, 3, 1, 2);                            // an earbud
  g.restore();
}
function drawPrius(c) {
  g.save();
  g.translate(Math.round(c.x), Math.round(c.y));
  if (c.dir > 0) { g.translate(44, 0); g.scale(-1, 1); }
  g.fillStyle = c.body;
  for (let x = 0; x < 44; x++) { const top = PRIUS_TOP(x); g.fillRect(x, top, 1, 15 - top); }
  // metallic paint: bright roof edge and shoulder, darker flanks, a reflection that slides along
  // the body as the car drives (it's tied to the world position); the glass drawn next covers it
  g.fillStyle = c.hi;
  for (let x = 0; x < 44; x++) g.fillRect(x, PRIUS_TOP(x), 1, 1);
  g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(0, 11, 44, 3);
  const gx = Math.floor(c.x * 0.6 % 80) - 18;
  g.fillStyle = 'rgba(255,255,255,0.28)';
  for (let y = 1; y < 14; y++) {
    for (let x = gx + (14 - y); x < gx + (14 - y) + 4; x++) if (x >= 0 && x < 44 && y >= PRIUS_TOP(x)) g.fillRect(x, y, 1, 1);
  }
  g.fillStyle = '#2b3f52';
  for (let x = 11; x < 40; x++) {
    if (x === 25 || x === 33) continue;   // B- and C-pillars
    const t = PRIUS_TOP(x) + 1, b = PRIUS_BELT(x);
    if (b > t) g.fillRect(x, t, 1, b - t);
  }
  g.fillStyle = '#5b7690';
  for (let x = 13; x < 19; x++) g.fillRect(x, PRIUS_TOP(x) + 2, 1, 1);
  g.fillStyle = c.shade;
  g.fillRect(25, PRIUS_BELT(25), 1, 13 - PRIUS_BELT(25)); g.fillRect(35, PRIUS_BELT(35), 1, 12 - PRIUS_BELT(35));
  g.fillRect(19, PRIUS_BELT(19) + 2, 2, 1); g.fillRect(30, PRIUS_BELT(30) + 2, 2, 1);   // door handles
  g.fillRect(12, 6, 2, 2);                                       // mirror
  g.fillRect(33, PRIUS_TOP(33) - 1, 2, 1);                       // shark-fin antenna
  g.fillRect(4, 13, 37, 1);
  g.fillStyle = '#2a2c30'; g.fillRect(5, 10, 8, 1); g.fillRect(31, 10, 8, 1);   // wheel arches
  g.fillStyle = '#3a3e45'; g.fillRect(4, 14, 37, 1); g.fillRect(0, 12, 4, 2); g.fillRect(41, 12, 3, 2);
  g.fillStyle = '#dbe9f3';                                       // big swept-back headlight along the hood
  g.fillRect(1, 9, 6, 1); g.fillRect(0, 10, 3, 1);
  g.fillStyle = '#8fb0c8'; g.fillRect(3, 10, 1, 1);
  g.fillStyle = '#2a2e33'; g.fillRect(40, 5, 4, 1);              // spoiler across the hatch
  g.fillStyle = '#e0281c'; g.fillRect(38, 6, 6, 1);              // blade tail lamp
  g.fillStyle = '#a01810'; g.fillRect(41, 7, 3, 1); g.fillRect(42, 12, 1, 1);
  // taxi sign on the roof
  g.fillStyle = '#2a2e33'; g.fillRect(22, 0, 7, 1);
  g.fillStyle = '#f5c400'; g.fillRect(22, -3, 7, 3);
  g.fillStyle = '#fff3a0'; g.fillRect(23, -3, 5, 1);
  g.fillStyle = '#5a4500'; g.fillRect(23, -2, 1, 1); g.fillRect(25, -2, 1, 1); g.fillRect(27, -2, 1, 1);
  bigWheel(5, 11); bigWheel(31, 11);
  g.restore();
}
function drawCarEnd(c) {   // a car parked across the sidewalk, seen nose-on or from the back
  const x = Math.round(c.x), y = Math.round(c.y), front = c.kind === 'front';
  g.fillStyle = c.color;
  for (let r = 0; r < 7; r++) { const i = 5 - (r >> 1); g.fillRect(x + i, y + 2 + r, 22 - i * 2, 1); }
  g.fillRect(x, y + 9, 22, 7);
  g.fillRect(x - 1, y + 8, 2, 2); g.fillRect(x + 21, y + 8, 2, 2);   // mirrors
  g.fillStyle = '#2b3f52';
  for (let r = 0; r < (front ? 5 : 4); r++) { const i = 6 - (r >> 1); g.fillRect(x + i, y + 3 + r, 22 - i * 2, 1); }
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 7, y + 4, 2, 1);
  if (front) {
    g.fillStyle = '#fff6c8'; g.fillRect(x + 1, y + 10, 5, 2); g.fillRect(x + 16, y + 10, 5, 2);
    g.fillStyle = '#2a2a30'; g.fillRect(x + 7, y + 10, 8, 3);
  } else {
    g.fillStyle = '#d8261c'; g.fillRect(x + 1, y + 10, 4, 2); g.fillRect(x + 17, y + 10, 4, 2);
  }
  if (c.police) {   // patrol car: a black stripe across the front (no lettering, owner), light bar on the roof
    g.fillStyle = '#1d1f24'; g.fillRect(x, y + 12, 22, 5);
    g.fillStyle = '#f2f2f2'; g.fillRect(x + 8, y + 14, 6, 2);                    // number plate
    g.fillStyle = '#1d1d21'; g.fillRect(x + 1, y + 17, 4, 3); g.fillRect(x + 17, y + 17, 4, 3);
    const ph = Math.floor((game.t + c.phase) * 6) % 2;
    g.fillStyle = '#2a2c30'; g.fillRect(x + 5, y + 1, 12, 1);
    g.fillStyle = ph === 0 ? '#3a7bff' : '#1c2c55'; g.fillRect(x + 5, y, 6, 1);
    g.fillStyle = ph === 1 ? '#ff3030' : '#551c1c'; g.fillRect(x + 11, y, 6, 1);
    g.fillStyle = ph === 0 ? 'rgba(58,123,255,0.35)' : 'rgba(255,48,48,0.35)'; g.fillRect(ph === 0 ? x + 2 : x + 10, y - 2, 10, 4);
    return;
  }
  g.fillStyle = '#3a3a40'; g.fillRect(x, y + 14, 22, 2);
  g.fillStyle = '#f2f2f2'; g.fillRect(x + 8, y + 13, 6, 2);
  g.fillStyle = '#1d1d21'; g.fillRect(x + 1, y + 16, 4, 4); g.fillRect(x + 17, y + 16, 4, 4);
  const on = Math.floor((game.t + c.phase) * 2.4) % 2 === 0;
  g.fillStyle = on ? '#ffb020' : '#8a5a20';
  g.fillRect(x, y + 12, 2, 1); g.fillRect(x + 20, y + 12, 2, 1);
  if (on) { g.fillStyle = 'rgba(255,176,32,0.35)'; g.fillRect(x - 2, y + 10, 6, 5); g.fillRect(x + 18, y + 10, 6, 5); }
}
function drawDog(d) {
  const face = d.dir > 0 ? 'r' : 'l', DOG = DOGS[d.coat][d.tag];
  let img;
  if (d.mode === 'sleep' || (d.mode === 'happy' && d.pose !== 'wag')) img = DOG[d.pose][face];
  else if (d.mode === 'happy') img = (Math.floor(d.t * 7) % 2 ? DOG.wag : DOG.a)[face];
  else if (d.mode === 'patrol' && d.sitT > 0) img = DOG.sit[face];
  else img = (Math.floor(d.t * (d.mode === 'chase' ? 10 : 6)) % 2 ? DOG.b : DOG.a)[face];
  const x = Math.round(d.x - 1), y = Math.round(d.y + d.h - img.height);
  g.drawImage(img, x, y);
  if (d.mode === 'sleep' && d.pose === 'sleep') {
    const k = (d.t * 0.7) % 1;
    g.globalAlpha = 1 - k; g.drawImage(ZZZ, x + 12 + Math.round(k * 4), y - 6 - Math.round(k * 10)); g.globalAlpha = 1;
  } else if (d.mode === 'happy' && Math.floor(d.t * 2) % 2) {
    g.drawImage(HEART, x + 6, y - 7);
  }
}
function drawPlayer() {
  const pl = player;
  if (pl.inv > 0 && !pl.dead && Math.floor(game.t * 20) % 2) return;
  let frame = HERO.stand;
  if (!pl.dead) {
    if (!pl.onGround) frame = HERO.jump;
    else if (Math.abs(pl.vx) > 5) frame = Math.floor(pl.anim / 7) % 2 ? HERO.walk1 : HERO.walk2;
  }
  const img = pl.face >= 0 ? frame.r : frame.l;
  const sc = pl.big ? 2 : 1, dw = 12 * sc, dh = 16 * sc;
  const dx = Math.round(pl.x + pl.w / 2 - dw / 2), dy = Math.round(pl.y + pl.h - dh);
  if (pl.dead) {
    g.save(); g.translate(dx, dy + dh); g.scale(1, -1); g.drawImage(img, 0, 0, dw, dh); g.restore();
  } else {
    g.drawImage(img, dx, dy, dw, dh);
  }
}
function drawFigure(cx, foot, h, dress) {
  for (let yy = 0; yy < h; yy += 3) {
    const u = yy / h;
    let hw;
    if (u < 0.12) hw = 5 * Math.sqrt(Math.max(0, 1 - ((u - 0.06) / 0.065) ** 2));
    else if (u < 0.16) hw = 2;
    else if (u < 0.5) hw = 9 - (u - 0.16) * 8;
    else if (dress) hw = 6 + (u - 0.5) * 9;
    else hw = u < 0.6 ? 6.5 : 5 - (u - 0.6) * 3;
    hw = Math.max(1, Math.round(hw));
    g.fillStyle = (yy / 3) % 2 ? '#4c5d6c' : '#7d93a6';
    g.fillRect(Math.round(cx - hw), Math.round(foot - h + yy), hw * 2, 2);
  }
}
// Ali and Nino: two steel figures that slowly glide into each other and apart again.
function drawStatue() {
  const cx = STATUE_X + 8;
  if (cx + 60 < cam.x || cx - 60 > cam.x + W) return;
  g.fillStyle = '#8c8a86'; g.fillRect(cx - 40, GROUND_Y - 5, 80, 5);
  g.fillStyle = '#a9a7a2'; g.fillRect(cx - 40, GROUND_Y - 5, 80, 1);
  const off = (1 - Math.cos(game.t * 0.35)) * 12;
  drawFigure(cx - 26 + off, GROUND_Y - 5, 86, false);
  drawFigure(cx + 26 - off, GROUND_Y - 5, 78, true);
}
// The sea under the embankment, along the whole street: it shows below the sidewalk and in the holes.
const SEA_TOP = GROUND_Y + T;
function drawSeaBand() {
  const x0 = Math.floor(cam.x), x1 = Math.min(cam.x + W, SEA_COL * T);
  g.fillStyle = '#2d7fb5'; g.fillRect(x0, SEA_TOP, x1 - x0, H - SEA_TOP);
  g.fillStyle = '#245f8a'; g.fillRect(x0, SEA_TOP, x1 - x0, 2);                     // shade under the embankment
  g.fillStyle = '#7cc3e8';
  for (let i = Math.floor(x0 / 8) * 8; i < x1; i += 8) g.fillRect(i + Math.round(Math.sin(game.t * 2 + i) * 2), SEA_TOP + 4 + (i / 8 % 2) * 4, 4, 1);
  for (const p of level.pits) {                                                    // open water in the holes
    if (p.sewer || p.x > x1 || p.x + p.w < x0) continue;
    g.fillStyle = '#2d7fb5'; g.fillRect(p.x, GROUND_Y + 8, p.w, SEA_TOP - GROUND_Y - 8);
    g.fillStyle = '#7cc3e8';
    for (let i = p.x; i < p.x + p.w - 3; i += 8) g.fillRect(i + Math.round(Math.sin(game.t * 2 + i) * 1.5) + 1, GROUND_Y + 8, 3, 1);
  }
}
function drawSea() {
  const x = SEA_COL * T;
  if (x > cam.x + W) return;
  g.fillStyle = '#2d7fb5'; g.fillRect(x, GROUND_Y - 4, COLS * T - x, H);
  g.fillStyle = '#7cc3e8';
  for (let i = x; i < COLS * T; i += 8) g.fillRect(i + Math.round(Math.sin(game.t * 2 + i) * 2), GROUND_Y - 4, 4, 1);
}
function drawParticles() {
  for (const p of particles) {
    if (p.kind === 'coin') drawCoin(p.x, p.y, 0);
    else if (p.kind === 'slipper') {
      g.fillStyle = '#ff5fa0'; g.fillRect(Math.round(p.x), Math.round(p.y), 7, 2);
      g.fillStyle = '#ffffff'; g.fillRect(Math.round(p.x) + 3, Math.round(p.y) - 1, 3, 1);
    } else {
      g.fillStyle = p.color; g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
  }
}
const SEWAGE_Y = GROUND_Y + 6;   // surface of the sewage in a burst-sewer pit
function drawSewage(p) {
  if (p.x > cam.x + W || p.x + p.w < cam.x) return;
  const t = game.t, x0 = p.x, x1 = p.x + p.w, cx = x0 + Math.floor(p.w / 2);
  g.fillStyle = '#56501f'; g.fillRect(x0, SEWAGE_Y, p.w, H - SEWAGE_Y);
  g.fillStyle = '#433d17'; g.fillRect(x0, SEWAGE_Y + 7, p.w, H - SEWAGE_Y - 7);
  g.fillStyle = '#857b38';                                       // ripples
  for (let x = x0; x < x1; x++) {
    const k = (Math.floor(x / 3 + t * 5) % 4 + 4) % 4;
    if (k === 0) g.fillRect(x, SEWAGE_Y - 1, 1, 1); else if (k !== 2) g.fillRect(x, SEWAGE_Y, 1, 1);
  }
  g.fillStyle = '#9b9150';                                       // scum drifting on top
  for (let i = 0; i < p.w / 14; i++) g.fillRect(x0 + 2 + (i * 17 + Math.floor(t * 4)) % (p.w - 6), SEWAGE_Y + 2, 3, 1);
  for (let i = 0; i < 3; i++) {                                  // bubbles that swell and pop
    const ph = (t * 0.7 + i * 0.37) % 1, bx = x0 + 3 + (i * 29 + 5) % (p.w - 8);
    g.fillStyle = '#a69c5c';
    if (ph < 0.6) g.fillRect(bx, SEWAGE_Y - 1, ph < 0.3 ? 2 : 3, ph < 0.3 ? 1 : 2);
    else if (ph < 0.7) { g.fillRect(bx - 1, SEWAGE_Y - 2, 1, 1); g.fillRect(bx + 3, SEWAGE_Y - 2, 1, 1); }
  }
  // the burst: a pulsing geyser of sewage in the middle, droplets arcing out of it
  const hgt = Math.round(14 + 5 * Math.sin(t * 6) + 3 * Math.sin(t * 13.7));
  g.fillStyle = '#6b6128'; g.fillRect(cx - 2, SEWAGE_Y - hgt, 5, hgt);
  g.fillStyle = '#958945'; g.fillRect(cx - 1, SEWAGE_Y - hgt, 2, hgt);
  g.fillStyle = '#b8ad6c'; g.fillRect(cx - 3, SEWAGE_Y - hgt - 1, 7, 2);
  g.fillStyle = '#857b38';
  for (let i = 0; i < 6; i++) {
    const ph = (t * 1.4 + i / 6) % 1, side = i % 2 ? 1 : -1;
    const dx = Math.round(side * (5 + i * 1.5) * ph), dy = Math.round(-hgt - 10 * ph + 32 * ph * ph);
    if (dy < 0) g.fillRect(cx + dx, SEWAGE_Y + dy, 2, 2);
  }
  g.fillStyle = '#6b6f75'; g.fillRect(x0, GROUND_Y + 2, 5, 3);   // broken pipe sticking out of the wall
  g.fillStyle = '#3a3e45'; g.fillRect(x0 + 4, GROUND_Y + 2, 1, 3);
}
function drawStink(p) {
  if (p.x > cam.x + W || p.x + p.w < cam.x) return;
  g.fillStyle = '#a8c95a';
  for (let i = 0; i < 3; i++) {
    const ph = (game.t * 0.45 + i / 3) % 1, bx = p.x + Math.round((i + 1) * p.w / 4);
    g.globalAlpha = 1 - ph;
    for (let k = 0; k < 5; k++) g.fillRect(bx + Math.round(Math.sin(k * 1.3 + game.t * 3 + i) * 1.5), SEWAGE_Y - 12 - Math.round(ph * 30) - k * 2, 1, 2);
  }
  g.globalAlpha = 1;
}
function drawPoop(p) {
  if (p.x > cam.x + W || p.x + 12 < cam.x) return;
  if (p.squashed) {                                               // a flat smear with splats around it
    g.fillStyle = '#5a391d'; g.fillRect(p.x - 2, GROUND_Y - 1, 9, 1);
    g.fillRect(p.x - 5, GROUND_Y - 1, 1, 1); g.fillRect(p.x + 9, GROUND_Y - 1, 1, 1);
    return;
  }
  g.fillStyle = '#5a391d'; g.fillRect(p.x, GROUND_Y - 2, 5, 2);
  g.fillStyle = '#6b4423'; g.fillRect(p.x + 1, GROUND_Y - 3, 3, 1);
  g.fillStyle = '#8f5e34'; g.fillRect(p.x + 2, GROUND_Y - 4, 1, 1); g.fillRect(p.x + 1, GROUND_Y - 2, 1, 1);
  const a = game.t * 7 + p.x;                                     // a fly circling it
  g.fillStyle = '#1b1b1f'; g.fillRect(p.x + 2 + Math.round(Math.cos(a) * 4), GROUND_Y - 8 + Math.round(Math.sin(a * 1.3) * 2), 1, 1);
}
function drawWorld() {
  for (const b of level.buildings) drawBuilding(b);
  for (const r of level.ropes) drawRope(r);
  for (const f of level.fountains) drawFountain(f);
  drawWedding();
  drawBirzha();
  const fx = CHECKPOINT_X + 8;
  g.fillStyle = '#d9d9d9'; g.fillRect(fx, GROUND_Y - 50, 2, 50);
  drawGeorgianFlag(fx + 2, Math.round(level.flagY));
  for (const p of level.pits) {
    g.fillStyle = '#2b211b'; g.fillRect(p.x, GROUND_Y + 2, p.w, H);
    drawBarrier(p.x - 14); drawBarrier(p.x + p.w + 2);
  }
  for (const p of level.pits) if (p.sewer) drawStink(p);
  drawSeaBand();
  drawSea();
  for (const it of level.items) g.drawImage(KHACH, Math.round(it.x), Math.round(it.y));
  drawTiles();
  for (const p of level.poops) drawPoop(p);
  for (const c of level.coins) if (!c.taken) drawCoin(c.x, c.y, c.x * 0.05);
  drawStatue();
  for (const c of level.cars) if (c.kind === 'side') drawSedan(c); else if (c.kind === 'pickup') drawPickup(c); else drawCarEnd(c);
  for (const c of level.taxis) if (c.kind === 'moped') drawMoped(c); else if (c.kind === 'scooter') drawScooter(c); else if (c.kind === 'cart') drawCart(c); else drawPrius(c);
  for (const d of level.dogs) drawDog(d);
  drawPlayer();
  for (const p of level.pits) if (p.sewer) drawSewage(p);   // in front of whoever sinks in it
  drawParticles();
}

// ---------- drawing: text layer (5x7 bitmap font, drawn into the low-res buffer) ----------
// Each glyph is 7 rows of 5 cells; text is uppercased, unknown characters render as '?'.
const FONT = (() => {
  const f = {
    A: '.###. #...# #...# ##### #...# #...# #...#', B: '####. #...# #...# ####. #...# #...# ####.',
    C: '.###. #...# #.... #.... #.... #...# .###.', D: '####. #...# #...# #...# #...# #...# ####.',
    E: '##### #.... #.... ####. #.... #.... #####', F: '##### #.... #.... ####. #.... #.... #....',
    G: '.###. #...# #.... #.### #...# #...# .####', H: '#...# #...# #...# ##### #...# #...# #...#',
    I: '.###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.', J: '..### ...#. ...#. ...#. ...#. #..#. .##..',
    K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#', L: '#.... #.... #.... #.... #.... #.... #####',
    M: '#...# ##.## #.#.# #.#.# #...# #...# #...#', N: '#...# #...# ##..# #.#.# #..## #...# #...#',
    O: '.###. #...# #...# #...# #...# #...# .###.', P: '####. #...# #...# ####. #.... #.... #....',
    Q: '.###. #...# #...# #...# #.#.# #..#. .##.#', R: '####. #...# #...# ####. #.#.. #..#. #...#',
    S: '.#### #.... #.... .###. ....# ....# ####.', T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
    U: '#...# #...# #...# #...# #...# #...# .###.', V: '#...# #...# #...# #...# #...# .#.#. ..#..',
    W: '#...# #...# #...# #.#.# #.#.# #.#.# .#.#.', X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
    Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..', Z: '##### ....# ...#. ..#.. .#... #.... #####',
    'Б': '##### #.... #.... ####. #...# #...# ####.', 'Г': '##### #.... #.... #.... #.... #.... #....',
    'Д': '.###. .#.#. .#.#. .#.#. .#.#. ##### #...#', 'Ж': '#.#.# #.#.# .###. ..#.. .###. #.#.# #.#.#',
    'З': '.###. #...# ....# ..##. ....# #...# .###.', 'И': '#...# #...# #..## #.#.# ##..# #...# #...#',
    'Й': '.#.#. #...# #..## #.#.# ##..# #...# #...#', 'Ё': '.#.#. ##### #.... ####. #.... #.... #####',
    'Л': '..### .#..# .#..# .#..# .#..# .#..# #...#', 'П': '##### #...# #...# #...# #...# #...# #...#',
    'У': '#...# #...# #...# .#### ....# ....# ####.', 'Ф': '..#.. .###. #.#.# #.#.# #.#.# .###. ..#..',
    'Ц': '#..#. #..#. #..#. #..#. #..#. ##### ....#', 'Ч': '#...# #...# #...# .#### ....# ....# ....#',
    'Ш': '#.#.# #.#.# #.#.# #.#.# #.#.# #.#.# #####', 'Щ': '#.#.# #.#.# #.#.# #.#.# #.#.# ##### ....#',
    'Ъ': '##... .#... .#... .###. .#..# .#..# .###.', 'Ы': '#...# #...# #...# ##..# #.#.# #.#.# ##..#',
    'Ь': '#.... #.... #.... ####. #...# #...# ####.', 'Э': '.###. #...# ....# .###. ....# #...# .###.',
    'Ю': '#..#. #.#.# #.#.# ###.# #.#.# #.#.# #..#.', 'Я': '.#### #...# #...# .#### ..#.# .#..# #...#',
    0: '.###. #...# #..## #.#.# ##..# #...# .###.', 1: '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.',
    2: '.###. #...# ....# ...#. ..#.. .#... #####', 3: '##### ...#. ..#.. ...#. ....# #...# .###.',
    4: '...#. ..##. .#.#. #..#. ##### ...#. ...#.', 5: '##### #.... ####. ....# ....# #...# .###.',
    6: '..##. .#... #.... ####. #...# #...# .###.', 7: '##### ....# ...#. ..#.. .#... .#... .#...',
    8: '.###. #...# #...# .###. #...# #...# .###.', 9: '.###. #...# #...# .#### ....# ...#. .##..',
    ' ': '..... ..... ..... ..... ..... ..... .....', '.': '..... ..... ..... ..... ..... ..... ..#..',
    ',': '..... ..... ..... ..... ..... ..#.. .#...', '!': '..#.. ..#.. ..#.. ..#.. ..#.. ..... ..#..',
    '?': '.###. #...# ....# ...#. ..#.. ..... ..#..', ':': '..... ..... ..#.. ..... ..... ..#.. .....',
    '-': '..... ..... ..... .###. ..... ..... .....', '—': '..... ..... ..... ##### ..... ..... .....',
    '+': '..... ..#.. ..#.. ##### ..#.. ..#.. .....', '×': '..... #...# .#.#. ..#.. .#.#. #...# .....',
    '(': '...#. ..#.. .#... .#... .#... ..#.. ...#.', ')': '.#... ..#.. ...#. ...#. ...#. ..#.. .#...',
    '/': '....# ....# ...#. ..#.. .#... #.... #....', "'": '..#.. ..#.. ..... ..... ..... ..... .....',
    '←': '..... ..#.. .#... ##### .#... ..#.. .....', '→': '..... ..#.. ...#. ##### ...#. ..#.. .....',
    '♥': '..... .#.#. ##### ##### .###. ..#.. .....', '▲': '..... ..#.. ..#.. .###. .###. ##### .....', '⛶': '##.## #...# ..... ..... ..... #...# ##.##', '«': '..... ..#.# .#.#. #.#.. .#.#. ..#.# .....', '»': '..... #.#.. .#.#. ..#.# .#.#. #.#.. .....', '₾': '.#.#. .###. #.#.# #.#.# #.... #.... #####',
  };
  for (const [lat, cyr] of ['AА', 'BВ', 'EЕ', 'KК', 'MМ', 'HН', 'OО', 'PР', 'CС', 'TТ', 'XХ']) f[cyr] = f[lat];
  // Georgian in Mtavruli (capital) shapes, keyed by the ordinary Mkhedruli letters ა..ჰ; see txt().
  [
    '.#... .#... ..#.. ...#. #...# #...# .###.', // ა
    '.#... .#... ..#.. .###. #...# #...# .###.', // ბ
    '.##.. #..#. ...#. .###. #...# #...# .###.', // გ
    '.#.#. #.#.# #..#. #.... .#... ..### ....#', // დ
    '.###. #...# ....# ....# ....# #...# .###.', // ე
    '.###. #...# ....# ..##. ....# #...# .###.', // ვ
    '.###. .#.#. .###. #...# #...# #...# .###.', // ზ
    '.#.#. #.#.# #.#.# #.#.# #.#.# #.#.# .#..#', // თ
    '.###. #...# #...# #...# #...# #...# #...#', // ი
    '.##.. ...#. .##.. ...#. ....# #...# .###.', // კ
    '.#.#. #.#.# #.#.# #.#.# .#... ..### ....#', // ლ
    '.###. #...# ....# .#### #...# #...# .###.', // მ
    '.#### #.... #.... ####. #...# #...# .###.', // ნ
    '.#.#. #.#.# #.#.# #...# #...# #...# #...#', // ო
    '.#... ..#.. ...#. .##.. ....# #...# .###.', // პ
    '##### .#..# ..#.# .#..# ....# #...# .###.', // ჟ
    '..### .#... ##.#. #.#.# #.#.# #.#.# #...#', // რ
    '#.... #.... #..#. #...# #...# #...# .###.', // ს
    '..#.. .###. #.#.# #.#.# #...# #...# .###.', // ტ
    '##..# .#..# .#..# ##..# ....# #...# .###.', // უ
    '.#.#. #.#.# .#..# ....# #...# #...# .###.', // ფ
    '....# ....# .##.# #..## ....# #...# .###.', // ქ
    '.#.#. #.#.# #.#.# #.#.. .#... #.... .####', // ღ
    '#...# #...# #...# .#### ....# #...# .###.', // ყ
    '##.## .#..# .#..# #...# #...# #...# .###.', // შ
    '.##.. #..#. #.... ##.#. #.#.# #...# #...#', // ჩ
    '.#.#. #..#. #.##. #...# #...# #...# .###.', // ც
    '....# ....# ....# .#### #...# #...# .###.', // ძ
    '##.## #..#. #.... ####. #...# #...# .###.', // წ
    '....# ##### #...# .#### ....# #...# .###.', // ჭ
    '#.... #.... #.... ####. #...# #...# .###.', // ხ
    '..#.. ##### ..#.# ...## ....# #...# .###.', // ჯ
    '.##.. ...## .###. ...#. ....# #...# .###.', // ჰ
  ].forEach((rows, i) => { f[String.fromCharCode(0x10D0 + i)] = rows; });
  return f;
})();
const glyphCache = new Map();
function glyph(ch, color) {
  const key = color + ch;
  let c = glyphCache.get(key);
  if (!c) {
    const rows = (FONT[ch] || FONT['?']).split(' ');
    c = document.createElement('canvas'); c.width = 5; c.height = 7;
    const k = c.getContext('2d'); k.fillStyle = color;
    rows.forEach((r, y) => { for (let x = 0; x < 5; x++) if (r[x] === '#') k.fillRect(x, y, 1, 1); });
    glyphCache.set(key, c);
  }
  return c;
}
const fontCase = s => String(s).toUpperCase().replace(/[\u1C90-\u1CBA]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x1C90 + 0x10D0));
// Draws into the game buffer `g` in game pixels; `scale` multiplies the 5x7 cell.
function txt(s, x, y, { scale = 1, color = '#ffffff', align = 'left', shadow = 'rgba(0,0,0,0.7)' } = {}) {
  // Uppercasing turns Georgian into Mtavruli capitals; the font keys them by the ordinary letters.
  s = fontCase(s);
  const adv = 6 * scale, w = s.length * adv - scale;
  let x0 = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  y = Math.round(y);
  for (const ch of s) {
    if (ch !== ' ') {
      if (shadow) g.drawImage(glyph(ch, shadow), x0 + scale, y + scale, 5 * scale, 7 * scale);
      g.drawImage(glyph(ch, color), x0, y, 5 * scale, 7 * scale);
    }
    x0 += adv;
  }
}
function drawHUD() {
  const pad = (n, k) => String(n).padStart(k, '0');
  const [score, lari, time, lives] = STR.hud;
  const cols = [[score, pad(game.score, 6)], [lari, '₾×' + pad(game.coins, 2)],
    [time, pad(Math.ceil(game.time), 3)], [lives, '♥×' + game.lives]];
  if (W < 224) {   // too narrow for four labelled columns: lari and lives stack on the right
    txt(cols[0][0], 6, 5); txt(cols[0][1], 6, 14);
    txt(cols[2][0], Math.round(W / 2) - 8, 5); txt(cols[2][1], Math.round(W / 2) - 8, 14);
    txt(cols[1][1], W - 6, 5, { align: 'right' }); txt(cols[3][1], W - 6, 14, { align: 'right' });
    return;
  }
  cols.forEach(([label, value], i) => {
    const x = Math.round(6 + i * (W - 12) / cols.length + (W > 300 ? 4 : 0));
    txt(label, x, 6); txt(value, x, 15);
  });
  if (muted && !touchMode) txt(STR.soundOff, W - 8, H + TOP - 12, { align: 'right' });
  if (GOD) txt(STR.god, 8, H + TOP - 12, { color: '#ffd23f' });
}
function panel() {
  g.fillStyle = 'rgba(10,14,28,0.6)';
  g.fillRect(0, 0, W, H + TOP);
}
// Centred text wrapped to the view width; returns the y below the last line.
function para(s, y, opts = {}) {
  const scale = opts.scale || 1, max = Math.floor((W - 8) / (6 * scale)), out = [];
  let line = '';
  for (const word of s.split(' ')) {
    if (line && (line + ' ' + word).length > max) { out.push(line); line = word; } else line = line ? line + ' ' + word : word;
  }
  out.push(line);
  for (const l of out) { txt(l, W / 2, y, { align: 'center', ...opts }); y += 11 * scale; }
  return y;
}
// The touch buttons are pixel-art keyboard keys (owner): a keycap with cut corners, a light top face over a
// thick darker lip, the icon or the word in the game's own font; pressed, the face sinks onto the lip. Each is
// drawn on an n×n grid, blown up ×6 cell by cell and set as the button's background (--img, and --img-on for
// pressed); the button text stays only for screen readers.
const BUTTON_ICONS = {
  left: ['....#', '...##', '..###', '.####', '#####', '.####', '..###', '...##', '....#'],
  right: ['#....', '##...', '###..', '####.', '#####', '####.', '###..', '##...', '#....'],
  jump: ['....#....', '...###...', '..#####..', '.#######.', '#########'],
  pause: ['##.##', '##.##', '##.##', '##.##', '##.##', '##.##', '##.##'],
  mute: ['...###', '...#.#', '...#.#', '...#..', '.###..', '####..', '.##...'],
  fs: ['##...##', '#.....#', '.......', '.......', '.......', '#.....#', '##...##'],
};
function buttonSkin(n, icon, word, yellow, on) {
  const z = 6, c = document.createElement('canvas'); c.width = c.height = n * z;
  const k = c.getContext('2d');
  const box = (x, y, w, h, color) => { k.fillStyle = color; k.fillRect(x * z, y * z, w * z, h * z); };
  const cap = (x, y, w, h, color) => { box(x + 1, y, w - 2, h, color); box(x, y + 1, w, h - 2, color); };   // corners cut
  const face = yellow ? '#ffd23f' : '#ece8de', light = yellow ? '#fff0a8' : '#ffffff', lipC = yellow ? '#c08e12' : '#a9a397';
  const sink = on ? 2 : 0, lip = on ? 1 : 3;
  cap(0, 0, n, n, '#1e2028');                                                      // outline
  cap(1, 1, n - 2, n - 2, lipC);                                                   // the lip under the face
  const fy = 1 + sink, fh = n - 2 - lip - sink;
  cap(2, fy, n - 4, fh, face);                                                     // the top face
  box(3, fy, n - 6, 1, light); box(2, fy + 1, 1, fh - 2, light);                   // its lit edges
  const ink = '#2a2c34', cy = fy + fh / 2;
  if (word) {
    const s = fontCase(word), w = s.length * 6 - 1;
    let x = Math.round((n - w) / 2);
    for (const ch of s) { if (ch !== ' ') k.drawImage(glyph(ch, ink), x * z, Math.round(cy - 3.5) * z, 5 * z, 7 * z); x += 6; }
  } else {
    const h = icon.length, w = icon[0].length, x0 = Math.round((n - w) / 2), y0 = Math.round(cy - h / 2);
    icon.forEach((row, j) => { for (let i = 0; i < w; i++) if (row[i] === '#') box(x0 + i, y0 + j, 1, 1, ink); });
  }
  return `url(${c.toDataURL()})`;
}
for (const b of document.querySelectorAll('#touch button')) {
  const key = b.dataset.dir || b.dataset.act || b.id, word = key === 'run' ? STR.run : null;
  const n = word ? Math.max(18, fontCase(word).length * 6 + 9) : b.closest('.mid') ? 16 : 18;
  b.style.setProperty('--img', buttonSkin(n, BUTTON_ICONS[key], word, key === 'jump', false));
  b.style.setProperty('--img-on', buttonSkin(n, BUTTON_ICONS[key], word, key === 'jump', true));
}
function drawOverlay() {
  const c = W / 2, blink = Math.floor(game.t * 2) % 2 === 0, big = W >= 260 ? 3 : 2;
  const go = touchMode ? STR.tap : STR.press;
  const state = game.state === 'won' ? (game.winDone ? 'won' : null) : game.state === 'title' || game.state === 'over' ? game.state : game.paused ? 'pause' : null;
  if (!state) return;
  if (state !== 'won') panel();
  g.save(); g.translate(0, Math.round(TOP / 2));
  if (state === 'title') {
    let y = para(STR.title, 28, { scale: big, color: '#ffd23f' }) - 3;
    y = para(STR.city, y, { scale: 2, color: '#ff6a5a' }) + 4;
    y = para(STR.intro, y);
    y = para(STR.goal, y) + 8;
    if (touchMode) {
      y = para(STR.touchHelp, y, { color: '#bfe3ff' });
      if (canFullscreen) y = para(STR.fsHelp, y, { color: '#bfe3ff' });
      else if (!navigator.standalone) y = para(STR.homeHelp, y, { color: '#bfe3ff' });
    } else y = para(STR.keysHelp, y, { color: '#bfe3ff' });
    y += 8;
    if (blink) para(go + STR.start, y, { color: '#7dff8a' });
    if (game.hi) txt(STR.best + game.hi, c, y + 16, { color: '#ffd23f', align: 'center' });
  } else if (state === 'over') {
    const y = para(STR.lost + game.score, para(STR.gameOver, 64, { scale: big, color: '#ff6a5a' }) + 3);
    if (blink) para(go + STR.retry, y + 19, { color: '#7dff8a' });
  } else if (state === 'won') {
    let y = para(STR.won + game.score, para(STR.win, 44, { scale: big, color: '#ffd23f' }) + 3);
    if (game.score >= game.hi) y = para(STR.newBest, y + 3, { color: '#7dff8a' });
    if (blink) para(go + STR.again, y + 9, { color: '#7dff8a' });
  } else {
    txt(STR.pause, c, 86, { scale: 3, align: 'center' });
  }
  g.restore();
}

// Airliners crossing the sky — Batumi airport is right by the town: one coming in to land, one climbing out.
const PLANES = [
  { v: 21, y: 26, dy: 0.05, dir: -1, tail: '#c8343a', off: 0 },
  { v: 15, y: 70, dy: -0.06, dir: 1, tail: '#2f5fb0', off: 260 },
];
function drawPlanes() {
  for (const p of PLANES) {
    const span = W + 140, d = (game.t * p.v + p.off) % span;
    const x = Math.round(p.dir > 0 ? d - 70 : W + 70 - d), y = Math.round(p.y + p.dy * d);
    g.save(); g.translate(x, y);
    if (p.dir < 0) g.scale(-1, 1);
    g.fillStyle = '#f4f6f8'; g.fillRect(0, 3, 18, 3); g.fillRect(18, 4, 2, 2);       // fuselage and nose
    g.fillStyle = '#cfd6de'; g.fillRect(1, 5, 18, 1);
    g.fillStyle = p.tail; g.fillRect(0, 0, 2, 3); g.fillRect(2, 1, 1, 2);           // the tail fin
    g.fillStyle = '#9aa6b2'; g.fillRect(0, 4, 4, 1); g.fillRect(7, 5, 7, 1); g.fillRect(8, 6, 5, 1);   // stabiliser, wing
    g.fillStyle = '#6d7884'; g.fillRect(9, 6, 3, 1);                               // engine
    g.fillStyle = '#7a8fa6'; for (let i = 4; i < 16; i += 2) g.fillRect(i, 4, 1, 1);   // windows
    g.fillStyle = '#2b3f52'; g.fillRect(18, 4, 1, 1);                              // cockpit
    if (Math.floor(game.t * 1.5 + p.off) % 2) { g.fillStyle = '#ff4040'; g.fillRect(0, 0, 1, 1); }
    g.restore();
  }
}
function render() {
  g.save(); g.translate(0, TOP);
  g.fillStyle = skyGrad; g.fillRect(0, -TOP, W, H + TOP);
  g.drawImage(SUN, W - 87, 31);
  drawPlanes();
  drawLayer(HILLS, 0.12);
  drawLayer(SKYLINE, 0.3);
  drawLayer(LANDMARKS, LANDMARK_FACTOR, (1 - LANDMARK_FACTOR) * (W - BASE_W) / 2);
  drawLayer(PALMS, 0.55);
  const cx = Math.round(cam.x);
  g.save(); g.translate(-cx, 0);
  drawWorld();
  g.restore();
  for (const t of texts) {
    g.globalAlpha = Math.min(1, t.life * 2);
    txt(t.s, t.x - cx, t.y, { color: t.color, align: 'center' });
  }
  g.globalAlpha = 1;
  g.restore();
  if (game.state !== 'title') drawHUD();
  drawOverlay();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
}

// ---------- main loop ----------
document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'play') game.paused = true; });
startLevel();
const DT = 1 / 60;
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  while (acc >= DT) { update(DT); input.pressed.clear(); acc -= DT; }
  render();
  musicTick();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// debugging/testing hook
window.__mario = { game, input, setAction, get player() { return player; }, get level() { return level; }, get cam() { return cam; }, song, get songReady() { return songReady; } };
})();
