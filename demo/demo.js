// Demo autopilot for recording a video: Giorgi plays the level by himself.
//
//   python3 -m http.server 8813 --bind 127.0.0.1      (from the repo root; file:// frames can't be scripted)
//   open http://127.0.0.1:8813/demo/demo.html          (the query goes on to the game: ?lang=en, ?outfit=classic)
//
// Click once to start: the click is a real gesture, so the music plays. B turns the bot off and on. The game itself
// is untouched — the bot drives it through window.__mario only. frame() clears input.pressed after every fixed
// step, so hooking that clear gives an exact per-step callback. Every other step the bot simulates the player a
// little over a second ahead for ninety-odd input plans (walk, stop, back off, jumps of different heights and
// timing, a second jump on landing), predicts the dogs, the traffic, the items and the coins, and keeps the best
// plan. On top of that it has a route: the coin, khachapuri and chacha balconies, a broken balcony now and then, the
// khachapuri, the khinkali and the bottle once they're out, dogs close ahead to jump on, a short stop at the birzha.
// It runs and walks by turns, so the video isn't a blur (?pace=, px/s on the move).
// window.__demo holds the stats: plan time, skipped goals, how often the safety net had to step in, deaths.
(() => {
'use strict';
// mirrored from game.js
const T = 16, H = 224, COLS = 232, ROWS = 14, DT = 1 / 60;
const GROUND_Y = 12 * T, SEWAGE_Y = GROUND_Y + 6, BIRZHA_X = 119 * T + 2;
const EMPTY = 0, BALC = 2, BALC_COIN = 3, BALC_KHACH = 4, BALC_CHACHA = 8, BALC_KHINK = 9;
const PHYS = { walk: 90, run: 150, acc: 520, accAir: 380, fric: 700, jumpV: 390, g: 2000, hold: 0.45, maxFall: 520 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, to, d) => (v < to ? Math.min(v + d, to) : Math.max(v - d, to));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const speedOf = (c, t) => c.kind === 'scooter' ? 195 + 45 * Math.sin(t * 2.3 + c.phase) : c.kind === 'moped' ? 140 : c.kind === 'cart' ? 70 : 110;

const HORIZON = 70;          // steps planned ahead
const JUMP_COST = 120;       // every jump has to be worth something, or he hops all the way like a rabbit
const SCENIC = [[116 * T, 126 * T]];   // walk, don't run: the birzha
// Average speed on the move, px/s (walk is 90, run 150): Giorgi runs for a while, then walks for a while. ?pace=150
// runs all the way.
const PACE = +new URLSearchParams(location.search).get('pace') || 110;
const stats = window.__demo = { safety: 0, skipped: 0, planMs: 0, steps: 0, on: true };

// demo.html injects this script into the game's own window, so the bot shares its realm (reading the level
// across frames is about 70× slower).
const m = window.__mario;
if (!m) { console.error('[demo] no window.__mario in the game'); return; }
const style = document.createElement('style');
style.textContent = 'body.demo-on, body.demo-on * { cursor: none !important; }';
document.head.append(style);
addEventListener('keydown', e => { if (e.code === 'KeyB') { stats.on = !stats.on; release(m); } });   // B: bot on/off
setTimeout(() => {   // warm the JIT up on the title screen, or the first seconds of play stutter
  for (let k = 0; k < 40; k++) for (const c of candidates(m)) simulate(m, snapshot(m), runner(c), { kind: 'run' }, true);
}, 300);
const pressed = m.input.pressed, clear = pressed.clear.bind(pressed);
pressed.clear = () => { clear(); try { step(m); } catch (err) { console.error('[demo]', err); } };

function release(m) { for (const a of ['left', 'right', 'run', 'jump']) if (m.input[a]) m.setAction(a, false); }

// ---------- the route ----------
let curLevel = null, route = [], goalSince = 0, goalRef = null, startT = 0, viewW = 384;
let prevPlan = null, pace = PHYS.run, running = true, idleX = 0, idleSince = 0;

function buildRoute(L) {
  const r = [];
  const t = L.tiles;
  for (let x = 0; x < 200; x++) for (const y of [8, 5]) {
    const k = t[y][x];
    if (k === BALC_COIN || k === BALC_KHACH || k === BALC_CHACHA || k === BALC_KHINK) r.push({ x, y, k });
  }
  // a balcony on row 5 over a breakable one: break the one underneath first
  for (const g of r.slice()) if (g.y === 5 && t[8][g.x] === BALC) r.push({ x: g.x, y: 8, k: BALC });
  // and one breakable balcony in most rows, for the rubble and the slippers
  for (let x = 0; x < 200;) {
    if (t[8][x] === EMPTY && t[5][x] === EMPTY) { x++; continue; }
    const run = [];
    for (; x < 200 && (t[8][x] || t[5][x]); x++) if (t[8][x] === BALC) run.push(x);
    if (run.length && Math.random() < 0.7) {
      const bx = run[Math.floor(Math.random() * run.length)];
      if (!r.some(g => g.x === bx && g.y === 8)) r.push({ x: bx, y: 8, k: BALC });
    }
  }
  for (const g of r) g.kind = 'tile';
  r.push({ kind: 'stop', px: BIRZHA_X - 2 * T, dwell: 1.6, x: (BIRZHA_X - 2 * T) / T, y: 99 });
  r.sort((a, b) => a.x - b.x || b.y - a.y);
  return r;
}
const tileDone = (L, g) => L.tiles[g.y][g.x] !== g.k;

function pickGoal(m) {
  const pl = m.player, L = m.level, now = m.game.t;
  // the khachapuri or the bottle once they're out: catch it
  const it = L.items.find(i => !i.dead && !i.demoSkip && i.y < H && i.x > pl.x - 4 * T && i.x < pl.x + 14 * T);
  if (it) return { kind: 'item', ref: it };
  if (m.game.time < 60) return { kind: 'run' };
  // a dog close ahead: jump on it first (a friend for life), or it gets in the way of everything else
  const dog = L.dogs.find(d => d.mode !== 'happy' && !d.demoSkip && d.y + d.h > GROUND_Y - 2 && d.x + d.w > pl.x - T && d.x < pl.x + 7 * T);
  if (dog) return { kind: 'dog', ref: dog };
  for (const g of route) {
    if (g.done) continue;
    if (g.kind === 'tile') {
      if (tileDone(L, g)) { g.done = true; continue; }
      const gx = g.x * T + T / 2 - pl.w / 2;
      if (gx < pl.x - 1.5 * T) { g.done = true; continue; }   // behind us: let it go
      if (g.y === 5 && L.tiles[8][g.x] !== EMPTY && !route.some(o => !o.done && o.x === g.x && o.y === 8)) { g.done = true; continue; }
      if (gx > pl.x + 14 * T) return { kind: 'run' };
      return { kind: 'tile', ref: g, gx };
    }
    if (g.kind === 'stop') {
      if (g.px < pl.x - T) { g.done = true; continue; }
      if (g.px > pl.x + 14 * T) return { kind: 'run' };
      if (Math.abs(pl.x - g.px) < 12 && pl.onGround && Math.abs(pl.vx) < 20) {
        g.held = (g.held || 0) + DT;
        if (g.held >= g.dwell) { g.done = true; continue; }
      }
      return { kind: 'stop', ref: g, gx: g.px };
    }
  }
  return { kind: 'run' };
}

// ---------- the simulation ----------
function solidTile(tiles, tx, ty) {
  if (tx < 0 || tx >= COLS) return true;
  if (ty < 0 || ty >= ROWS) return false;
  return tiles[ty][tx] !== EMPTY;
}
function hitsSolid(b, W) {
  const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
  const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidTile(W.tiles, tx, ty)) return true;
  return W.solids.some(r => overlap(b, r));
}
function solidsNear(b, W, out) {
  out.length = 0;
  const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
  const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidTile(W.tiles, tx, ty)) out.push({ x: tx * T, y: ty * T, w: T, h: T, tx, ty });
  for (const r of W.solids) if (overlap(b, r)) out.push(r);
  return out;
}
const near = [];
function moveBody(b, W) {   // as in game.js; returns the tile bonked from below
  let head = null, hitX = false;
  b.x += b.vx * DT;
  for (const r of solidsNear(b, W, near)) {
    if (!overlap(b, r)) continue;
    if (b.vx > 0) b.x = r.x - b.w; else if (b.vx < 0) b.x = r.x + r.w; else continue;
    hitX = true;
  }
  if (hitX) b.vx = 0;
  b.onGround = false;
  b.y += b.vy * DT;
  let hitY = false, best = Infinity;
  for (const r of solidsNear(b, W, near)) {
    if (!overlap(b, r)) continue;
    if (b.vy > 0) { b.y = r.y - b.h; b.onGround = true; } else if (b.vy < 0) {
      b.y = r.y + r.h;
      if (r.tx !== undefined) {
        const d = Math.abs(r.x + T / 2 - (b.x + b.w / 2));
        if (d < best) { best = d; head = r; }
      }
    } else continue;
    hitY = true;
  }
  if (hitY) b.vy = 0;
  return head;
}
const edgeAhead = (b, dir, W) => !solidTile(W.tiles, Math.floor((dir > 0 ? b.x + b.w + 1 : b.x - 1) / T), Math.floor((b.y + b.h + 1) / T));

