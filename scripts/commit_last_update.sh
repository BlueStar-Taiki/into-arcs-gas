#!/bin/sh

set -eu

PATH="/usr/local/bin:${PATH}"

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)
GAS_PROJECT_DIR="${REPO_DIR}/gas/star-photo-application"
COMMIT_MESSAGE="feat: split event date and start time"

echo "[1/9] Moving to repository: ${REPO_DIR}"
cd "${REPO_DIR}"

echo "[2/9] Checking working tree status"
git status --short

echo "[3/9] Checking unstaged changes for whitespace errors"
git diff --check

echo "[4/9] Confirming there are no pre-existing staged changes"
if ! git diff --cached --quiet; then
  echo "Aborting: staged changes already exist. Review or commit them separately."
  exit 1
fi

echo "[5/9] Verifying clasp configuration"
if ! command -v clasp >/dev/null 2>&1; then
  echo "Aborting: clasp command was not found."
  exit 1
fi
if [ ! -f "${GAS_PROJECT_DIR}/.clasp.json" ]; then
  echo "Aborting: ${GAS_PROJECT_DIR}/.clasp.json was not found."
  exit 1
fi

echo "[6/9] Pushing Apps Script project from: ${GAS_PROJECT_DIR}"
cd "${GAS_PROJECT_DIR}"
clasp push
cd "${REPO_DIR}"

echo "[7/9] Staging only files changed in this update"
git add -- \
  docs/star_photo_application_manual.md \
  docs/star_photo_application_schema.md \
  docs/star_photo_event_design.md \
  gas/star-photo-application/src/calendar.js \
  gas/star-photo-application/src/config.js \
  gas/star-photo-application/src/event.js \
  gas/star-photo-application/src/eventStatusMail.js \
  gas/star-photo-application/src/mail.js \
  gas/star-photo-application/src/setup.js \
  gas/star-photo-application/src/utils.js \
  scripts/commit_last_update.sh

if git diff --cached --name-only | grep -Eq '(^|/)\.clasp\.json$'; then
  echo "Aborting: a .clasp.json file must never be committed."
  exit 1
fi

if git diff --cached --quiet; then
  echo "No staged changes. Nothing to commit."
  exit 0
fi

echo "[8/9] Creating commit: ${COMMIT_MESSAGE}"
git commit -m "${COMMIT_MESSAGE}"

echo "[9/9] Pushing Git commit"
git push

echo "Commit and push completed successfully."
