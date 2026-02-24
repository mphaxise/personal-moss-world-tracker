# Personal Moss World Tracker

Turns everyday moss sightings into a lightweight community discovery product with visual browsing and location context.

## Current status (2026-02-24)

- MVP is implemented and runnable locally.
- One photo submission flow is live (URL or upload).
- Card and map view toggle is functional.
- Seeded entries load at startup.
- Optional iNaturalist enrichment is wired per entry.
- Public contributor display is anonymous-only.
- Local JSON import/export is implemented.
- Local persistence via `localStorage` is implemented.
- Minimal API + SQLite persistence backend is implemented.
- Discovery upgrades shipped: search, filters, nearby mode, ranked sort, map actions.

## Contributor anonymity (public view)

- Public cards and map popups always show: `Anonymous contributor`.
- Contact details in text are redacted (`[redacted-email]`, `[redacted-phone]`).
- Internal records use non-identifying contributor tokens only.
- Uploaded images are re-encoded client-side to reduce metadata leakage.

## Run locally

From `/Users/praneet/personal-moss-world-tracker`:

```bash
python3 server.py --host 127.0.0.1 --port 8080
```

Then open [http://127.0.0.1:8080](http://127.0.0.1:8080).

## Project structure

```text
personal-moss-world-tracker/
  index.html
  styles.css
  app.js
  server.py
  data/
    seed-entries.json
    moss_tracker.db (runtime, gitignored)
  docs/
    idea-strategy.md
    product-strategy.md
    inaturalist-spike.md
    status-and-next-steps.md
```

## API endpoints

- `GET /api/health`
- `GET /api/entries`
- `POST /api/entries`
- `POST /api/entries/import`
- `PATCH /api/entries/{id}/enrichment`

## Strategy and planning docs

- `docs/idea-strategy.md`
- `docs/product-strategy.md`
- `docs/inaturalist-spike.md`
- `docs/status-and-next-steps.md`

## Planning context

- Title: Personal Moss World Tracker
- Rank: 3
- Priority: 5
- Source: Manual backlog (user idea)
- Source files: `/Users/praneet/PraneetIdeas/manual_ideas.json`, `/Users/praneet/PraneetIdeas/memory.md`
- Idea link: https://github.com/manual/manual
- Review date: 2026-02-24