function snapshot(m) {
  const pl = m.player, L = m.level, x0 = pl.x - 12 * T, x1 = pl.x + 40 * T;
  const inRange = o => o.x + (o.w || 8) > x0 && o.x < x1;
  return {
    t: m.game.t, tiles: L.tiles, pits: L.pits,
    solids: L.solids.filter(inRange),
    dogs: L.dogs.filter(d => d.mode !== 'happy' && inRange(d)),
    cars: L.taxis.filter(c => !c.dead && inRange(c)),
    coins: L.coins.filter(c => !c.taken && inRange(c)),
    items: L.items.filter(i => !i.dead),
  };
}

// One plan, played out: inputs come from cand.at(i, p) → { dir, hold }; returns the score.
function simulate(m, W, cand, goal, run, record) {
  const pl = m.player;
  const p = { x: pl.x, y: pl.y, w: pl.w, h: pl.h, vx: pl.vx, vy: pl.vy, onGround: pl.onGround, coyote: pl.coyote, buffer: pl.buffer,
    stun: pl.stun, inv: pl.inv, star: pl.star, big: pl.big, prevBottom: pl.prevBottom };
  const dogs = W.dogs.map(d => ({ ref: d, x: d.x, y: d.y, w: d.w, h: d.h, mode: d.mode, dir: d.dir, active: d.active, grace: d.grace, sitT: d.sitT, nextSit: d.nextSit }));
  const cars = W.cars.map(c => ({ x: c.x, y: c.y, w: c.w, h: c.h, kind: c.kind, dir: c.dir, active: c.active, phase: c.phase || 0, vy: c.vy, stomps: c.demoStomps || 0 }));
  const coins = W.coins.map(c => ({ x: c.x, y: c.y, taken: false }));
  const items = W.items.map(i => ({ ref: i, x: i.x, y: i.y, w: i.w, h: i.h, dir: i.dir, emerging: i.emerging, top: i.top, kind: i.kind, got: false }));
  const heads = [];
  let score = 0, t = W.t, prevHold = m.input.jump, dead = false, hitGoal = false, deadAt = 0;
  const x0 = p.x;
  const kill = i => { dead = true; deadAt = i; };
  for (let i = 0; i < HORIZON + 40 && !dead; i++) {
    const ext = i >= HORIZON;   // past the horizon: just see whether he lands safely
    if (ext && p.onGround) break;
    const inp = ext ? { dir: 0, hold: false } : cand.at(i, p, prevHold);
    if (record) record.push(inp);
    const press = inp.hold && !prevHold;
    prevHold = inp.hold;
    t += DT;
    // the player, as updatePlayer()
    if (p.stun > 0) p.stun -= DT;
    const dir = p.stun > 0 ? 0 : inp.dir;
    const max = run ? PHYS.run : PHYS.walk;
    if (dir) {
      const turning = Math.sign(p.vx) === -dir;
      const a = (p.onGround ? PHYS.acc : PHYS.accAir) + (turning && p.onGround ? PHYS.fric : 0);
      p.vx += dir * a * DT;
      if (Math.abs(p.vx) > max) p.vx = Math.sign(p.vx) * Math.max(max, Math.abs(p.vx) - (a + PHYS.fric) * DT);
    } else if (p.onGround) p.vx = approach(p.vx, 0, PHYS.fric * DT);
    p.coyote = p.onGround ? 0.08 : p.coyote - DT;
    p.buffer = press ? 0.12 : p.buffer - DT;
    if (p.buffer > 0 && p.coyote > 0) { p.vy = -(PHYS.jumpV + Math.abs(p.vx) * 0.18); p.buffer = 0; p.coyote = 0; p.onGround = false; score -= JUMP_COST; }
    p.vy = Math.min(p.vy + PHYS.g * (inp.hold && p.vy < 0 ? PHYS.hold : 1) * DT, PHYS.maxFall);
    if (inp.hold && !press && p.onGround) score -= 4;   // no point keeping the key down on the ground
    p.prevBottom = p.y + p.h;
    const head = moveBody(p, W);
    if (p.inv > 0) p.inv -= DT;
    if (p.star > 0) p.star -= DT;
    if (head && !ext && !heads.includes(head.tx * 100 + head.ty)) {
      heads.push(head.tx * 100 + head.ty);
      const k = W.tiles[head.ty][head.tx];
      if (goal.kind === 'tile' && head.tx === goal.ref.x && head.ty === goal.ref.y) { hitGoal = true; score += 3000; }
      else score += k === BALC_CHACHA ? 2000 : k === BALC_KHINK ? 1500 : k === BALC_KHACH ? (p.big ? 300 : 1200) : k === BALC_COIN ? 500 : k === BALC ? 60 : 0;
    }
    const inPit = W.pits.find(q => p.x + p.w > q.x && p.x < q.x + q.w);
    const sunk = inPit && (inPit.sewer ? p.x + p.w > inPit.x + 2 && p.x < inPit.x + inPit.w - 2 && p.y + p.h > SEWAGE_Y + 2 : p.y + p.h > GROUND_Y + 10);
    if (sunk || p.y > H + 16) {
      if (p.star > 0) { p.y = Math.min(p.y, GROUND_Y + 8); p.vy = -720; } else { kill(i); break; }
    }
    if (ext) continue;
    // the view, for what wakes up
    const camX = clamp(p.x + p.w / 2 - viewW * (viewW < 260 ? 0.3 : 0.42), 0, COLS * T - viewW);
    const dx = d => p.x + p.w / 2 - (d.x + d.w / 2);
    for (const d of dogs) {
      if (d.mode === 'happy') continue;
      if (!d.active) { if (d.x < camX + viewW + 32) d.active = true; else continue; }
      if (d.grace > 0) d.grace -= DT;
      let speed = 0;
      if (d.mode === 'sleep') { if (Math.abs(dx(d)) < 72 && Math.abs(p.y - d.y) < 48) { d.mode = 'chase'; d.grace = 0.4; } }
      else if (d.mode === 'chase') { if (Math.abs(dx(d)) > 20) d.dir = Math.sign(dx(d)); speed = 52; }
      else if (d.mode === 'patrol') {
        if (d.sitT > 0) d.sitT -= DT;
        else { speed = 30; if ((d.nextSit -= DT) <= 0) { d.sitT = 1.7; d.nextSit = 6; } }
      }
      if (speed && edgeAhead(d, d.dir, W)) { if (d.mode === 'patrol') d.dir *= -1; else speed = 0; }
      if (speed) {
        const ox = d.x;
        d.x += speed * d.dir * DT;
        if (hitsSolid(d, W)) { d.x = ox; d.dir *= -1; }
      }
      if (!overlap(p, d)) continue;
      if (p.vy > 0 && p.prevBottom <= d.y + 6) {
        p.vy = inp.hold ? -420 : -300; d.mode = 'happy';
        if (goal.kind === 'dog' && d.ref === goal.ref) { hitGoal = true; score += 3000; } else score += 700;
      }
      else if (p.star > 0) { d.mode = 'happy'; score += 300; }
      else if (d.mode === 'sleep') { d.mode = 'chase'; d.grace = 0.4; }
      else if (d.grace <= 0) {   // knocked back: harmless, but ugly
        score -= 1500;
        p.vx = (Math.sign(dx(d)) || -d.dir) * 170; p.vy = -220; p.stun = 0.35; d.grace = 1;
      }
    }
    for (const c of cars) {
      if (!c.active) { if (c.x < camX + viewW + 8) c.active = true; else continue; }
      const front = c.dir < 0 ? c.x - 2 : c.x + c.w + 2;
      if (c.y + c.h >= GROUND_Y - 1 && W.pits.some(q => front > q.x && front < q.x + q.w)) c.dir *= -1;
      const ox = c.x;
      c.x += speedOf(c, t) * c.dir * DT;
      if (hitsSolid({ x: c.x, y: c.y, w: c.w, h: c.h - 1 }, W)) { c.x = ox; c.dir *= -1; }
      if (c.y + c.h < GROUND_Y) { c.vy = Math.min(c.vy + PHYS.g * DT, PHYS.maxFall); c.y = Math.min(c.y + c.vy * DT, GROUND_Y - c.h); }
      const box = { x: c.x + 1, y: c.y + 2, w: c.w - 2, h: c.h - 2 };
      if (!overlap(p, box)) continue;
      if (p.vy > 0 && p.prevBottom <= box.y + 6) {
        p.y = box.y - p.h; p.vy = inp.hold ? -560 : -460;
        score += c.stomps === 0 ? 900 : c.stomps === 1 ? 250 : -100;
        c.stomps++;
      } else if (p.inv <= 0 && p.star <= 0) {
        if (p.big) { score -= 40000; p.inv = 2; } else { kill(i); break; }
      }
    }
    if (dead) break;
    for (const it of items) {
      if (it.got) continue;
      if (it.emerging) { it.y -= 24 * DT; if (it.y <= it.top) { it.y = it.top; it.emerging = false; } }
      else it.x += (it.kind === 'chacha' ? 70 : 50) * it.dir * DT;
      const box = it.kind === 'chacha' && !it.emerging ? { x: it.x, y: it.y - 28, w: it.w, h: it.h + 28 } : it;
      if (overlap(p, box)) { it.got = true; score += it.kind === 'chacha' ? 4000 : 2500; }
    }
    for (const c of coins) if (!c.taken && overlap(p, { x: c.x, y: c.y, w: 8, h: 10 })) { c.taken = true; score += 250; }
  }
  if (dead) return { score: -1e7 + deadAt * 1000, dead: true };
  // where the plan leaves him
  if (goal.kind === 'tile') score += hitGoal ? (p.x - x0) * 2 : -Math.abs(p.x - goal.gx) * 8 - (p.y + p.h <= goal.ref.y * T + 1 ? 800 : 0);
  else if (goal.kind === 'dog') {
    const d = dogs.find(o => o.ref === goal.ref);
    score += hitGoal ? (p.x - x0) * 2 : d ? -Math.abs(p.x + p.w / 2 - (d.x + d.w / 2)) * 4 : 0;
  } else if (goal.kind === 'stop') score -= Math.abs(p.x - goal.gx) * 8 + Math.abs(p.vx) * 2;
  else if (goal.kind === 'item') {
    const it = items.find(i => i.ref === goal.ref);
    score += it.got ? (p.x - x0) * 2 : -Math.abs(p.x + p.w / 2 - (it.x + it.w / 2)) * 8;
  } else score += (p.x - x0) * 6;
  return { score, dead: false, dx: p.x - x0 };
}

