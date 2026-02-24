# Product Strategy

## Pause checkpoint (2026-02-24)

Project is paused and gated on testing.

Next required step before new scope:
- Validate persistence behavior in real browser sessions:
  - Existing entries/photos load on page open.
  - Entries survive refresh and browser restart.
  - Offline cache and online API sync both preserve prior data.

## Product vision

A personal/community moss discovery tracker where everyday sightings become browsable micro-landmarks through photos and location-aware views.

## MVP scope (milestone 1)

In scope:
- Single-page application shell.
- One photo submission flow (capture metadata + optional location).
- Toggleable card view and map view.
- Seeded sample entries for immediate browsing.
- iNaturalist enrichment spike documented in notes.
- Public anonymity for human contributors.

Out of scope:
- Authentication and multi-role access control.
- Full moderation tooling.
- Advanced recommendation/personalization systems.

## Public identity and privacy policy (MVP)

- Public feed never exposes contributor name, handle, email, or contact info.
- Every public entry displays the same label: `Anonymous contributor`.
- Internal entry records use non-identifying contributor tokens (`anon-xxxx`).
- Contact details in entry text are redacted.
- Uploaded images are re-encoded client-side to reduce metadata leakage.

## Target users and jobs

- Casual spotters: "I found a cool moss patch and want to share it quickly."
- Local explorers: "Show me nearby moss worlds to visit or follow."
- Curious learners: "Give me context on species or similar observations when available."

## Primary user flow

1. Open tracker landing page.
2. Browse seeded entries in card view.
3. Toggle to map view to explore location context.
4. Submit a new moss photo with title, short note, and location.
5. Save and immediately see the entry in both views.
6. Optionally inspect iNaturalist enrichment hints.

## Experience principles

- Friction-light: submission takes under one minute.
- Visual-first: photos are the first-class object.
- Spatially legible: every entry has map intent, even if approximate.
- Graceful fallback: missing metadata never blocks contribution.
- Anonymous-by-default: contributor identity is hidden in public views.

## Data model (implemented)

Entity: `moss_entry`
- `id` (string)
- `title` (string)
- `description` (string)
- `photo_url` (string)
- `captured_at` (ISO date, optional)
- `latitude` (number, optional)
- `longitude` (number, optional)
- `location_label` (string, optional)
- `created_at` (ISO datetime)
- `contributor_token` (string, non-identifying)
- `inat_observation_id` (string, optional)
- `inat_summary` (string, optional)

Public rendering fields (subset):
- `title`, `description`, `photo_url`, `captured_at`, `latitude`, `longitude`, `location_label`, `inat_summary`
- `public_contributor_label` (constant): `Anonymous contributor`

## Technical architecture (implemented)

- Frontend: static SPA (`index.html`, `styles.css`, `app.js`).
- API backend: Python `server.py` (`GET/POST/PATCH` endpoints).
- Durable storage: SQLite (`data/moss_tracker.db`).
- Offline fallback: `localStorage` + seed JSON.
- Discovery controls: search, filters, nearby mode, ranked sorting.
- Import/export: JSON round-trip for local portability.

## Post-MVP reflection (2026-02-24)

- MVP objective is met and runnable locally.
- Anonymous public display is implemented end-to-end.
- API durability and offline fallback coexist.
- Discovery UX has first-pass quality controls.

## Next execution menu

1. Operational hardening: request limits, abuse guardrails, backups.
2. Moderation workflow: flag/review/hide pipeline.
3. Automated testing: UI + API behavior tests.
4. Deployment hardening: containerization, TLS domain, production config.
