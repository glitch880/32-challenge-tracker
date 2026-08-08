# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A single-page Firebase app tracking the Commander "32 Challenge" — one deck per color identity. Static files, no build step, no dependencies; `index.html` opens directly from disk.

## Commands

```bash
node --test                                    # whole suite (logic + repo-integrity checks)
node --test --test-name-pattern='wilsonLower'  # single test by name
node stamp.js                                  # re-stamp index.html after editing config.js or logic.js
node stamp.js --check                          # exit 1 if a stamp is stale
git config core.hooksPath .githooks            # once per clone: auto-stamps on commit
```

CI (`.github/workflows/ci.yml`) runs only `node --test` on Node 22. There is no lint, no build, no package.json.

## Cache stamps — read this before editing config.js or logic.js

`index.html` loads them as `config.js?v=<hash>` / `logic.js?v=<hash>`. The query strings are sha256 prefixes written by `stamp.js`. They exist because `index.html` and its scripts are separately-cached URLs: without them a browser can pair a fresh `index.html` with a stale script, and the page fails silently (this shipped once — the win-rate board rendered blank).

**Edit `config.js` or `logic.js` → run `node stamp.js` → commit `index.html` in the same change.** `node --test` fails on a stale stamp, so CI catches it, but the hook or a manual run avoids the round trip. Never hand-edit a `?v=` value. Adding a third local script means adding it to `STAMPED` in [stamp.js](stamp.js:27) as well as to `index.html`.

`.gitattributes` pins every file to LF in the working tree. That is load-bearing, not cosmetic: `stamp.js` hashes the bytes on disk, so a CRLF checkout on Windows would produce stamps Linux CI can never match — and re-stamping to "fix" the mismatch would ship exactly the skew the stamper exists to prevent. Don't relax it.

## Architecture

Three-way split, deliberate:

- **[logic.js](logic.js)** — pure functions and the `IDENTITIES` table. No DOM, no Firebase, no `fetch`. This is the only testable layer, so **new logic belongs here**, not inline in `index.html`.
- **[config.js](config.js)** — everything you'd change to point at a different Firebase project. Committed on purpose; a Firebase web config identifies a project, it doesn't grant access to one. The passphrase is never in the repo.
- **[index.html](index.html)** — all DOM, Firebase wiring, Scryfall calls, and CSS in one file.

`config.js` and `logic.js` are loaded *both* as plain `<script>` tags and via `require()` from [test.js](test.js), using the `if (typeof module !== 'undefined') module.exports = …` idiom at the foot of each. Consequences: no ESM syntax in either file, and anything new that `index.html` uses must be added to that `module.exports` list.

`index.html`'s `checkScripts()` names every symbol it expects from the two scripts so a stale-cache load reports which one is missing instead of dying quietly. **Add new exported symbols to that list** ([index.html](index.html:272)) — a symbol that is exported and used but unlisted is invisible to exactly the failure the check exists to catch.

Views: `current === null` renders the summary (two boards, `BOARDS`); otherwise that person's page, which itself toggles between **Sheet** and **Art** (`VIEWS`, `renderSheet()` / `renderArt()`).

## Firebase data model

Root ref is `challenge`. Seven parallel sibling nodes — `people` keyed by pushId, the rest by `pushId → rowId`:

```
challenge/people/<pid>          = "Ann"           (name)
challenge/entries/<pid>/<rowId> = "Atraxa…"       (commander — the Oracle name)
challenge/stats/<pid>/<rowId>   = {w, l}
challenge/tags/<pid>/<rowId>    = "poison…"       (free-text description)
challenge/locks/<pid>/<rowId>   = true            (absent = unlocked)
challenge/prints/<pid>/<rowId>  = {id, name, set} (pinned printing — art only)
challenge/links/<pid>/<rowId>   = "https://…"     (decklist URL, normalised by safeUrl)
```

`rowId` is an identity id from `IDENTITIES` (`'gwu'`, `'c'`, `'wubrg'`). Per-person nodes are separate so two people editing at once never clobber each other. **A new per-deck field means another sibling node — and it must also be deleted in `removePerson()`, which removes each node by hand** ([index.html](index.html:724)).

Auth is one shared account (`CONFIG.sharedEmail`) whose password is the group passphrase; `database.rules.json` grants read+write to any authenticated user. There is no per-user permission model.

## Rules that hold across the code

- **"Built" deck = row locked AND commander non-empty.** Enforced in both `tally()` and `winRateBoard()`; keep them in agreement.
- **Two boards answer different questions.** `leaderboard()` ranks players by decks built (never by win rate); `winRateBoard()` ranks decks by `wilsonLower()`, displaying the raw `pct` but sorting on the discounted bound, with `score === null` (no games) parked below a genuine 0%.
- **The Oracle name is authoritative.** `entries` stores the Oracle name and nothing else; pinning a printing changes the *art only*, so `tally()` and `winRateBoard()` keep operating on one stable string with nothing to migrate. Writing a reskin's printed name into `entries` would break both boards silently. A reskin's own name comes from `printInfo()` and is display-only — it appears on the picker tile and in the slot tooltip, never in the caption and never in `entries`. `printInfo()` reads `flavor_name` before `printed_name`, because Scryfall uses them for different reskin shapes and reading one misses half of them.
- **Scryfall query syntax lives in `logic.js`, not at the call sites** — `commanderQuery()` (autocomplete) and `printsQuery()` (exact-name match; the caller adds `&unique=prints`) build the `q=` payload, and `imageUrl()` builds card-image URLs, choosing pinned id vs. fuzzy name. The two `/cards/search` endpoint URLs are assembled inline where they're fetched ([index.html](index.html:255), [:523](index.html:523)); the query *syntax* is what must not be re-derived there. The worked example: `commanderQuery` uses `id=` (exact), never `id<=`, because subset matching lets mono cards into a 3-color row.
- **Re-render guards are load-bearing.** `root.on('value')` fires on every remote edit, so both per-person views re-render constantly: they rebuild DOM only when the person changed — `builtFor` for `renderSheet()`, `artFor` for `renderArt()` ([index.html](index.html:574)) — and `renderArt()` assigns `img.src` only when the URL actually changed ([index.html](index.html:628)) — without that, each snapshot re-requests all 32 images. Field values also skip `document.activeElement`, so a live update can't yank the cursor out of what someone is typing.
- **Player-supplied text goes in via `textContent`, never `innerHTML`.** Commander names, player names, and descriptions are untrusted input on a sheet everyone shares. A URL is the sharper case: `safeUrl()` is the only thing allowed to produce an `href`, and it returns `null` for anything that isn't `http:`/`https:` — a `javascript:` URL in an `href` executes on click. It runs at save *and* at render, so a value stored before the check existed can't become clickable later.
- **The mobile `@media (max-width:640px)` block must stay last in `<style>`.** Media queries add no specificity; an equally-specific rule later in the file silently wins (that bug shipped once).
- `// ponytail:` comments mark deliberate simplifications — a known ceiling, not an oversight.