// The plans tried each step: a direction pattern (dirs, switching at step 20), the jump key going down at step r
// and held for k steps (k = 0: no jump), and j2 — press it again for a full jump as soon as he lands.
const DIRS = [[1, 1], [0, 0], [-1, -1], [1, 0], [0, 1]];
function candidates(m) {
  const pl = m.player, grounded = pl.onGround || pl.coyote > 0;
  const out = [];
  const r0 = m.input.jump ? 1 : 0;   // the key is down already: let go first, or there's no press
  const jumps = [[0, 0]];
  for (const r of grounded ? [r0, 6, 14, 24] : [r0, 12]) for (const k of [6, 99]) jumps.push([r, k]);
  for (const [d1, d2] of DIRS) for (const [r, k] of jumps) for (const j2 of [false, true]) out.push({ d1, d2, s: 20, k, r, j2 });
  return out;
}
function runner(c) {
  let airborne = false, j2Start = -1;
  return { at(i, p, prevHold) {
    const dir = i < c.s ? c.d1 : c.d2;
    let hold = c.k > 0 && i >= c.r && i < c.r + c.k;
    if (c.j2) {
      if (!p.onGround) airborne = true;
      if (j2Start < 0 && i >= c.r + c.k && (airborne || c.k === 0) && p.onGround && !prevHold) j2Start = i;
      if (j2Start >= 0 && i < j2Start + 40) hold = true;
    }
    return { dir, hold };
  } };
}
const replay = seq => ({ at: i => seq[Math.min(i, seq.length - 1)] });

