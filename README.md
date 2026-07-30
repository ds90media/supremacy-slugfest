# The Supremacy Slugfest 🏌️
**Strokes & Slams vs The Brown Bowl** — live Ryder Cup–style scoring app.

Golden Eagle Golf Club, Pitt Meadows BC — Round 1 on the North Course, Round 2 on the South Course, playing the Blue Tees.

---

## What's in here

| File | Purpose |
|---|---|
| `index.html` / `dashboard.js` | Live leaderboard homepage (the "Race to 18.5" gauge, live + completed matches) |
| `match.html` / `matchpage.js` | Individual match page — hole-by-hole score entry, anyone with the link can enter scores |
| `admin.html` / `adminpage.js` | Admin control — roster, dynamic match creation, match management, round control |
| `scoring.js` | Pure match-play scoring engine (front 9 / back 9 / overall 18, up/dormie/won-X&Y logic) |
| `courses.js` | Par & yardage for both Golden Eagle courses, Blue Tees |
| `firebase.js` | Firebase project connection + Firestore read/write helpers |
| `style.css` | Shared design system (dark + gold broadcast look) |

No login system, no build step — open `index.html` in a browser once Firebase is wired up.

---

## 1. Create your Firebase project (~5 minutes)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Add project**. Name it something like `supremacy-slugfest`.
2. You can skip Google Analytics — not needed here.
3. Once the project is created, click the **`</>`** (web) icon to register a new web app. Name it anything (e.g. "Slugfest Web").
4. Firebase will show you a `firebaseConfig` object that looks like this:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "supremacy-slugfest.firebaseapp.com",
  projectId: "supremacy-slugfest",
  storageBucket: "supremacy-slugfest.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

5. Copy that whole object into **`firebase.js`**, replacing the placeholder `firebaseConfig` near the top of the file.

## 2. Turn on Firestore

1. In the Firebase console, go to **Build → Firestore Database → Create database**.
2. Choose **Start in test mode** for now (fastest way to get playing this weekend). Pick any region close to you (e.g. `us-west1` / `northamerica-northeast1`).
3. Test mode allows open read/write for 30 days, which is fine for a private trip with no logins. If you want it locked down before/after the trip, go to the **Rules** tab and use something like:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2026, 8, 15);
    }
  }
}
```
(adjust the cutoff date to just after your tournament — after that, the app becomes read-only/inaccessible until you update the rules again).

That's it — no collections to create manually. The app creates `players`, `matches`, and `tournament/state` automatically the first time you use the admin page.

## 3. Run it locally to test

Any static file server works, e.g. from this folder:

```bash
npx serve .
```

or in VS Code, use the "Live Server" extension. Open the printed `localhost` URL, click into **Admin**, add your rosters, and create a test match.

> Opening `index.html` directly as a `file://` URL will *not* work — ES module imports require it to be served over http(s).

## 4. Deploy so the group can use it on their phones

### Option A — Vercel (recommended, zero config)
1. Push this folder to a new GitHub repo.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Leave all build settings blank (it's a static site) → **Deploy**.
4. You'll get a URL like `supremacy-slugfest.vercel.app` — share that link with the group.

### Option B — GitHub Pages
1. Push this folder to a GitHub repo.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set Source to **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Save — your site will be live at `https://<username>.github.io/<repo-name>/` within a minute or two.

Either way, put the live URL in your group chat before the round starts. Bookmark the `admin.html` link separately (only share that with whoever's running the boards).

---

## Password-protecting the site

Every page (`index.html`, `match.html`, `admin.html`) is behind a shared password screen, powered by `gate.js`. Open `gate.js` and change this line to whatever you want the group to use:

```js
const PASSWORD = "slugfest2026";
```

Once someone enters it correctly on any page, their browser remembers it (via `localStorage`) so they won't be asked again on that device.

**Important:** this is a casual deterrent, not real security. The password lives in plain text in `gate.js`, which is publicly downloadable from your deployed site — anyone who opens their browser's dev tools or views the page source can read it. It's enough to keep search engines and randoms who don't know it exists from wandering onto your live scores; it won't stop someone who's determined to look. Don't reuse a password you care about elsewhere.

## How the scoring works

- **Front 9 (holes 1–9)** and **Back 9 (holes 10–18)** are each a self-contained match-play segment worth **1 point**. A segment can close out early ("Won 3&2") the moment the trailing team can't mathematically catch up — the app checks this after every hole.
- **Overall 18** is gross scramble strokes summed across all 18 holes — lowest total wins the 3rd point, once all 18 are entered.
- Ties in any category split **0.5 / 0.5**.
- **3 points per match → 18 points per round (6 matches) → 36 points for the tournament.**
- First team to **18.5** wins outright.
- The homepage gauge shows both teams' live cumulative totals racing toward that 18.5 line — points post the instant a segment is decided, even mid-round.

## Using it on tournament day

1. **Before play:** open **Admin → Roster**, add all 24 names to the correct team.
2. **Right before each match tees off:** **Admin → Create Match**, pick the round, pick the two pairings. The dropdowns automatically hide anyone already in an active match that round.
3. **During play:** anyone can open that match's link (from the homepage) and tap in strokes hole by hole on their phone — no login, saves instantly, everyone watching the homepage sees it update live.
4. **Between rounds:** **Admin → Rounds** to mark Round 1 complete and start Round 2 (auto-switches the course/par shown on new matches to the South Course).
5. **At the finish:** once a team crosses 18.5, the homepage shows a winner banner automatically. Hit **Finalize Tournament** in Admin to lock it in as final.

## What's next (Version 2 ideas, not built yet)

The brief mentioned these — happy to build them once V1 has been tournament-tested:
- Tournament history page (Supremacy Slugfest I, II, III…)
- Team / player / partnership statistics (records, points per pairing, etc.)
- Photo/logo customization once you send assets

## A note on the admin link

There's no password on `admin.html` — anyone with that specific URL can create matches, edit rosters, or delete matches. It's not indexed or guessable, but treat the link the way you'd treat a shared Google Doc: only send it to whoever's actually running the boards, and share the `index.html` (or your deployed root URL) with the rest of the group for viewing/scoring.
