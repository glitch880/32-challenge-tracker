# 32 Challenge Tracker

A shared, live-updating tracker for the Commander **32 Challenge** — one deck per color identity (5 mono + 10 two-color + 10 three-color + 5 four-color + 1 five-color + 1 colorless). It's a single static HTML page backed by Firebase Realtime Database, so everyone with the link edits the same sheet in real time.

**Live site:** https://glitch880.github.io/32-challenge-tracker/

## How to use
1. Open the link and enter the shared passphrase.
2. Pick your name tab, or **+ add person** to create one.
3. For each color identity, type the commander you're running and track wins/losses with the **W** / **L** fields.
4. Everything saves automatically and syncs live for everyone on the link — each person has their own tab, so edits never clobber each other.

## Features
- **Win / loss counters** per deck (per person).
- **Free-text notes** per deck — a description/tags line under each commander (e.g. "poison proliferate"), saved and synced.
- **Commander autocomplete** — type to pick from a live [Scryfall](https://scryfall.com/) list of legal commanders; hover a filled-in name to preview the card art.
- **Real mana symbols** for each color identity (via the [`mana-font`](https://mana.andrewgioia.com/) webfont).
- **Live multi-person sync** — shared instantly across everyone with the link.

## Run your own
Want your own copy? It's one static file (`index.html`) plus the DB rules (`database.rules.json`):
1. Create a Firebase project with a **Realtime Database**.
2. Paste its `firebaseConfig` over the placeholder near the top of `index.html`.
3. Publish `database.rules.json` in **Realtime Database → Rules** (requires an authenticated user).
4. Enable **Email/Password** auth and add one shared user: email = `SHARED_EMAIL` (top of `index.html`), password = your chosen passphrase. Share the passphrase out of band — it's never committed.
5. Host the file anywhere static (e.g. GitHub Pages: **Settings → Pages → Deploy from a branch**, `main` / root).

> The Firebase config in `index.html` is public by design (every Firebase web app ships it to the browser). Your data is protected by the rules + the shared passphrase, not by hiding the config.

## Ideas to add later
- **Deck tags per deck** — multi-select archetype tags (mill, voltron, aristocrats, …). Note: Scryfall has no archetype-tag API (those live in the unsupported Tagger project), so this would be a curated list or free-form tags, not a Scryfall pull.
- Lock a deck once it's built
- Export the whole thing to a printable sheet like the original image
