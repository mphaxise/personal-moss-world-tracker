# Product Strategy

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
- Any future private contact channel must be strictly separate from public rendering.

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

## Proposed data model (v1)

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

## Technical direction (prototype)

- Frontend: single-page web app.
- Storage: local seeded JSON plus in-memory additions for prototype phase.
- Map: lightweight map component with marker rendering.
- Enrichment spike: test an iNaturalist lookup path and log results/constraints.

## Milestones

Milestone 1 (60-90 min target):
- Build one-page UI shell.
- Implement submission form and local state updates.
- Render card list and map markers from shared entry state.

End-of-day target:
- Working one-page moss tracker with seeded entries.
- iNaturalist enrichment spike documented (what worked, what failed, next step).

## Definition of done

- Prototype runs locally without backend dependencies.
- Submission flow and view toggle are functional.
- At least one seeded entry and one newly submitted entry render in both views.
- Public entry display is anonymous for all contributors.
- iNaturalist spike notes are captured in project docs.

## Post-MVP reflection (2026-02-24)

- MVP objective is met and runnable locally.
- Anonymous public display is implemented end-to-end in UI rendering.
- Map and cards are synchronized via one shared entry model.
- Main maturity gap is persistence (entries reset on page refresh).

## Next execution menu

1. Durable local MVP: add `localStorage` persistence + JSON import/export.
2. Privacy hardening: add media/payload sanitization and stronger public output guards.
3. Backend path: create minimal API + persistent store with anonymous public schema.
4. Discovery UX: filters, improved map controls, and ranked browsing.

Detailed option analysis: `docs/status-and-next-steps.md`.
