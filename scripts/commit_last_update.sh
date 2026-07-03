#!/bin/sh

set -eu

REPO_DIR="/Users/bluestar/system/into-arcs/into-arcs-gas"
COMMIT_MESSAGE="docs: add commit script operating rule"

echo "[1/7] Moving to repository: ${REPO_DIR}"
cd "${REPO_DIR}"

echo "[2/7] Checking working tree status"
git status --short

echo "[3/7] Checking unstaged changes for whitespace errors"
git diff --check

echo "[4/7] Confirming there are no pre-existing staged changes"
if ! git diff --cached --quiet; then
  echo "Aborting: staged changes already exist. Review or commit them separately."
  exit 1
fi

echo "[5/7] Staging only files changed in this update"
git add -- AGENTS.md scripts/commit_last_update.sh

if git diff --cached --name-only | grep -Fxq ".clasp.json"; then
  echo "Aborting: .clasp.json must never be committed."
  git restore --staged -- .clasp.json
  exit 1
fi

if git diff --cached --quiet; then
  echo "No staged changes. Nothing to commit."
  exit 0
fi

echo "[6/7] Creating commit: ${COMMIT_MESSAGE}"
git commit -m "${COMMIT_MESSAGE}"

echo "[7/7] Pushing commit"
git push

echo "Commit and push completed successfully."
