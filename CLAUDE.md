# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

«Супер Гиорги: Батуми» (renamed from «Супер Марио» 26.10.2026 — the hero is Giorgi) — a parody Mario-style platformer set on the streets of Batumi: jump over Prius taxis,
stray dogs and cars parked on the sidewalk, knock balconies out with your head, eat khachapuri to grow,
reach the Ali & Nino statue.

**Three languages: Russian, English, Georgian** (26.10.2026). `LANG` is `?lang=ru|en|ka`, else the first of
them in `navigator.languages`, else English. Every visible word lives in the `STR` table (`ru`/`en`/`ka`),
including the page title, button labels and aria-labels set from JS — never hard-code text in `txt()`/`para()`
calls or `index.html`; add a new string to all three languages. The Georgian was written by Claude, not
checked by a native speaker yet.

Plain browser game: `index.html` + one classic script `game.js`. No build, no dependencies, no assets —
every sprite, background and sound is generated in code (pixel-art string maps, canvas rects, WebAudio).

## Running

- `open index.html` works directly from disk (no ES modules, so no CORS issue with `file://`).
- For browser automation, serve it: `python3 -m http.server <port> --bind 127.0.0.1`. Port 8765 is
  taken by another local service on this Mac — pick a different one.
- Syntax check: `node --check game.js`. There is no test suite.
- `window.__mario` exposes `game`, `player`, `level`, `cam`, `input` and `setAction(action, down)`
  for scripted play-testing from the console (e.g. teleport `player.x`, press `start`/`jump`/`right`).

## Architecture (game.js)

- **Two canvases.** Everything, text included, is drawn into a low-res offscreen buffer `g`, then scaled
  nearest-neighbour onto the visible canvas `ctx`.
- **The game fills the whole browser window — owner's call.** `resize()` keeps the world view 224px
  tall (`H`) and makes the view width `W` follow the window (224..640); taller windows get extra sky
  `TOP` above the world (the HUD sits in it). So `W`
  and `TOP` are variables: anything placed "on screen" must use `W`, world drawing happens inside
  `translate(0, TOP)` in `render()`. `drawLayer(img, factor, shift)` — `LANDMARKS` gets a shift so the
  landmarks stay lined up with the gaps at any width. Fullscreen: ⛶ button / `F` / first tap on phones
  (iPhone has no fullscreen API — only "Add to Home Screen", see the meta tags and `manifest.webmanifest`).
- **Phones held upright have their own layout — owner's call** (`phone` = touch + portrait, body class
  `phone`): a HUD strip (`TOP = HUD_BAND`) on top below the notch, the world zoomed in to the screen width
  (view down to `PHONE_W` = 168px wide, less zoom only if the screen is too short), and a gamepad panel
  filling the rest (at least `PAD_H`): ◀ ▶ one slidable pad with pause/sound/fullscreen above it, БЕГ and a
  big yellow ▲ placed diagonally on the right. Below 224px of width the HUD switches to a compact form.
  Narrow views put the camera at 30% instead of 42% so more of the road ahead is visible. Landscape phones
  and desktop keep the full-window layout; nothing locks the orientation (manifest `orientation: any`).
- **Text is a blocky 5×7 bitmap font — owner's call** (`FONT`, `txt(s, x, y, {scale, color, align})`):
  uppercase only (input is uppercased), Cyrillic + Latin + Georgian + digits + a few symbols (₾ ♥ × ← → ▲);
  Georgian is drawn as Mtavruli capitals but keyed by the Mkhedruli letters, because `toUpperCase()` turns
  ა..ჰ into Mtavruli (U+1C90..) and `txt()` folds that back;
  missing characters render as `?`, so add a glyph when a new symbol appears in a string. One line at
  scale 1 fits 64 characters. Glyph canvases are cached per colour. `para()` wraps to the view width at any
  `scale`, so titles in long languages break into lines instead of running off a phone screen.
