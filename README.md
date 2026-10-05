# 🐾 Cat TCG

A cat trading-card game that runs in the browser. Open card packs to collect cats, browse your collection, build a team of three, and battle the Owners (bosses).

Cat data comes from a shared cat API. If the API is unreachable, the site falls back to a bundled copy of the data, so it keeps working offline.

**Live site:** [https://cat-api-maxingthesequel.vercel.app]

---

## Features

### Home / Collection (`index.html`)
- **Open a Pack** to draw cats, with a flip-reveal animation and rarity-based sound effects.
- **Your Cats** collection grid with a progress bar and a rarity breakdown.
- **Card detail modal** styled like a trading card: rarity tag, role icon, name (species), image, stats, two moves, and a description.
- **Marquee** of cats on the home page.
- **API status LED** in the header.

### Battle (`battle.html`)
- **Boss lobby:** Owners ranging from Easy to Hard. Only **Easy** is playable right now; Medium and Hard are shown locked.
- **Team picker:** choose up to 3 unlocked cats. Tap order is deploy order, and tapping again deselects. Your team is saved between visits.
- **Turn-based fights:**
  - The first picked cat deploys automatically, and you move first.
  - Each cat has up to 5 treats, which moves spend. Benched cats regain 2 treats per Owner turn.
  - Damage is reduced by a percentage based on defense: `defense / (defense + 100)`.
  - Voluntary swaps cost your turn. Swaps forced by a fainted cat do not.
  - Running out of treats does not force a swap.
  - Cats have a role: **Heal**, **Damage**, or **Utility**. Heal moves ask you to pick a target.
  - Status effects include **Aftersmell** (poison: 10 damage per turn for 3 turns, 30% chance to proc, applies to the Owner) and **distract** moves that skip the Owner's next N turns. Refreshing a distract does not stack it.
  - **Gay Beam** is a single roll: 20% instant win, 10% instant loss, 70% nothing.
- **Battle presentation:** single-screen layout with the navbar hidden and an Exit button, HP bars, snack icons, event toasts, hit/heal/faint animations, and battle music and SFX.

### Site-wide
- **Responsive:** the header becomes a bottom tab bar on phones (below 768px).
- **Background music** with a volume slider under the header.
- **Persistent collection** saved in `localStorage`.
- **Offline fallback:** if the API fails, data loads from `cache/cats.json`.
- Respects `prefers-reduced-motion` and has visible keyboard focus rings.

---

## Tech stack

- Plain HTML, CSS, and JavaScript, with no framework and no bundler.
- [Tailwind CSS](https://tailwindcss.com/) via CDN, with an inline config on each page.
- A small `custom.css` for the marquee, 3D card flip, modal transitions, tooltips, icon masks, and shared utility classes (`hover-lift`, `btn-press`, `badge-ribbon`, `btn-sheen`).
- Deployed on **Vercel**.

---

## Project structure

```
/
├── index.html          Home + collection page
├── battle.html         Boss lobby + battle screen
├── custom.css          Custom styles on top of Tailwind
├── cards.js            Card stats, rarity, roles, moves, pack drawing, collection and team storage
├── shared.js           Data fetching (API + fallback), card tile markup, detail modal, icon helper
├── app.js              Home page logic (pack opening, collection rendering)
├── owners.js           OWNERS table (bosses and their combat stats)
├── battle.js           Battle lobby, team slots, team picker
├── battle-engine.js    Turn loop, move resolution, battle-screen rendering and animations
├── audio.js            Background music and volume control
├── collection.js       Legacy, believed unused (see Known issues)
├── cache/
│   └── cats.json       Bundled fallback copy of the cat API data
├── icons/              Role and stat icons (PNG)
├── images/             Boss images, e.g. betit.jpg
└── sfx/                Music and sound effects
```

---

## Running locally

The site needs to be **served**, not opened by double-clicking `index.html`. Opening it as a `file://` URL can break `fetch()` calls and CSS mask-image icons.

Any static server works:

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then open `http://localhost:8000`.

---

## Deployment (Vercel)

The site is a static frontend deployed on Vercel. A build-time script refreshes `cache/cats.json` from the API on each deploy, so the offline fallback stays current.

- Vercel's filesystem is **case-sensitive**. File names must match their references exactly (`Attack.png` is not `attack.png`), or assets will 404 once deployed even though they work locally.
- Make sure `icons/`, `images/`, and `sfx/` are committed and not excluded by `.gitignore`.

---

## How it works

**Cards.** Each cat's stats and rarity are generated deterministically from its ID using a seeded PRNG (`mulberry32`), so a given cat is always the same card. Moves and roles are hand-authored in `CUSTOM_MOVES` and `CUSTOM_ROLES` in `cards.js`. Tunable values live in the customization zone at the top of that file.

**Storage.** The collection is stored in `localStorage` (`getCollection`, `saveCollection`, `hasCard`, `unlockCard`). The battle team is stored under `catTCG_battleTeam` (max 3). This is intended to move to a real backend later.

**Data loading.** `shared.js` fetches cats from the API. If that fails, it loads `cache/cats.json`.

**Icons.** Icons are rendered as `currentColor`-tinted CSS masks, set inline by `iconHTML()` in `shared.js`. The `.icon` class in `custom.css` must keep `mask-image`, `background-color: currentColor`, and `mask-size: contain`, otherwise icons vanish silently with no console error.

---

## Customizing

- **Add or change a boss:** edit the `OWNERS` table in `owners.js`. Medium and Hard currently have `null` combat stats and stay locked.
- **Change cat moves or roles:** edit `CUSTOM_MOVES` and `CUSTOM_ROLES` in `cards.js` (keyed by cat ID; the name comments beside each key make the tables readable).
- **Tune battle balance:** `BATTLE_CONFIG` and `MOVE_EFFECTS` in `battle-engine.js`.
- **Adjust toast speed:** `eventDisplayMs` in `battle-engine.js`.

---

## Known issues and to-do

> Recent changes (mobile layout, bug fix, visual passes) were syntax-checked but **not tested in a live browser**. Please click through the site before relying on them.

- **Icons not loading** for some setups. This was never diagnosed. Check the DevTools console and network tab, file name casing, and that `icons/` was deployed.
- **Hover vs. hit animation:** `.hover-lift` on the active battle card and the hit animations on its outer wrapper are meant to be independent, but this is untested.
- **Long boss names** can run under the Play button in `bossPillHTML` (`battle.js`). Add `pr-10` to the name element if needed.
- **Battle gaps:** Medium and Hard bosses have no stats, there are no rewards for winning, there is no volume control on the battle screen, and Catnip Distribution has nothing to cleanse yet.
- **Open questions from the offline-cache work:** confirm the deploy target, check the build log for the "refreshed with N cats" message, and test offline image loading.

---

## Credits

Cat data from the shared cat API. Built as a course project.
