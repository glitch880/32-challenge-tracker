# 32 Challenge Tracker

A shared, live-updating tracker for the Commander **32 Challenge** — one deck per color identity (5 mono + 10 two-color + 10 three-color + 5 four-color + 1 five-color + 1 colorless). Static HTML + Firebase Realtime Database, hosted free on GitHub Pages.

## Files
- `index.html` — the whole app. The only thing you edit by hand is the `firebaseConfig` block near the top (and, optionally, `SHARED_EMAIL` just below it).
- `database.rules.json` — the Realtime Database security rules to paste into the Firebase console (step 3).

## Setup

### 1. Create the Firebase project
1. Go to https://console.firebase.google.com and click **Add project** (any name, e.g. `commander-32`). Google Analytics is optional — skip it.
2. In the left sidebar: **Build → Realtime Database → Create Database**.
3. Pick a location, then choose **Start in test mode** for now (we'll set proper rules in step 3).

### 2. Get your config and paste it in
1. Project **Settings** (gear icon, top-left) → scroll to **Your apps** → click the **Web** icon (`</>`).
2. Register the app (nickname only, no hosting needed). Copy the `firebaseConfig` object it shows you.
3. Paste it over the placeholder `firebaseConfig` at the top of `index.html`. The important field for this app is `databaseURL` — make sure it's present.

### 3. Set database rules
In **Realtime Database → Rules**, paste the contents of [`database.rules.json`](database.rules.json) and **Publish**:

```json
{
  "rules": {
    "challenge": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

These rules require an authenticated user, so only people who know the shared passphrase (step 4) can read or write the `challenge` data.

### 4. Set up the shared passphrase
The app is gated behind a single shared Firebase account. The passphrase is that account's password — Firebase validates it server-side, and it never lives in this repo or in `index.html`.

1. In the console: **Build → Authentication → Get started**, then **Sign-in method → Email/Password → Enable**.
2. **Authentication → Users → Add user**. Use the email that matches `SHARED_EMAIL` near the top of `index.html` (default `pod@32challenge.local`) and set the **password** to whatever passphrase you want the pod to use.
3. Share that passphrase with your pals **out of band** (chat, in person) — not in the repo.

> ⚠️ **Be honest about what's protected:** the Firebase *config* in `index.html` is not a secret — every Firebase web app ships it to the browser, so it's always visible in the deployed page. That's expected. Your actual protection is the rules above + the shared account: without the passphrase, no one can authenticate, so no one can read or write your data. The passphrase itself is never committed.

### 5. Test locally
Serve `index.html` over `localhost` (e.g. `python -m http.server`) rather than opening the file directly — Firebase Auth needs an http(s) origin, and `localhost` is an authorized domain by default. You should see a **passphrase prompt**; enter the shared passphrase to unlock the sheet, then add a person and type — the status line flips to `saved ✓`. Open a second tab to confirm edits sync live.

## Deploy to GitHub Pages
1. Create a new GitHub repo (public is simplest for free Pages) and push `index.html` to it.
2. Repo **Settings → Pages**.
3. Under **Build and deployment**, set **Source: Deploy from a branch**, branch **main**, folder **/ (root)**. Save.
4. Wait ~1 minute. Your site goes live at `https://<your-username>.github.io/<repo-name>/`.
5. Share that URL with your pals — they all edit the same list.

## Notes
- **No build step.** It's one static file pulling Firebase from a CDN, so GitHub Pages serves it as-is.
- **Free tier** is way more than enough for a friend group (Firebase's free plan covers this easily).
- Each person gets their own tab; edits to different tabs never clobber each other.

## Features
- **Win / loss counters per deck** — each row has W and L number fields; **Games Played is derived as W + L** (not stored separately). Stored per person under `challenge/stats/<personId>/<rowId>`.

## Ideas to add later
- Lock a deck once it's built
- Export the whole thing to a printable sheet like the original image
