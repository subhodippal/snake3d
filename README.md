# 🐍 Slither 3D

A 3D snake game that runs in the browser. It is built with [Three.js](https://threejs.org) and plays on both **desktop and mobile**. It is a fully static site, so you can host it on **GitHub Pages** with no build step. It is also an **installable PWA** that works offline.

## Features
- **3 game modes**
  - **Adventure**: 10 levels, each on its own map. To clear a level you must eat a set number of 🍎 apples **and** ★ special fruits. You earn up to 3 stars per level, based on the health you have left.
  - **Endless**: no goal; the snake keeps speeding up. Pick any of the 10 maps.
  - **Time Attack**: 90 seconds to score as much as you can. Every apple adds 1.5 seconds.
- **10 maps**: Green Meadow, Desert Dunes, Frozen Lake, Autumn Forest, Sunny Beach, Lava Caverns, Candy Land, Neon City, Crystal Cave and Cosmic Void.
- **9 special fruits**

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
js/game.js        game engine: world, grid logic, fruits, enemies, camera, animation
js/levels.js      fruits, map themes, levels, map layouts
js/models.js      procedural 3D models (snake head, fruits, slimes, obstacles)
js/input.js       keyboard / swipe / D-pad input with hold-to-sprint
js/audio.js       synthesized sound effects
js/fx.js          instanced particle system
```

## Customizing
- **Levels:** edit `LEVELS` in `js/levels.js`. Each level sets its map, grid size, apple target, special-fruit target, speed, enemy count and allowed fruits.
- **Maps:** add a theme to `THEMES` and a layout `case` to `makeLayout()`.
