#!/usr/bin/env bash
# Home Manager bring-up.
# Prompts for the two env values, writes .env.local, installs deps,
# and (optionally) deploys the static site to gh-pages.

set -euo pipefail

cd "$(dirname "$0")"

ENV_FILE=".env.local"
EXAMPLE_FILE=".env.example"

if [[ ! -f "$EXAMPLE_FILE" ]]; then
  echo "error: $EXAMPLE_FILE not found — run this from the project root" >&2
  exit 1
fi

prev_client_id=""
prev_apps_url=""
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  prev_client_id="$(grep -E '^VITE_GOOGLE_CLIENT_ID=' "$ENV_FILE" | head -n1 | cut -d= -f2- || true)"
  prev_apps_url="$(grep -E '^VITE_APPS_SCRIPT_URL=' "$ENV_FILE" | head -n1 | cut -d= -f2- || true)"
fi

prompt() {
  local label="$1" default="$2" answer
  if [[ -n "$default" ]]; then
    read -r -p "$label [$default]: " answer
    answer="${answer:-$default}"
  else
    read -r -p "$label: " answer
  fi
  printf '%s' "$answer"
}

confirm() {
  local label="$1" default="${2:-n}" answer prompt_str
  if [[ "$default" == "y" ]]; then prompt_str="[Y/n]"; else prompt_str="[y/N]"; fi
  read -r -p "$label $prompt_str " answer
  answer="${answer:-$default}"
  [[ "$answer" =~ ^[Yy]$ ]]
}

echo "Home Manager setup"
echo "------------------"
echo "Two values are baked into the build (they aren't secrets):"
echo "  VITE_GOOGLE_CLIENT_ID  — OAuth Web client ID from Google Cloud Console"
echo "  VITE_APPS_SCRIPT_URL   — /exec URL from your Apps Script web-app deployment"
echo

client_id="$(prompt "VITE_GOOGLE_CLIENT_ID" "$prev_client_id")"
apps_url="$(prompt "VITE_APPS_SCRIPT_URL"  "$prev_apps_url")"

if [[ -z "$client_id" || -z "$apps_url" ]]; then
  echo "error: both values are required" >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  if ! confirm "Overwrite existing $ENV_FILE?" "y"; then
    echo "skipped writing $ENV_FILE"
  else
    write_env=1
  fi
else
  write_env=1
fi

if [[ "${write_env:-0}" == "1" ]]; then
  cat > "$ENV_FILE" <<EOF
VITE_GOOGLE_CLIENT_ID=$client_id
VITE_APPS_SCRIPT_URL=$apps_url
EOF
  echo "wrote $ENV_FILE"
fi

if confirm "Run npm install now?" "y"; then
  npm install
fi

if confirm "Build and deploy to GitHub Pages now?" "n"; then
  npm run deploy
  echo
  echo "Deployed. If this is the first deploy, enable Pages on the gh-pages branch"
  echo "in the repo's Settings → Pages."
fi

echo
echo "Done. Next steps:"
echo "  npm run dev      — local dev at http://localhost:5173"
echo "  npm run build    — production build"
echo "  npm run deploy   — push dist/ to gh-pages"
