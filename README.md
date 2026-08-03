# 32 Deck Commander Challenge Tracker

A shared, live-updating tracker for the Commander **32 Challenge** — one deck per color identity (5 mono + 10 two-color + 10 three-color + 5 four-color + 1 five-color + 1 colorless). It's backed by Firebase Realtime Database, so everyone with the link edits the same sheet in real time.

**Live site:** https://glitch880.github.io/32-challenge-tracker/

## How to use
1. Open the link and enter the shared passphrase.
2. Pick your name tab, or **+ add person** to create one.
3. For each color identity, type the commander you're running and track wins/losses with the **W** / **L** fields.
4. Everything saves automatically and syncs live for everyone on the link — each person has their own tab, so edits never clobber each other.

## Features
- **Summary page** — the landing view, with two boards behind a toggle:
  - **Decks built** — one row per player, ranked by progress through the 32, with a progress bar and their overall W/L. A deck counts once its row is **locked** and names a commander.
  - **Win rate** — one row per player *per deck*, showing the commander and its record, so you can see which builds actually perform. Only built (locked + named) decks appear. Rows show the raw win rate but are **ranked by the lower bound of the [Wilson score interval](https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval#Wilson_score_interval)** at 95% confidence — a deck at 1–0 shows 100% but scores below one at 5–1, because one game is not evidence. Hover a row to see its rank score. A deck with no games yet shows `—` and sits at the bottom rather than counting as 0%.

  Clicking any row on either board opens that player's sheet.
- **Win / loss counters** per deck (per person).
- **Free-text notes** per deck — a description/tags line under each commander (e.g. "poison proliferate"), saved and synced.
- **Lock a row** — freeze a built deck's commander + description (read-only); W/L stay editable.
- **Safe removal** — deleting a player lives at the foot of their own sheet, not as a ✕ on the tab, so it can't be hit by accident.
- **Commander autocomplete** — type to pick from a live [Scryfall](https://scryfall.com/) list of legal commanders, filtered to that row's exact color identity; hover a filled-in name to preview the card art.
- **Real mana symbols** for each color identity (via the [`mana-font`](https://mana.andrewgioia.com/) webfont).
- **Light / dark theme** — follows your OS automatically (`prefers-color-scheme`), on a soft CSS-generated background instead of stark white.
- **Live multi-person sync** — shared instantly across everyone with the link.

## Run your own
Want your own copy? It's two static files (`index.html` + `logic.js`, no build step) plus the DB rules (`database.rules.json`):
1. Create a Firebase project with a **Realtime Database**.
2. Paste its `firebaseConfig` over the placeholder near the top of `index.html`.
3. Publish `database.rules.json` in **Realtime Database → Rules** (requires an authenticated user).
4. Enable **Email/Password** auth and add one shared user: email = `SHARED_EMAIL` (top of `index.html`), password = your chosen passphrase. Share the passphrase out of band — it's never committed.
5. Host the file anywhere static (e.g. GitHub Pages: **Settings → Pages → Deploy from a branch**, `main` / root).

> The Firebase config in `index.html` is public by design (every Firebase web app ships it to the browser). Your data is protected by the rules + the shared passphrase, not by hiding the config.

## Tests
The pure logic (deck tallying, win %, both boards' ordering, Scryfall query building, the 32-identity table) lives in `logic.js` and is covered by `test.js`. No dependencies — Node's built-in test runner:

```bash
node --test
```

## Ideas to add later
- **Deck tags per deck** — multi-select archetype tags (mill, voltron, aristocrats, …). Note: Scryfall has no archetype-tag API (those live in the unsupported Tagger project), so this would be a curated list or free-form tags, not a Scryfall pull.
- Export the whole thing to a printable sheet like the original image
- When adding a new person, make them also add a passkey that they need to unlock their page so only those with the passkey can edit. 
- Support for partner / Background
