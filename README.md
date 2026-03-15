# Bernal Heights Moss Atlas

This repo started as `Personal Moss World Tracker` and now has a narrower product direction:

- current MVP target: `Bernal Heights Moss Atlas`
- current product shape: one curated neighborhood walk with 8 to 12 editorial stops
- current runtime choice: static-first, with no public write path in MVP

## Current status

Planning direction is now set.

What exists today:
- a legacy community-tracker prototype is still present in the codebase
- founder review is complete
- engineering review is complete
- Bernal implementation spec is written
- Bernal content pack is drafted

What this means:
- the current app code is useful as a prototype reference
- the current app code is not the final product definition
- the atlas planning docs are the source of truth for the next implementation phase

## Source-of-truth docs

Current planning spine:
- [docs/founder-mvp-decision-memo.md](/Users/praneet/personal-moss-world-tracker/docs/founder-mvp-decision-memo.md)
- [docs/bernal-atlas-implementation-spec.md](/Users/praneet/personal-moss-world-tracker/docs/bernal-atlas-implementation-spec.md)
- [docs/bernal-content-pack.md](/Users/praneet/personal-moss-world-tracker/docs/bernal-content-pack.md)

Supporting strategy docs:
- [docs/product-strategy.md](/Users/praneet/personal-moss-world-tracker/docs/product-strategy.md)
- [docs/idea-strategy.md](/Users/praneet/personal-moss-world-tracker/docs/idea-strategy.md)
- [docs/inaturalist-spike.md](/Users/praneet/personal-moss-world-tracker/docs/inaturalist-spike.md)
- [docs/status-and-next-steps.md](/Users/praneet/personal-moss-world-tracker/docs/status-and-next-steps.md)

## Selected MVP

Build:
- one Bernal Heights chapter
- one curated walk
- 8 to 12 stops
- one home narrative
- one map-supported walk overview
- one reusable stop-detail template

Do not build yet:
- public submissions
- contributor accounts
- moderation tooling
- citywide neighborhood expansion
- one-hour regional trail directory
- route generation
- taxonomy-heavy browsing UI

## Runtime decision

Selected runtime boundary: `static-first`.

For the next implementation phase, this means:
- curated content lives in repo files
- no public `POST` or `PATCH` path is required
- no SQLite dependency is required for MVP
- no runtime iNaturalist enrichment is required for MVP

## Legacy prototype note

The current codebase still contains the earlier moss-tracker prototype:
- `index.html`
- `styles.css`
- `app.js`
- `server.py`

That prototype remains useful as a reference for:
- single-page layout patterns
- map integration
- anonymous-public copy patterns
- local development serving

It should be treated as legacy product surface while the Bernal atlas implementation begins.

## Existing local run command

If you want to inspect the legacy prototype locally:

```bash
cd /Users/praneet/personal-moss-world-tracker
python3 server.py --host 127.0.0.1 --port 8080
```

Then open [http://127.0.0.1:8080](http://127.0.0.1:8080).

## Immediate next execution steps

1. Field-verify the Bernal candidate stop list.
2. Gather the first image set and field notes.
3. Implement the static-first atlas shell against the Bernal spec.
4. Run `review` once the first real implementation branch exists.
