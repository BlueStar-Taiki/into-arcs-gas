# AGENTS.md

## Project
This repository manages Google Apps Script projects for INTO-ARCS operations.

## Important rules
- Do not commit .clasp.json.
- Do not commit webhook URLs, calendar IDs, credentials, or personal data.
- Preserve Japanese sheet names and header names unless explicitly requested.
- Use CONFIG constants for sheet names, headers, statuses, and fixed messages.
- Do not hard-code column numbers.
- Use header-based lookup functions.
- Treat form response sheets as raw data.
- Write business data to management sheets.
- Do not execute GAS or access production data.
- For spreadsheet structure changes, implement setup or migration functions.
- Update docs when changing sheet structure or operation flow.

## Commit Script Rule

After each completed update, create or update `scripts/commit_last_update.sh`.

The script must:

- Change directory to `/Users/bluestar/system/into-arcs/into-arcs-gas`.
- Run `git status --short`.
- Run `git diff --check`.
- Run `clasp push` from `gas/star-photo-application`.
- Never add `.clasp.json`.
- Avoid `git add .` unless explicitly justified.
- Add only the files changed in the current update.
- Use a clear commit message describing the current update.
- Run `git commit`.
- Run `git push`.
- Stop safely if there are no staged changes.
- Print clear progress messages.

Do not execute the script when creating or updating it.
