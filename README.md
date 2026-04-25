# Home Manager

Mobile-first PWA-ish web app for two people to coordinate household life. Five tabs:

1. **Home** — what's happening today and tomorrow.
2. **Leaves** — track maid + cook (two shifts) leaves.
3. **Shopping** — shared shopping list.
4. **Calendar** — shared events/tasks both people should see.
5. **Things to remember** — free-form notes (gas no., bill nos., Wi-Fi password…).

Database is a **Google Sheet**; backend is a **Google Apps Script web app**; frontend is a **React + Vite static site** hosted on **GitHub Pages**.

## Architecture

```
[Mobile browser]
   ↓  Google Sign-In → ID token (JWT)
[React + Vite static site]
   ↓  fetch(POST, body: { idToken, action, tab, data })
[Apps Script web app]
   ↓  verifies token → checks email allowlist → reads/writes sheet
[Google Sheet]
```

- No service account credentials. Apps Script runs as the sheet owner.
- Two-email allowlist enforced inside the script (via the `users` tab).
- Token is stored in `localStorage`; auto-expires every ~1 hour and prompts re-sign-in.

## Setup

### 1. Backend (Sheet + Apps Script)

Follow `apps-script/README.md`. You'll end up with:
- A spreadsheet with 5 tabs (`users`, `leaves`, `shopping`, `calendar`, `things`).
- An OAuth Web Client ID.
- A deployed Apps Script `/exec` URL.

### 2. Frontend (this folder)

Quickest path:

```bash
./setup.sh
```

Prompts for the two env values, writes `.env.local`, runs `npm install`, and
optionally deploys to GitHub Pages. Re-runnable — it preserves existing
values as defaults.

Manual path is the same thing by hand:

```bash
cp .env.example .env.local
# Fill in:
#   VITE_GOOGLE_CLIENT_ID  ← from the Google Cloud OAuth client
#   VITE_APPS_SCRIPT_URL   ← from the Apps Script deployment

npm install
npm run dev
```

Open `http://localhost:5173`. Sign in with one of the allowlisted Google accounts.

### 3. Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `home-manager`) and push this folder as its root.
2. Add `https://<your-username>.github.io` to the OAuth client's **Authorized JavaScript origins**.
3. The `vite.config.ts` `base` is set to `/home-manager/` — adjust if your repo name differs.
4. Deploy:

   ```bash
   npm run deploy
   ```

   This runs `vite build` and pushes `dist/` to the `gh-pages` branch.

Live URL: `https://<your-username>.github.io/home-manager/`.

### 4. Deploy Apps Script changes (optional, via clasp)

The web UI flow in `apps-script/README.md` always works. If you'd rather push
from CLI:

```bash
npm install -g @google/clasp   # one-time
clasp login                    # one-time
cp .clasp.json.example .clasp.json
# Edit .clasp.json — paste the script ID (from script.google.com → Project Settings)

npm run deploy:script          # clasp push + clasp deploy (creates a new versioned deployment)
# Or just push to the head, no new deployment:
npm run script:push
```

`.clasp.json` is gitignored because the script ID is per-environment.

> The OAuth client ID and Apps Script URL are baked into the build at compile time. They aren't secrets — the Apps Script verifies the ID token and email allowlist on every request.

## Tech

- React 18 + Vite + TypeScript
- TanStack Query (cache + optimistic updates)
- shadcn-style primitives over Radix UI + Tailwind CSS
- react-hook-form for forms
- @react-oauth/google for Google Sign-In (ID token)
- date-fns for date formatting
- gh-pages for deploy

## Project structure

```
home-manager/
├── apps-script/         # Apps Script backend (deployed separately)
├── public/              # static assets copied verbatim into dist/
│   ├── icon.svg         # vector source — also used by manifest + favicon
│   ├── icon-192.png     # PWA icons (Android)
│   ├── icon-512.png
│   ├── apple-touch-icon.png
│   ├── manifest.webmanifest
│   └── sw.js            # service worker (offline app shell)
├── scripts/
│   └── generate-icons.py  # rasterizes PNG icons from the design (Pillow)
├── src/
│   ├── api/             # client.ts (fetch wrapper) + hooks.ts (TanStack Query)
│   ├── auth/            # GoogleOAuthProvider + sign-in screen
│   ├── components/      # ui/, BottomNav, PageHeader
│   ├── tabs/            # Home, Leaves, Shopping, Calendar, Things
│   ├── lib/             # cn() helper
│   ├── App.tsx          # auth gate + routes
│   ├── main.tsx
│   ├── registerSW.ts    # registers the service worker in production
│   ├── index.css
│   └── types.ts
├── setup.sh             # bring-up: prompts env, installs, optional deploy
├── index.html
├── vite.config.ts
└── package.json
```

## PWA / install to home screen

The app ships with a manifest and a service worker that pre-caches the app
shell, so it installs to the home screen on iOS and Android and works when
offline (read-only — mutations need network for Apps Script).

To redesign the icon, edit `public/icon.svg` and update the matching shapes
in `scripts/generate-icons.py`, then run `npm run icons` (requires
`pip install Pillow`).

The service worker only registers in production builds. After a redeploy,
clients pick up new bundle hashes via network-first navigation; old cached
assets become orphans and don't get served.
