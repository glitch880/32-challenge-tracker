# 32 Challenge Tracker

A shared, live-updating tracker for the Commander **32 Challenge** — one deck per color identity (5 mono + 10 two-color + 10 three-color + 5 four-color + 1 five-color + 1 colorless). Static HTML + Firebase Realtime Database, hosted free on GitHub Pages.

## Files
- `index.html` — the whole app. The only thing you edit by hand is the `firebaseConfig` block near the top.

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
In **Realtime Database → Rules**, paste this and **Publish**:

```json
{
  "rules": {
    "challenge": {
      ".read": true,
      ".write": true
    }
  }
}
```

> ⚠️ **Tradeoff, be honest with yourself here:** these rules are open — anyone who has your `databaseURL` can read and write the `challenge` data. That's fine for a small trusted pod and keeps things zero-friction. If you ever want it locked down, options are: turn on **Anonymous Auth** and require `auth != null`, or gate writes behind a shared passphrase. Ask Claude Code to add that if you want it.

### 4. Test locally
Open `index.html` in a browser. You should see the pips and be able to add a person and type — the status line flips to `saved ✓`. Open it in a second tab to confirm edits sync live.

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

## Ideas to add later
- Win / loss / games-played counters per deck
- Lock a deck once it's built
- Export the whole thing to a printable sheet like the original image
