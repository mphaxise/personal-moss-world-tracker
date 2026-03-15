# Bernal Heights Moss Atlas

This repo started as `Personal Moss World Tracker` and now has a narrower product direction:

- current MVP target: `Bernal Heights Moss Atlas`
- current product shape: one curated neighborhood walk with 8 to 12 editorial stops
- current runtime choice: static-first, with no public write path in MVP

## Current status

Planning direction is now set.

What exists today:
- a static Bernal atlas shell now loads the candidate content scaffold at the repo root
- a dedicated walk collection page now lives at `collect.html`
- a companion kid scout page now lives at `kid-collect.html`
- the walk collection page now includes a Google Maps route handoff, reverse-geocoded stop addresses, and two recent nearby iNaturalist photos per stop
- a legacy community-tracker prototype is still present in the codebase
- founder review is complete
- engineering review is complete
- Bernal implementation spec is written
- Bernal content pack is drafted

What this means:
- the current app code is useful as a prototype reference
- the current app code is now split into atlas mode, walk-capture mode, and the preserved legacy tracker
- the atlas planning docs are the source of truth for the next implementation phase

## Source-of-truth docs

Current planning spine:
- [docs/founder-mvp-decision-memo.md](/Users/praneet/personal-moss-world-tracker/docs/founder-mvp-decision-memo.md)
- [docs/bernal-atlas-implementation-spec.md](/Users/praneet/personal-moss-world-tracker/docs/bernal-atlas-implementation-spec.md)
- [docs/bernal-content-pack.md](/Users/praneet/personal-moss-world-tracker/docs/bernal-content-pack.md)
- [docs/bernal-field-worksheet.md](/Users/praneet/personal-moss-world-tracker/docs/bernal-field-worksheet.md)
- [docs/bernal-field-checklist.md](/Users/praneet/personal-moss-world-tracker/docs/bernal-field-checklist.md)

Supporting strategy docs:
- [docs/product-strategy.md](/Users/praneet/personal-moss-world-tracker/docs/product-strategy.md)
- [docs/idea-strategy.md](/Users/praneet/personal-moss-world-tracker/docs/idea-strategy.md)
- [docs/inaturalist-spike.md](/Users/praneet/personal-moss-world-tracker/docs/inaturalist-spike.md)
- [docs/status-and-next-steps.md](/Users/praneet/personal-moss-world-tracker/docs/status-and-next-steps.md)

Execution scaffold:
- [content/bernal-heights-atlas.json](/Users/praneet/personal-moss-world-tracker/content/bernal-heights-atlas.json)
- [collect.html](/Users/praneet/personal-moss-world-tracker/collect.html)
- [kid-collect.html](/Users/praneet/personal-moss-world-tracker/kid-collect.html)

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

The earlier moss-tracker prototype is still preserved in the repo as:
- `legacy-tracker.html`
- `legacy-tracker.css`
- `app.js`
- `server.py`

That prototype remains useful as a reference for:
- single-page layout patterns
- map integration
- anonymous-public copy patterns
- local development serving

It should be treated as legacy product surface while the Bernal atlas implementation begins.

## Existing local run command

To inspect the current Bernal atlas shell locally:

```bash
cd /Users/praneet/personal-moss-world-tracker
python3 server.py --host 127.0.0.1 --port 8080
```

Then open [http://127.0.0.1:8080](http://127.0.0.1:8080).

For the map-first field collection page, open [http://127.0.0.1:8080/collect.html](http://127.0.0.1:8080/collect.html).

For the lighter companion iPad page, open [http://127.0.0.1:8080/kid-collect.html](http://127.0.0.1:8080/kid-collect.html).

The walk collection page now supports:
- start point at `418 Nevada Street`
- a single `Open full route in Google Maps` handoff
- reverse-geocoded stop addresses
- two recent nearby iNaturalist photos per stop
- a linked companion `kid mode` for a second device

The kid scout page supports:
- the same 10-stop Bernal route
- large-touch stop selection and quick `found / maybe / skip` decisions
- simple habitat and texture tags
- one-photo capture with on-device persistence
- separate local save from the adult page so phone and iPad notes do not overwrite each other

If you want the earlier tracker prototype, open [http://127.0.0.1:8080/legacy-tracker.html](http://127.0.0.1:8080/legacy-tracker.html).

## Immediate next execution steps

1. Field-verify the Bernal candidate stop list.
   Use [docs/bernal-field-worksheet.md](/Users/praneet/personal-moss-world-tracker/docs/bernal-field-worksheet.md) during the walk.
   Use [docs/bernal-field-checklist.md](/Users/praneet/personal-moss-world-tracker/docs/bernal-field-checklist.md) if you want the compact phone version.
2. Gather the first image set and field notes.
3. Upgrade [content/bernal-heights-atlas.json](/Users/praneet/personal-moss-world-tracker/content/bernal-heights-atlas.json) from `candidate` to `field-verified` stop by stop.
4. Run `review` once the first real implementation branch exists.