- **Fixed 60 Hz timestep.** `frame()` runs `update(DT)` in a loop; `input.pressed` (edge-triggered
  actions) is cleared after each step, `input.left/right/jump/run` are held states.
- **State machine** in `game.state`: `title` → `play` → `dying` | `won` → `over`. Death rebuilds the whole
  level via `startLevel()` (respawn at the Georgian-flag checkpoint once passed).
- **Level is built in code**, not from a map file: `buildLevel()` calls helpers `row()` (balcony strings:
  `B` breakable, `?` coin, `K` khachapuri, `#` concrete), `stairs()`, `pit()`, `coins()`, `car()`, `dog()`,
  `taxi()`, `car()` (parked along) / `across()` (parked across, nose or boot towards the camera) with tile
  coordinates. Ground is rows 12–13 (`GROUND_Y` = top of the sidewalk).
- **Buildings are khrushchyovkas**: `buildBuildings()` puts one behind every cluster of balconies — five
  floors of `FLOOR` = 24px plus a sixth floor added later in a different material (sometimes half built,
  rebar sticking out). Each is pre-rendered once into its own canvas (`makeBuilding`). Because floors are
  24px, interactive balconies must stay on **rows 8 and 5** (the floor lines of floors 3 and 5) — other
  rows won't line up with the facade. Ground-floor shops by house index (`n % 3`): a greengrocer
  (`vegShop`: awning, crates of produce, sometimes watermelons, 2 columns) or a SPAR (`sparShop`: green
  fascia, white panel with red SPAR and the fir-tree emblem, glass front, 3 columns; brand colours
  green #157946 / red #ec1b24), starting at column 2 so they miss the entrances. Washing lines (`level.ropes`) are strung across gaps of 2–12 tiles.
- **Collision**: `moveBody()` resolves x then y against solid tiles plus `level.solids` (parked-car
  rectangles), returns `hitX` and the tile bonked from below (`head`) → `hitBlock()`. Enemies and the
  khachapuri item reuse it. Stomp = falling and previous bottom above the target's top (`stomped()`).
- **Enemies**: dogs (`sleep` → wakes into `chase` when close; `patrol`; landing on one makes it `happy`
  and harmless), Prius taxis (activate when on screen, drive left, reverse on obstacles; roof works as a
  trampoline). `checkJumpOver()` awards the jump-over bonus.
- **Dogs never die and never kill — owner's rule.** No code path may remove a dog: they are befriended,
  hop over a Prius instead of being run over, and are put back on the sidewalk if they ever fall into a pit.
  A dog touching the player only knocks them back (`bowlOver`: short stun, no damage). The only thing that
  hurts the player is a Prius hitting them side-on (`hurtPlayer`), plus pits and the timer.
- **Hero is Giorgi**: black cap, white T-shirt, black jeans (`HERO_OUTFITS.giorgi`). The original red cap
  and blue overalls are kept as `classic`: set `OUTFIT` or open with `?outfit=classic` to roll back.
- **Dogs come in plain coats** (`DOG_COATS`: ginger, black, white, grey, cream, brown) — no patches or
  spots of any colour, owner's call. Ear tags (`DOG_TAGS`) are yellow, red, blue or green. `dog()` hands them out in turn. A dog's bump knocks Giorgi back
  ~4 tiles, except within 80px of a pit/sewer, where `bowlOver` only makes him hop on the spot.
- **Delivery mopeds** (`makeMoped`, `drawMoped`) ride next to the taxis: same array `level.taxis` and the
  same `updateTaxi` logic (`c.kind` = `'prius'` | `'moped'`), faster, smaller; light-blue box on the rack,
  deliberately without any brand logo (public site).
- **Burst sewers** (`sewer(x, w)` in the level): a pit flagged `sewer` with sewage at `SEWAGE_Y`, a
  geyser, bubbles and stink. Touching the surface kills (splash, «ФУ!»); `drawSewage` runs after the
  player so he sinks behind it. Dogs never die there either (pit respawn rule).
- Sedans parked along (`drawSedan`) have a distinct nose (headlight, longer hood) and tail (red lamp,
  shorter boot); `c.face` picks the direction.
- Taxis are 3rd-generation (2010) Priuses in metallic paint (`PRIUS_COLORS`: body/shade/highlight, plus a
  reflection that slides with the car's world position) with a roof taxi sign and no checker stripe; the
  silhouette lives in `PRIUS_TOP`/`PRIUS_BELT`. Owner asked for a blunt, rounded nose and no hard diagonal
  lines on the body (no character line, faint paint glint) — keep it that way.
- The checkpoint flag is hoisted gradually (`level.flagY`), never snapped to the top.
- **Background**: sky gradient + pre-rendered parallax layers tiled horizontally: `HILLS`, `SKYLINE`
  (generic towers, Alphabet Tower, Ferris wheel, crane), `LANDMARKS`, `PALMS`.
- **The background must be as chunky as the world — owner's call.** `layer()` draws each layer at
  `SUPERSAMPLE`× with canvas paths, shrinks it with nearest-neighbour sampling and snaps alpha to 0/255,
  so there are no anti-aliased blur pixels. Don't draw background straight onto the screen canvas or at
  higher resolution, and keep strokes ≥ 1 game unit wide or they break up into dots.
- **`LANDMARKS`** holds the recognisable buildings, drawn from photos: Sheraton (white lighthouse tower),
  Orbi City (blue sail-topped slabs), Batumi Tower (university with the Ferris wheel in its facade),
  Alliance Privilege / Marriott (elliptical diagrid tower with a wave at its foot). Each one is placed so it
  shows through a gap between khrushchyovkas: for a gap centred at world x, layer x ≈ 0.42·x + 111
  (`LANDMARK_FACTOR`). Moving buildings or balconies around means re-checking these positions.
- World-layer decor: the Neptune fountain (`level.fountains`, animated jets) in the gap at tiles ~153–159.
- **Audio** initialises on the first input (autoplay policy). On phones only touchend/pointerup count as a
  gesture, so `unlockAudio()` runs on those and on keydown/click: resumes the context, (re)starts the song,
  sets `navigator.audioSession.type = 'playback'` (iPhone silent switch). Over http(s) the song goes through
  a WebAudio gain (`songGain`) because iOS ignores `<audio>.volume`; `sfx.*` are short synthesized effects,
  the music must sound Georgian: `MELODY`/`TRACK` is an original tune in 6/8 (Acharuli dance feel,
  G mixolydian, lower voice in parallel fourths, G/D drone, doli drum), scheduled by `musicTick()`.
  `M` mutes via the master gain.
- **`music.mp3`** (optional, the owner's own recording): if it loads, it replaces the synth tune —
  `musicStart`/`musicStop`/`musicTick` drive an `<audio>` element instead (pause, death, win, mute all
  apply). The owner made it, so it goes to the public deploy too (owner, 26.10.2026).
- High score is in `localStorage` (`mario-batumi-hi`; old name kept so scores survive), wrapped in try/catch.
- **Touch**: `#touch` buttons in `index.html` (◀ ▶ as the `.dpad` group handled by `setDir`, БЕГ, ▲, plus
  pause/sound/fullscreen) appear on coarse pointers or on the first touch; a tap anywhere outside them
  starts/restarts/unpauses.

## Repo

Public: https://github.com/gogodzilla/super-giorgi (MIT for the code; `music.mp3` is the owner's, all rights
reserved — see `LICENSE-music.txt`). `README.md` is the public face with screenshots in `docs/`; refresh them when the
look changes noticeably. Commits use the GitHub noreply address (set in the repo's local git config).

## Deploy

Public at https://super.malets.by — static files on the VPS (`/var/www/super.malets.by/`, nginx vhost
`/etc/nginx/sites-available/super.malets.by`, Let's Encrypt via certbot; see `~/dev/infra/hosts/vps.md`).
Deploy = copy the files:
`scp index.html game.js manifest.webmanifest music.mp3 vps:/var/www/super.malets.by/`
