# Status and Next Steps

## Project status (as of 2026-02-24)

MVP is shipped with both frontend and backend paths.

Completed in this iteration:
- Option 1 complete: local persistence (`localStorage`) + JSON import/export.
- Option 2 complete: privacy hardening (text redaction, image re-encoding, payload sanitization).
- Option 3 complete: backend API + SQLite durable storage.
- Option 4 complete: discovery upgrades (search, filters, nearby mode, ranked sorting, map fit/center actions).
- Option 5 complete: remote setup + push to GitHub target.

Current architecture:
- `index.html`: page structure and control surface.
- `styles.css`: responsive styling and layout.
- `app.js`: client state, filters, ranking, import/export, API/local persistence, privacy safeguards.
- `server.py`: static hosting + API layer + SQLite persistence.
- `data/seed-entries.json`: initial seed dataset.

## Reflection

What worked well:
- Frontend remained single-page and fast while gaining significant capability.
- Anonymous-by-default policy is explicit in UI and enforced in rendering.
- API and offline/local modes coexist without blocking usability.

Known constraints:
- No auth/admin flows yet for abuse handling.
- iNaturalist lookup remains client-side with no cache/proxy.
- No automated test suite yet.

## Recommended next options

1. **Operational hardening**
   - Add basic request logging, per-IP rate limits, and payload size caps in API.
   - Add backup/restore script for SQLite data.

2. **Moderation layer**
   - Add server-side flagged-content queue and hide/unhide workflow.
   - Add simple profanity and duplicate-photo heuristics.

3. **Quality + testing**
   - Add browser tests for submit/filter/map toggle paths.
   - Add API tests for sanitize/insert/import/update endpoints.

4. **Deployment path**
   - Containerize service.
   - Deploy to a small VM or PaaS with managed domain and TLS.
