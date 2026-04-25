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

```bash
cd home-manager
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
├── src/
│   ├── api/             # client.ts (fetch wrapper) + hooks.ts (TanStack Query)
│   ├── auth/            # GoogleOAuthProvider + sign-in screen
│   ├── components/      # ui/, BottomNav, PageHeader
│   ├── tabs/            # Home, Leaves, Shopping, Calendar, Things
│   ├── lib/             # cn() helper
│   ├── App.tsx          # auth gate + routes
│   ├── main.tsx
│   ├── index.css
│   └── types.ts
├── index.html
├── vite.config.ts
└── package.json
```