const hist = [];   // the last few seconds, for debugging from the console
stats.dbg = () => ({ simulate, snapshot, candidates, runner, pickGoal, route, prevPlan, hist });
function step(m) {
  const g = m.game, pl = m.player, L = m.level;
  if (!stats.on) return;
  if (pl && g.state === 'dying' && !stats.dying) {   // keep what led up to it, for debugging
    stats.dying = true;
    (stats.deaths = stats.deaths || []).push(hist.slice(-90));
    console.warn('[demo] died at', Math.round(pl.x / T));
  }
  if (g.state === 'play') stats.dying = false;
  if (pl && g.state === 'play') {
    hist.push([+(pl.x / T).toFixed(2), Math.round(pl.y), Math.round(pl.vx), Math.round(pl.vy), m.input.right ? 'R' : m.input.left ? 'L' : '-', m.input.jump ? 'J' : '-', stats.goal, stats.lastScore, stats.applied, stats.steps]);
    if (hist.length > 200) hist.shift();
  }
  if (g.state !== 'play' || g.paused || !pl || pl.dead) { release(m); prevPlan = null; return; }
  document.body.classList.add('demo-on');
  if (L !== curLevel) {   // a new game, or a respawn: the street is rebuilt
    curLevel = L; route = buildRoute(L); startT = g.t; prevPlan = null; goalRef = null;
  }
  if (pl.x > idleX + 12 || g.t - startT < 0.7) { idleX = pl.x; idleSince = g.t; }   // standing about = not getting on
  if (g.t - startT < 0.7) { release(m); return; }   // let the street sink in first
  const d = pl.x + pl.w / 2 - m.cam.x;
  if (m.cam.x > 0 && m.cam.x < COLS * T - 700) { const w42 = d / 0.42; viewW = w42 >= 260 ? w42 : d / 0.3; }
  for (const c of L.taxis) {   // count the bounces off each roof, so the plans stop milking one
    if (pl.vy <= -459 && Math.abs(pl.y + pl.h - c.y - 2) < 3 && pl.x + pl.w > c.x && pl.x < c.x + c.w && g.t - (c.demoT || 0) > 0.2) {
      c.demoStomps = (c.demoStomps || 0) + 1; c.demoT = g.t;
    }
  }

  const goal = pickGoal(m);
  stats.goal = goal.kind + (goal.ref ? ' ' + goal.ref.x + ',' + goal.ref.y : '');
  if (goal.ref !== goalRef) { goalRef = goal.ref; goalSince = g.t; }
  // can't get at it (or not without standing about for ages, which looks dumb on video): move on
  const idle = g.t - idleSince > 1.5 && g.t - goalSince > 1.5 && goal.kind !== 'stop';
  if (goal.ref && (g.t - goalSince > 4 || idle)) {
    if (goal.kind === 'item' || goal.kind === 'dog') goal.ref.demoSkip = true; else goal.ref.done = true;
    stats.skipped++;
    console.log('[demo] skipped', goal.kind, goal.ref.x);
    goalRef = null;
  }
  // keep the speed on the move near PACE: run until the average is above it, walk until it's below (on the ground)
  if (pl.vx > 20) pace += (pl.vx - pace) * 0.01;
  if (pl.onGround) running = pace < PACE - 12 || (running && pace < PACE + 12);
  const run = running && !SCENIC.some(([a, b]) => pl.x > a && pl.x < b) && goal.kind !== 'stop';
  stats.pace = Math.round(pace);

  // plan every other step and follow the plan in between: the player part of it is exact
  if (stats.steps++ % 2 && prevPlan && prevPlan.length > 1 && !prevPlan.dead && prevPlan.run === run) {
    prevPlan = prevPlan.slice(1);
    return apply(m, prevPlan[0], run);
  }
  const t0 = performance.now();
  const W = snapshot(m);
  // "wait a bit, then go" can win every replan and never happen: after a second of standing about only plans that
  // act now (move, or jump at a balcony), after a while longer on the way to a dog or the finish only plans that go
  const waited = g.t - idleSince, under = goal.kind === 'tile' && Math.abs(pl.x - goal.gx) < 6;
  const actNow = c => c.d1 !== 0 || (under && c.k > 0 && c.r <= 1);
  if (waited > 1.5 && goal.kind !== 'stop') clearTheWay(m);
  const filter = goal.kind === 'stop' || waited < 1 ? null
    : waited > 1.5 && (goal.kind === 'run' || goal.kind === 'dog') ? c => c.d1 === 1 : actNow;
  const plan = (run, filter) => {
    let best = null;
    const tryPlan = (make, bonus) => {   // make() gives a fresh plan: runners keep state while they play
      const r = simulate(m, W, make(), goal, run);
      r.score += bonus;
      if (!best || r.score > best.score) { best = r; best.make = make; }
    };
    if (prevPlan && prevPlan.length > 1 && prevPlan.run === run && !filter) { const old = prevPlan.slice(1); tryPlan(() => replay(old), 60); }
    for (const c of candidates(m)) if (!filter || filter(c)) tryPlan(() => runner(c), c.d1 === 1 ? 10 : 0);
    return filter && best.dead ? plan(run, null) : best;
  };
  let best = plan(run, filter), mode = run;
  if (!run && (best.dead || best.dx < 8)) {   // walking can't make it (a wide pit, traffic) or gets nowhere: run
    const alt = plan(true, filter);
    if (!alt.dead && (best.dead || alt.score > best.score + 300)) { best = alt; mode = true; }
  }
  const seq = [];
  simulate(m, W, best.make(), goal, mode, seq);
  prevPlan = seq.slice(0, HORIZON);
  prevPlan.dead = best.dead;
  prevPlan.run = mode;
  stats.lastScore = Math.round(best.score);
  stats.planMs = stats.planMs * 0.95 + (performance.now() - t0) * 0.05;
  apply(m, seq[0] || { dir: 1, hold: false }, mode);
  if (best.dead || best.score < -20000) safetyNet(m);   // dead, or (big) knocked small by a car
}
function apply(m, inp, run) {
  stats.applied = (inp.dir > 0 ? 'R' : inp.dir < 0 ? 'L' : '-') + (inp.hold ? 'J' : '-');
  m.setAction('right', inp.dir > 0);
  m.setAction('left', inp.dir < 0);
  m.setAction('run', run);
  m.setAction('jump', inp.hold);
}

// Stuck in front of a stretch a car or moped shuttles along (between a hole and the parked cars it turns back at
// the plans see it come for him whichever way he goes): while it's still parked off screen, it quietly goes.
function clearTheWay(m) {
  const pl = m.player, L = m.level;
  for (let i = L.taxis.length - 1; i >= 0; i--) {
    const c = L.taxis[i];
    if (!c.active && c.x > pl.x && c.x < pl.x + 16 * T) { L.taxis.splice(i, 1); stats.cleared = (stats.cleared || 0) + 1; console.warn('[demo] cleared', c.kind, 'at', Math.round(c.x / T)); }
  }
}

// Nothing the plans could do: turn the traffic round rather than lose a life on camera.
function safetyNet(m) {
  const pl = m.player;
  if (pl.star > 0 || pl.inv > 0) return;
  for (const c of m.level.taxis) {
    if (!c.active || c.dead) continue;
    const ahead = (c.x - pl.x) * c.dir < 0;   // coming at him
    if (ahead && Math.abs(c.x + c.w / 2 - pl.x - pl.w / 2) < 90) {
      c.dir *= -1;
      stats.safety++;
      console.warn('[demo] safety net: turned', c.kind, 'at', Math.round(c.x / T));
    }
  }
}
})();
