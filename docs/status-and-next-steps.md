# Status and Next Steps

## Project status (as of 2026-02-24)

MVP is shipped as a static single-page app and runs locally.

Implemented:
- One submission flow for moss sightings (photo URL or image upload).
- Toggleable card and map views backed by shared entry state.
- Seeded entries loaded from `data/seed-entries.json`.
- Optional per-entry iNaturalist lookup.
- Public contributor anonymity enforced in cards and map popups.

Current architecture:
- `index.html`: page structure and UI shell.
- `styles.css`: responsive styling and visual system.
- `app.js`: state, form flow, rendering, map integration, iNaturalist calls.
- `data/seed-entries.json`: initial seed dataset.

## Reflection

What worked well:
- MVP scope stayed tight and shipped quickly.
- Card and map views reuse the same entry model.
- Anonymous-by-default policy is explicit in both product docs and UI.

Current gaps:
- New entries are in-memory only and disappear after refresh.
- No server/API yet for durable storage, moderation, or feed controls.
- iNaturalist enrichment has no caching, confidence score, or retry policy.
- No automated tests yet.

## Recommended execution options

1. **Option A: Durable local MVP (recommended next)**
   - Add `localStorage` persistence for entries.
   - Add import/export JSON backup.
   - Add basic client-side validation hardening.
   - Outcome: reliable demo that survives reloads without backend work.

2. **Option B: Backend-ready MVP**
   - Add a minimal API (create/list entries).
   - Move seed + user entries to persistent storage.
   - Keep public response shape anonymous by design.
   - Outcome: shareable multi-user prototype with durable data.

3. **Option C: Discovery quality upgrade**
   - Add filters (nearby, has map coordinates, has iNaturalist match).
   - Add stronger map interactions and popups.
   - Add lightweight ranking (recency + proximity).
   - Outcome: better browsing experience for exploration.

4. **Option D: Privacy + trust hardening**
   - Add upload sanitization and image size limits.
   - Add public payload guardrails to prevent identity leaks.
   - Add contributor token rotation policy and docs.
   - Outcome: stronger anonymity posture before wider sharing.

## Suggested order

- First: Option A (stability with low complexity)
- Second: Option D (privacy hardening)
- Third: Option B (multi-user durability)
- Fourth: Option C (experience polish)
