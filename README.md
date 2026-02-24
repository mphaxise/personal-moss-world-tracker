# Personal Moss World Tracker

Turns everyday moss sightings into a lightweight community discovery product with visual browsing and location context.

## Current status (2026-02-24)

- MVP is implemented and runnable locally.
- One photo submission flow is live (URL or upload).
- Card and map view toggle is functional.
- Seeded entries load at startup.
- Optional iNaturalist enrichment is wired per entry.
- Public contributor display is anonymous-only.

## Contributor anonymity (public view)

- Public cards and map popups always show: `Anonymous contributor`.
- No public identity fields are collected or rendered.
- Internal records use non-identifying contributor tokens only.

## Run locally

From `/Users/praneet/personal-moss-world-tracker`:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Then open [http://127.0.0.1:8080](http://127.0.0.1:8080).

## Project structure

```text
personal-moss-world-tracker/
  index.html
  styles.css
  app.js
  data/
    seed-entries.json
  docs/
    idea-strategy.md
    product-strategy.md
    inaturalist-spike.md
    status-and-next-steps.md
```

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
