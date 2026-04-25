# Apps Script backend

This folder contains the Google Apps Script web app that fronts the Google Sheet "database".

## Files

- `Code.gs` — router, auth, CRUD handlers, Home aggregation.
- `appsscript.json` — manifest (timezone, OAuth scopes, web app config).

## One-time setup

### 1. Create the Google Sheet

Create a new Google Sheet and add these tabs with these exact header rows:

**`users`**
| email | name | role |

Seed two rows for the two allowed accounts (role = `admin` or `user`).

**`leaves`**
| id | person | shift | date | type | notes | created_by | created_at |

`person` ∈ `maid` / `cook`. `shift` ∈ `morning` / `evening` / `both` / `-`. `type` ∈ `leave` / `partial` / `present`.

**`shopping`**
| id | item | qty | status | added_by | added_at | done_by | done_at |

**`calendar`**
| id | title | start | end | all_day | location | notes | created_by | created_at |

**`things`**
| id | label | value | category | updated_by | updated_at |

Copy the spreadsheet ID from the URL (`/spreadsheets/d/<SHEET_ID>/edit`).

### 2. Create OAuth Web Client ID

In Google Cloud Console → APIs & Services → Credentials:

- Create OAuth client ID, application type **Web application**.
- Authorized JavaScript origins: `https://<github-username>.github.io` (and `http://localhost:5173` for dev).
- Copy the **Client ID** — you'll need it in two places: the React app (`VITE_GOOGLE_CLIENT_ID`) and the Apps Script `ALLOWED_AUD` property.

### 3. Deploy the Apps Script

Easiest path is the web UI:

1. Open https://script.google.com → New project.
2. Replace the default `Code.gs` with the contents of this folder's `Code.gs`.
3. View → Show project manifest, then paste in `appsscript.json`.
4. Project Settings (gear icon) → Script properties → add:
   - `SHEET_ID` = the spreadsheet ID from step 1.
   - `ALLOWED_AUD` = the OAuth Client ID from step 2.
5. Deploy → New deployment → Type: **Web app**:
   - Execute as: **Me**.
   - Who has access: **Anyone** (auth is enforced inside the script via the ID token check).
6. Copy the `/exec` URL — you'll set it as `VITE_APPS_SCRIPT_URL` in the React app.

You'll be asked to authorize the script the first time (it needs Sheets + UrlFetch).

### Re-deploying

After editing `Code.gs`, click Deploy → Manage deployments → pencil icon → Version: **New version** → Deploy. The same `/exec` URL keeps working.

## Optional: clasp

If you prefer CLI, the project root has a `.clasp.json.example`:

```bash
npm i -g @google/clasp     # one-time
clasp login                # one-time

# Either bind to an existing Apps Script project (recommended, keeps the same /exec URL):
cp .clasp.json.example .clasp.json
# paste the script ID from script.google.com → Project Settings → IDs → Script ID

# …or create a fresh project:
clasp create --type webapp --rootDir apps-script

# From then on:
npm run script:push        # push current apps-script/ to the Head deployment
npm run deploy:script      # push + create a new versioned deployment
```

`.clasp.json` and `.clasprc.json` are gitignored — the script ID is bound to
your Google account.
