#!/usr/bin/env bash
# Create a GitHub repo (if needed) and push main. Requires: git, gh auth login
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REPO_NAME="${1:-HomePageSite}"
VISIBILITY="${2:-public}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: sudo apt install gh   then: gh auth login"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Run: gh auth login"
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "Remote origin already set: $(git remote get-url origin)"
else
  gh repo create "$REPO_NAME" --"$VISIBILITY" --source=. --remote=origin --push
  echo "Created and pushed: $(gh repo view --json url -q .url)"
  exit 0
fi

git push -u origin main
echo "Pushed to: $(gh repo view --json url -q .url 2>/dev/null || git remote get-url origin)"
