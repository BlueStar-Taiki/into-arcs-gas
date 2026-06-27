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
