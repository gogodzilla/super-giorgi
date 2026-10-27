# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

«Супер Гиорги: Батуми» (renamed from «Супер Марио» 26.10.2026 — the hero is Giorgi) — a pixel-art platformer in the spirit of Super Mario, set on the streets of Batumi (owner: don't call it a parody): jump over Prius taxis,
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
- **Demo autopilot for recording videos** (`demo/`, not deployed): serve the repo and open `demo/demo.html` (query goes on
  to the game, e.g. `?lang=en`), click once. It loads the game unchanged in a frame and injects `demo.js` into it, which
  hooks `input.pressed.clear` (called after every fixed step) and plays through `window.__mario`: every other step it
  simulates the player ~1 s ahead for ~90 input plans against predicted dogs/traffic/items/coins and follows a route
  (coin/khachapuri/chacha balconies, items, dogs close ahead, a stop at the birzha). It runs and walks by turns to
  keep ~110 px/s on the move (`?pace=150` runs all the way), running anyway when walking can't clear a gap. Every jump
  costs score in its plans (`JUMP_COST`), or it hops all the time. Receding-horizon plans like "wait, then go" can win
  every replan and never happen, so after a second without 12px of progress only plans that act now count, and a goal
  is dropped after 1.5 s of that; stuck before a stretch a vehicle shuttles along, it quietly removes the vehicle while
  it is still parked off screen (`clearTheWay`). B toggles it; `window.__demo` in the
  frame has the stats. It mirrors `PHYS`, `moveBody` and the enemy rules — re-check it when those change.
  `demo.html?insta` records for Reels/Stories: a 9:16 stage, the game forced into its phone layout (a synthetic
  `touchstart`) with `#touch` hidden, the frame taller than the stage so the world zooms to full width, sky colour
  above and sea colour below; F fullscreens the outer page (the frame has no fullscreen permission there).
- `?god=1` — god mode (`GOD`) for play-testing: `killPlayer` does nothing, holes and sewers toss Giorgi back up,
  the clock refills; «режим бога» shows bottom-left.

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
  filling the rest (at least `PAD_H`): ◀ ▶ one slidable pad with pause/sound/fullscreen above it, БЕГ and the
  yellow ▲ on the right — in one row, the same size as the others (owner). Below 224px of width the HUD switches to a compact form.
  Narrow views put the camera at 30% instead of 42% so more of the road ahead is visible.
- **Touch screens held sideways get side panels** (`land`, body class `land`; owner: on both phones the buttons
  covered Giorgi): `sidePanel()` sizes the keys (`--b`) and reserves a panel on each side — ◀ ▶ bottom-left with
  pause/sound/fullscreen above, БЕГ ▲ bottom-right — and the world view (`avail` width) sits between them, so no
  button lies over the street. Desktop keeps the full-window layout; nothing locks the orientation (manifest
  `orientation: any`).
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
  coordinates. **Every new game reshuffles the street — owner's call:** `game.seed` is drawn in `newGame()` and
  `buildLevel()` resets the seeded generator `lrand` (mulberry32) from it, so a death rebuilds the same street. Random
  per game: which vehicle sits on each `ride()` slot, whether a `dog()` spot has a dog (75%) and sometimes a second
  one asleep beside it, what each `row()` of balconies holds (shuffled, a quarter of B/? swapped, khachapuri kept),
  where the four poop piles go (`flat()` sidewalk, well apart), Prius/moped/hoodie colours. Fixed: the layout
  itself — pits, sewers, stairs, parked cars, balcony rows and so the houses and landmarks. Use `lrand`/`lpick`, not
  `Math.random`, for anything in the level build. Ground is rows 12–13 (`GROUND_Y` = top of the sidewalk). **The sidewalk is an embankment over
  the sea — owner's call:** row 13 isn't drawn as asphalt; `drawSeaBand` paints the sea under it along the whole
  street and open water in the holes (falling in splashes, `pl.splashed`).
- **Buildings are khrushchyovkas**: `buildBuildings()` puts one behind every cluster of balconies — five
  floors of `FLOOR` = 24px plus a sixth floor added later in a different material (sometimes half built,
  rebar sticking out). Each is pre-rendered once into its own canvas (`makeBuilding`). Because floors are
  24px, interactive balconies must stay on **rows 8 and 5** (the floor lines of floors 3 and 5) — other
  rows won't line up with the facade. Ground-floor shops by house index (`n % 3`): a greengrocer
  (`vegShop`: awning, crates of produce, sometimes watermelons, 2 columns) or a SPAR (`sparShop`: green
  fascia, white panel with red SPAR and the fir-tree emblem, glass front, 3 columns; brand colours
  green #157946 / red #ec1b24), starting at column 2 so they miss the entrances. The one long house without a shop (`n % 3 === 2`, 11+
  columns — tiles 107–117) has the real Mtiuluri restaurant (`restoShop`, 7 columns, owner's photo): dark fascia
  with «რესტორანი მთიულური» in white and red, bulbs along the awning, grey stone pillars with wicker lanterns,
  warm glass fronts. The first house with nothing downstairs (`n === 2`, tiles 46–51) has a rectangular passage
  into the courtyard at its right end, under a white Camex sign in its blue wide letters (`camexArch`, `CAMEX_WORD`, owner). The first SPAR's house (`n === 1`, tiles 34–40) has BULBALAND instead — the real
  Belarusian shop (`bulbaShop`, 4 columns, owner's photo): white fascia with red stitched BULBALAND in small 3×5 letters (`BULBA_FONT`, owner), red band
  with white vyshyvanka ornament, curtained window, white pillar with red icons, glass door over granite steps.
  Washing lines (`level.ropes`) are strung across gaps of 2–12 tiles.
- **Stairs are stacks of shipping containers** (owner's call): CONCRETE tiles are drawn by `drawContainer` —
  each row is cut into containers two tiles long (three if the row is odd), a lone tile shows the doors end-on;
  colours from `CONTAINER_COLORS`, picked by hash so they stay put.
- **Collision**: `moveBody()` resolves x then y against solid tiles plus `level.solids` (parked-car
  rectangles), returns `hitX` and the tile bonked from below (`head`) → `hitBlock()`. Enemies and the
  khachapuri item reuse it. Stomp = falling and previous bottom above the target's top (`stomped()`).
- **Enemies**: dogs (`sleep` → wakes into `chase` when close; `patrol`; landing on one makes it `happy`
  and harmless), Prius taxis (activate when on screen, drive left, reverse on obstacles; roof works as a
  trampoline; taxis and mopeds turn back at the edge of a hole or sewer instead of driving over it — owner).
  `checkJumpOver()` awards the jump-over bonus.
- **Khachapuri** is Adjarian, drawn after photos (owner asked to check it against the real thing): `KHACH`, a boat of
  pale golden crust with the ends twisted into points, molten cheese, the yolk in its white and a pat of butter. Keep
  the outline symmetric (owner found an uneven one crooked).
- **Khinkali** (owner): two per game, one in each half, hidden in coin balconies (`BALC_KHINK`, picked with `lrand`,
  drawn like any coin balcony); the dumpling (`KHINK`) slides out like the khachapuri and is an extra life.
- **The Georgian Bus coach** Giorgi came in on (owner) is parked whole at the start of the street, tiles 0–9
  (`BUS`, `BUS_X`, `drawBus`; decor, no collision): he sets off from beside it and the camera rolls past. Livery after
  the company's photos: white, GEORGIAN BUS in red in the small 3×5 letters (`BULBA_FONT` plus a 4-wide N — the 3-wide
  one reads as M), red brush strokes and small crosses, three axles, a Tourismo's bug-eye mirror.
- **Chacha** (a feature request from Anton, via the owner): two plain balconies per game, one in each half of the
  street (picked with `lrand`), hold a bottle of chacha (`BALC_CHACHA`, sprite `CHACHA`); such a balcony is given away by a
  man in a white vest out there for a smoke (owner; a `SMOKER` sprite in a dark open doorway, standing a step up so
  the vest clears the railing — owner found the first one blurry; `drawBalcony`, no laundry or glint on it). It bounces along like
  Mario's star; drinking it sets `player.star` = `CHACHA_TIME` (10 s): nothing hurts Giorgi (`hurtPlayer` returns),
  holes and sewers toss him back up as in god mode, every dog he touches is befriended (landing on one still bounces him
  off it, as without chacha — owner), and he shimmers through
  `STAR_COLORS` (`TINT` canvas in `drawPlayer`), slower in the last two seconds. The timer can still run out.
- **Dogs never die and never kill — owner's rule.** No code path may remove a dog: they are befriended,
  hop over a Prius instead of being run over, and are put back on the sidewalk if they ever fall into a pit.
  A dog touching the player only knocks them back (`bowlOver`: short stun, no damage). The only thing that
  hurts the player is a Prius hitting them side-on (`hurtPlayer`), plus pits and the timer.
- **Favicon / home-screen icon** — Giorgi face-on with cap and moustache (`HERO_FACE`, 15×16 so the 9-pixel face
  is symmetric — owner wanted it a pixel narrower; `heroIcon`), drawn in
  code and added as `<link rel=icon>` / `apple-touch-icon` at startup (owner). `manifest.webmanifest` has no icons.
- **Hero is Giorgi**: black cap, white T-shirt, black jeans (`HERO_OUTFITS.giorgi`). The original red cap
  and blue overalls are kept as `classic`: set `OUTFIT` or open with `?outfit=classic` to roll back.
- **Resting dogs take a random pose** (`DOG_REST`, `d.pose`): asleep with Zzz, lying with the head up, or sitting
  (`DOG_LIE`, `DOG_SIT`). Patrolling dogs sit down for a moment now and then (`sitT`/`nextSit`); befriended dogs
  wag, sit or lie down by turns (`poseT`). Owner's call.
- **Dogs come in plain coats** (`DOG_COATS`: ginger, black, white, grey, cream, brown) — no patches or
  spots of any colour, owner's call. Ear tags (`DOG_TAGS`) are yellow, red, blue or green. `dog()` hands them out in turn. A dog's bump knocks Giorgi back
  ~4 tiles, except within 80px of a pit/sewer, where `bowlOver` only makes him hop on the spot.
- **Delivery mopeds** (`makeMoped`, `drawMoped`) ride next to the taxis: same array `level.taxis` and the
  same `updateTaxi` logic (`c.kind` = `'prius'` | `'moped'`), faster, smaller; light-blue box on the rack,
  deliberately without any brand logo (public site).
- **Burst sewers** (`sewer(x, w)` in the level): a pit flagged `sewer` with sewage at `SEWAGE_Y`, a
  geyser, bubbles and stink. Touching the surface kills (splash, «ФУ!»); `drawSewage` runs after the
  player so he sinks behind it. Dogs never die there either (pit respawn rule).
- **Dog poop** (`poop(x)` in the level, `level.poops`, `drawPoop`; only four piles — owner wanted fewer — at random spots each game): a pile
  with a fly on the sidewalk; stepping
  in it splatters it flat with «ФУ!» and a squish. Purely cosmetic, owner's call — it must not affect score,
  speed or lives.
- **`CHECKPOINT_X` must stay on flat sidewalk** clear of pits, sewers and parked cars — Giorgi respawns there
  (it was inside the sewer at tile 99 once and every respawn drowned). Re-check when moving level pieces.
- **Traffic: one vehicle per stretch of sidewalk for most of the level** (owner: a moped and a taxi together is
  too hard early on): five `ride()` slots at 76, 122, 158, 177, 191, the vehicle on each picked at random but
  **ramping up in difficulty — cart, Prius, moped, scooter (owner)**: position along the street plus noise, sorted;
  speeds climb the same way (70 / 110 / 140 / 150–240).
  The **electric sightseeing cart** (`makeCart`/`drawCart`, kind `'cart'`: an open frame on a low floor, the front wheel under a straight steering column (no raked fork — owner),
  the rear seat on a massive red base that is where the cart ends — no canopy, no body, no bumpers;
  only the seat bases are red (owner) — the driver on the front bench, a woman all in black with a hijab on the back one, slow, «ЭКСКУРСИЯ!»); the finale before the stairs has the
  **unhinged e-scooter** instead of more taxis and mopeds (owner): `makeScooter`/`drawScooter`, kind `'scooter'`
  in `level.taxis` — a kid in a hoodie on a rental scooter, speed swinging 150–240 (always faster than a moped), random hops, shouts
  «ПОСТОРОНИСЬ!». **Prius and moped colours are random** on every level build (`pick(PRIUS_COLORS)`,
  `pick(MOPED_COLORS)`, owner).
- One parked sedan is a Georgian patrol car (`car(139, true)`, `c.police`): white with a black stripe along the
  side carrying POLICE (3-pixel letters, `POLICE_WORD`, drawn unmirrored), a blue/red light bar flashing instead
  of the hazard lights — the current livery (owner; checked against 2026 photos of the new Corollas).
  Rows parked across can hold a patrol car too, always nose-on (`across(x, n, police)` — index in the row;
  rows at 27 and 179 — owner wanted one early; a white car next to it is repainted blue in `across`): a black stripe across
  the front with a number plate, no lettering (owner), light bar.
- **Easter egg: a terracotta double-cab pickup** (`makePickup`, `drawPickup`, kind `'pickup'` in `level.cars`) parked on the
  pebble beach past Ali & Nino (`PICKUP_X`, tile 214); at the finish the camera eases on until it is in the shot. Its bed is loaded with watermelons and mandarins.
- **The old Wedding House** ("the pig's head", demolished 25.02.2026) stands in the gap before the stairs
  (`WEDDING`, `WEDDING_X` = tile 71). Outline traced from the owner's photo from the boulevard side (`SHELL`,
  `GLASS`, `CREASE` polygons): pointed snout left, tall sharp ear, a crease from the ear down between the flat
  left face and the dome, dome flat on top and rounded at the right, glass "eye" under the snout, saucer brim.
  Pre-rendered pixel by pixel, drawn in the world layer like the fountain. A bride and groom (14 px, a little
  shorter than Giorgi — owner) stand on a stone path across its pool with hearts floating up (`NEWLYWEDS`, owner).
- Sedans parked along (`drawSedan`) have a distinct nose (headlight, longer hood) and tail (red lamp,
  shorter boot); `c.face` picks the direction.
- Taxis are 3rd-generation (2010) Priuses in metallic paint (`PRIUS_COLORS`: body/shade/highlight, plus a
  reflection that slides with the car's world position) with a roof taxi sign and no checker stripe; the
  silhouette lives in `PRIUS_TOP`/`PRIUS_BELT`, redrawn after the owner's side photo of a 2010 car: the hood rising
  from a low nose into the raked windscreen, the roof peaking over the B-pillar, the tail cut off nearly upright. The
  headlight is a sliver under the hood edge sweeping up and back (light rim, dark lower edge so it shows on silver),
  the tail lamp runs down the tail under the spoiler, door shut lines are faint (owner: not contrasting), and the
  taxi sign is a small plain orange box seen from the side (4 px — a roof sign is short in profile), not turned to
  the viewer (owner). Owner asked for a blunt,
  rounded nose and no hard diagonal lines on the body (no character line, faint paint glint) — keep it that way.
- The checkpoint flag is hoisted gradually (`level.flagY`), never snapped to the top.
- **Background**: sky gradient, airliners crossing it (`PLANES`, `drawPlanes`, positions from `game.t` — one
  landing, one climbing out), then pre-rendered parallax layers tiled horizontally: `HILLS`, `SKYLINE`
  (generic towers, Alphabet Tower, Ferris wheel, tower cranes), `LANDMARKS`, `PALMS`. The Alphabet Tower
  follows photos: a wide white lattice cylinder (31 m across, 130 m tall — not a needle) around a dark lift
  core, two helical bands wound three times round it, a glass sphere as wide as the tower on top. Tower
  cranes (`crane(x, h, jib, dir, color, hook)`) — owner wants plenty of them.
- **The background must be as chunky as the world — owner's call.** `layer()` draws each layer at
  `SUPERSAMPLE`× with canvas paths, shrinks it with nearest-neighbour sampling and snaps alpha to 0/255,
  so there are no anti-aliased blur pixels. Don't draw background straight onto the screen canvas or at
  higher resolution, and keep strokes ≥ 1 game unit wide or they break up into dots.
- **`LANDMARKS`** holds the recognisable buildings, drawn from photos: Sheraton (white lighthouse tower),
  Orbi City (after the owner's photo: three identical slabs in a row, overlapping, the right one at the back (owner), straight roofs
  sloping up to the right under a blue cornice, pale striped faces with deep blue glass swept up from the foot
  to the high corner along a concave curve, a cream podium with arches), Batumi Tower (the Technological University, after the owner's photo: slender white
  tower with dark slits, slanted blue glass foot with a white ribbon, blue-violet band, golden Ferris wheel in
  the upper facade, stepped crown and needle spire),
  Alliance Privilege / Marriott (after the owner's photo; owner: the outline repeats the central oval — the
  whole tower is a tall oval of cream vertical fins with the smaller white-diagrid oval inside it on the left,
  sharing the left edge; at the foot a glass lobby and a white ribbon dipping in a U into a low arched annex),
  Courtyard by Marriott (`courtyard`, after the owner's photo; owner: it must be an oval — the whole outline is
  a tall white banded blunt oval (superellipse, owner: not too pointed) cut by the ground a little below its middle, a tall blue glass oval left of centre; gap at tiles 52–62), White Magnolia (`magnolia`,
  after the owner's photo from the sea: wide symmetric white facade, pilastered bays with tall arched openings
  under a cornice, terraced glazed floors stepping back above, taller corner blocks, a projecting centre with a
  giant arch and paired columns, courtyard houses showing through; in the last gap, tiles 179–196). Each one is placed so it
  shows through a gap between khrushchyovkas: for a gap centred at world x, layer x ≈ 0.42·x + 111
  (`LANDMARK_FACTOR`). Moving buildings or balconies around means re-checking these positions.
- World-layer decor: the Neptune fountain (`level.fountains`, animated jets) in the gap at tiles ~153–159.
- **The birzha** (ბირჟა, owner: where the neighbourhood men sit and talk over games): `drawBirzha`, `BIRZHA_X` at
  tile 119, in the gap at 118–125 in front of Batumi Tower — a tin canopy with a vine and grapes, two pairs of men on
  stools face to face across little tables (owner), nardi on one, dominoes on the other, drawn like the people on
  the cart (`birzhaMan`, `BIRZHA_MEN`). Decor only; poop is kept off it (`flat()`).
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
  starts/restarts/unpauses. **They are pixel-art keyboard keys — owner's call:** `buttonSkin()` draws each keycap
  (cut corners, light top face over a thick darker lip that it sinks onto when pressed, the jump key yellow,
  icon from `BUTTON_ICONS` or the word in the game font) on a small grid,
  blows it up ×6 and sets it as `--img` / `--img-on` (pressed); the CSS only sizes them, the button text is
  hidden and stays for screen readers.

## Repo

Public: https://github.com/gogodzilla/super-giorgi (MIT for the code; `music.mp3` is the owner's, all rights
reserved — see `LICENSE-music.txt`). `README.md` is the public face with screenshots in `docs/`; refresh them when the
look changes noticeably. Commits use the GitHub noreply address (set in the repo's local git config).

## Deploy

Public at https://super.malets.by — static files on the VPS (`/var/www/super.malets.by/`, nginx vhost
`/etc/nginx/sites-available/super.malets.by`, Let's Encrypt via certbot; see `~/dev/infra/hosts/vps.md`).
Deploy = copy the files:
`scp index.html game.js manifest.webmanifest music.mp3 vps:/var/www/super.malets.by/`
