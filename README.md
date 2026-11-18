# 🐍 Slither 3D

A 3D snake game that runs in the browser. It is built with [Three.js](https://threejs.org) and plays on both **desktop and mobile**. It is a fully static site, so you can host it on **GitHub Pages** with no build step. It is also an **installable PWA** that works offline.

## Features
- **4 camera views** (button next to Pause, or press V): classic 3D, tilted 3D, snake-eye first person (◀ ▶ turn left/right, only your tongue is visible) and a top-down 2D map.
- **3 game modes**
  - **Adventure**: 20 levels, each on its own big map (different places, times of day and weather: sunny mornings, golden sunsets, heavy rain, thunderstorms, starry nights). Bumping into trees, walls, rocks or the river no longer kills you: the snake just stops, gets dizzy, and waits for a new direction. Watch out for slimes, poison and traffic on busy roads. To clear a level you must eat a set number of 🍎 apples **and** ★ special fruits. You earn up to 3 stars per level, based on the health you have left.
  - **Endless**: no goal; the snake keeps speeding up. Pick any of the 20 maps.
  - **Time Attack**: 90 seconds to score as much as you can. Every apple adds 1.5 seconds.
- **Open 3D worlds instead of a board**: every level is a large full-screen landscape with rolling hills, fenced in by a **bamboo fence**. The camera follows the snake, a red arrow and a minimap point to the next apple.
- **Rivers and bridges**: snakes can't swim here! Rivers wind through each map, and you must cross them on wooden (or stone road) bridges. Hitting the water or the fence costs health.
- **10 environments**: Green Meadow, Wild Jungle, Sandy Shores, Rocky Valley, Rolling Hills, Snowy Peaks (with snowfall), Country Road (sunset, street lamps, cars), Fun Playground (swings, slides, seesaws, sandpits), Torch Cave and Temple Night. The two dark levels are lit by flickering fire torches (with real lights and embers), and the temple has fireflies.
- **Harmless wildlife**: monkeys, parrots, birds, eagles, seagulls, deer, rabbits, sheep, goats, turtles on the sand, crabs, frogs, lizards, penguins, ducks on the river, jumping fish, bats, dogs, cats, squirrels, pigeons and butterflies. They wander around and scurry away from the snake.
- **Food system**: normal food (apple, litchi, pumpkin, orange), rare special food (pizza, cake, burger, donut: big points, maximum growth), spells (speed, slow, invisible, reverse, live, sword), gems (mushroom, devil eye, fire stone, magnet) and small animals (mouse, frog, bug, crab) that all run around from the start of the level. Every level has its own goals; finishing them opens a **hidden door** (or a burrow in the ground) that you slither through. Biting your own body hurts and cuts your tail.
- **15 special-food effects**

  | Fruit | Effect |
  |---|---|
  | ⚡ Speed Rush | move faster |
  | 🐢 Slow Mo | move slower |
  | 🔄 Reverse | controls are flipped |
  | 👻 Invisible | pass through your own tail; enemies can't hurt you |
  | 🔥 Ghost Raider Fire | destroys every enemy and lets you burn through obstacles |
  | ✂️ Shrink | cuts your length in half |
  | 🧲 Magnet | pulls nearby fruit to you |
  | ☠️ Poison | damages your health |
  | 🎨 Color Swap | new snake skin and bonus points |
- **Health system**: crashing costs 30 ❤, a slime enemy costs 20 and poison costs 20.
- **Animations**: smooth movement with interpolation, a slithering body, a tongue that flicks, blinking eyes, a swallow bulge that travels down the body, hopping slime enemies, particles, shockwaves and screen shake.
- Sound effects are synthesized with WebAudio, so the game needs no audio files. Progress is saved in `localStorage`.

## Controls
| | Turn | Sprint |
|---|---|---|
| Desktop | Arrow keys / WASD | Hold the direction key you're moving in, or Space / Shift |
| Mobile (Swipe mode) | Swipe up/down/left/right | Tap & hold anywhere |
| Mobile (Button mode) | 4-way on-screen D-pad | Hold a D-pad button or the 💨 button |

Switch between Swipe and Button mode in **Settings**. Press `P` or `Esc` to pause.

## Run locally (computer + phone on the same Wi-Fi)
You need [Node.js](https://nodejs.org). Nothing has to be installed with npm, because the server has zero dependencies.
```bash
node server.js            # default port 8000
node server.js -p 8005    # pick your own port (also: --port 8005, PORT=8005)
npm start                 # same as node server.js
npm start -- -p 8005      # npm with a custom port
```
The server prints two kinds of address:
```
  💻 This computer:      http://localhost:8005
  📱 Phone (same Wi-Fi): http://192.168.x.x:8005
```
To play on your phone, open the **Phone** address in the phone's browser. If the phone can't connect:
- Make sure the phone and the computer are on the **same Wi-Fi network**. Guest networks often block devices from reaching each other.
- Allow the port through the computer's firewall. For example, on Ubuntu: `sudo ufw allow 8005/tcp`.
- If the port is busy, the server tells you so; run it again with another port (`-p 8006`).

> The game uses ES modules, so it has to be served over HTTP. Opening `index.html` directly with `file://` won't work. Any static server also works, for example `python3 -m http.server 8000`.

## 📲 Install as an app (PWA)
Slither 3D is a **Progressive Web App**: you can install it like a native app, and it **works offline**.

- **Android / Chrome / Edge (desktop or mobile):** tap **📲 Install app** on the main menu, or use the browser menu → *Install app*.
- **iPhone / iPad (Safari):** tap **Share ⬆️ → Add to Home Screen**. The Install button on the menu shows this hint.
- Once installed, the game opens full-screen with its own icon. After your first visit, every file (including Three.js and the font) is cached, so you can play with no internet.

> ⚠️ **Installing needs HTTPS** (or `localhost`). That works on **GitHub Pages** and on `http://localhost` on your computer.
> On your phone over Wi-Fi (`http://192.168.x.x:PORT`) the game **plays fine but can't be installed or cached offline**, because browsers only allow service workers on secure origins. To install on your phone, open the GitHub Pages link instead.

**Updating:** game files are fetched network-first, so players get your latest version whenever they're online. To wipe the old caches completely, bump `VERSION` in `sw.js`. If you add a new file, add it to the `CORE` list in `sw.js` as well.

## Deploy to GitHub Pages
1. Push this folder to a GitHub repository, on the `main` branch.
2. **Option A (Actions):** in the repo, go to **Settings → Pages → Source**, choose **GitHub Actions**, and the included `.github/workflows/pages.yml` deploys on every push.
   **Option B (branch):** in **Settings → Pages**, choose **Deploy from a branch → main → / (root)**.
3. Your game will be live at `https://<username>.github.io/<repo>/`.

## Project structure
```
server.js         local dev server (localhost + LAN, -p PORT)
sw.js             service worker (offline cache)
manifest.webmanifest  PWA manifest (name, icons, colors)
icons/            app icons (SVG source + PNG sizes, maskable, Apple touch)
index.html        page, menus, HUD (Three.js loaded from a CDN through an import map)
css/style.css     UI styling
js/main.js        app bootstrap, menus, HUD, save data
js/game.js        game engine: grid logic, fruits, enemies, camera, minimap, animation
js/levels.js      fruits, environment themes, levels
js/mapgen.js      terrain heights, rivers, bridges, roads, obstacle placement
js/world.js       builds the 3D world: terrain, water, bamboo fence, props, decor, torches/lights, weather
js/animals.js     harmless ambient wildlife (models + behaviour)
js/models.js      procedural 3D models (snake head, fruits, slimes, props, bridges)
js/input.js       keyboard / swipe / D-pad input with hold-to-sprint
js/audio.js       synthesized sound effects
js/fx.js          instanced particle system
```

## Customizing
- **Levels:** edit `LEVELS` in `js/levels.js`. Each level sets its environment, world size, apple target, special-fruit target, speed, enemy count and allowed fruits.
- **Environments:** add a theme to `THEMES` in `js/levels.js`. A theme sets colours, hills, rivers (`axis`, `pos`, `width`, number of `bridges`), roads, obstacles, decor, animals, and options such as `dark`, `fenceTorches`, `snowfall` or `fireflies`. Obstacle kinds live in `models.js` (with footprints in `mapgen.js`), and animal kinds in `animals.js`.
