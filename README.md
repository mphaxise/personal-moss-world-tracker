# Neighborhood Nature Challenges Prototype

Planning note:
- after the first Bernal field walk on `2026-03-15`, the repo now includes a founder pivot memo exploring a simpler product direction around `parent-child neighborhood nature challenges`
- the Bernal atlas work remains in the repo and is still useful, but the current implementation planning direction is now `challenge-first`

This repo started as `Personal Moss World Tracker`, moved through `Bernal Heights Moss Atlas`, and now has a clearer near-term product direction:

- current MVP target: `parent-child neighborhood nature challenges`
- current product shape: one adult mode, one kid mode, lightweight challenge packs, and end-of-walk recap
- current runtime choice: static-first, with no required backend state in MVP

## Current status

Planning direction is now set.

What exists today:
- a static Bernal atlas shell still exists as legacy product exploration
- a dedicated adult collection page lives at `collect.html`
- a companion kid scout page lives at `kid-collect.html`
- the two-device collection flow, photo capture, local save, and local upload already work
- founder review is complete
- engineering review for the atlas is complete
- founder pivot memo is written
- challenge-first implementation spec is now written
- challenge-pack schema is now written
- the first three challenge packs are now scaffolded

What this means:
- the current app code is useful as a prototype reference
- the current app code is now split into atlas mode, walk-capture mode, and the preserved legacy tracker
- the challenge planning docs are the source of truth for the next implementation phase

## Source-of-truth docs

Current planning spine:
- [docs/founder-mvp-decision-memo.md](/Users/praneet/personal-moss-world-tracker/docs/founder-mvp-decision-memo.md)
- [docs/founder-mvp-pivot-memo.md](/Users/praneet/personal-moss-world-tracker/docs/founder-mvp-pivot-memo.md)
- [docs/challenge-first-implementation-spec.md](/Users/praneet/personal-moss-world-tracker/docs/challenge-first-implementation-spec.md)
- [docs/challenge-pack-schema.md](/Users/praneet/personal-moss-world-tracker/docs/challenge-pack-schema.md)
- [docs/bernal-atlas-implementation-spec.md](/Users/praneet/personal-moss-world-tracker/docs/bernal-atlas-implementation-spec.md)
- [docs/bernal-content-pack.md](/Users/praneet/personal-moss-world-tracker/docs/bernal-content-pack.md)
- [docs/bernal-field-worksheet.md](/Users/praneet/personal-moss-world-tracker/docs/bernal-field-worksheet.md)
- [docs/bernal-field-checklist.md](/Users/praneet/personal-moss-world-tracker/docs/bernal-field-checklist.md)
- [docs/family-nature-challenges-landscape-research.md](/Users/praneet/personal-moss-world-tracker/docs/family-nature-challenges-landscape-research.md)

Supporting strategy docs:
- [docs/product-strategy.md](/Users/praneet/personal-moss-world-tracker/docs/product-strategy.md)
- [docs/idea-strategy.md](/Users/praneet/personal-moss-world-tracker/docs/idea-strategy.md)
- [docs/inaturalist-spike.md](/Users/praneet/personal-moss-world-tracker/docs/inaturalist-spike.md)
- [docs/status-and-next-steps.md](/Users/praneet/personal-moss-world-tracker/docs/status-and-next-steps.md)

Execution scaffold:
- [content/bernal-heights-atlas.json](/Users/praneet/personal-moss-world-tracker/content/bernal-heights-atlas.json)
- [rainbow-hunt-v1.json](/Users/praneet/personal-moss-world-tracker/content/challenges/rainbow-hunt-v1.json)
- [pick-your-color-v1.json](/Users/praneet/personal-moss-world-tracker/content/challenges/pick-your-color-v1.json)
- [tiny-worlds-v1.json](/Users/praneet/personal-moss-world-tracker/content/challenges/tiny-worlds-v1.json)
- [collect.html](/Users/praneet/personal-moss-world-tracker/collect.html)
- [kid-collect.html](/Users/praneet/personal-moss-world-tracker/kid-collect.html)

## Selected MVP

Build:
- one adult page
- one kid page
- three lightweight challenge packs
- photo-first collection on neighborhood walks
- one end-of-walk recap
- simple bundle upload or merge

Do not build yet:
- public submissions
- contributor accounts
- moderation tooling
- live sync
- citywide challenge marketplace
- route generation
- taxonomy-heavy identification workflow

## Runtime decision

Selected runtime boundary: `static-first`.

For the next implementation phase, this means:
- challenge pack content lives in repo files
- no public `POST` or `PATCH` path is required
- no SQLite dependency is required for MVP
- no runtime third-party enrichment is required in the walk flow

## Legacy prototype note

The earlier product exploration layers are still preserved in the repo as:
- `legacy-tracker.html`
- `legacy-tracker.css`
- `app.js`
- `server.py`
- `index.html`
- `atlas.js`

These remain useful as references for:
- single-page layout patterns
- map integration
- anonymous-public copy patterns
- local development serving

They should be treated as reference material while the challenge-first implementation begins.

## Existing local run command

To inspect the current prototype locally:

```bash
cd /Users/praneet/personal-moss-world-tracker
python3 server.py --host 127.0.0.1 --port 8080
```

Then open [http://127.0.0.1:8080](http://127.0.0.1:8080).

For the map-first field collection page, open [http://127.0.0.1:8080/collect.html](http://127.0.0.1:8080/collect.html).

For the lighter companion iPad page, open [http://127.0.0.1:8080/kid-collect.html](http://127.0.0.1:8080/kid-collect.html).

If the iPad will be offline on the walk, load `kid-collect.html` at home and keep the tab open during the walk.
After the walk, use `Export kid notes` to pull the data back out of the device.

The current adult and kid prototype still support:
- two-device collection
- photo capture on both devices
- local save
- export and upload back to the laptop server
- a linked companion `kid mode` for a second device

The kid scout page supports:
- large-touch selection and quick `found / maybe / skip` decisions
- simple tags and one-photo capture
- one-photo capture with on-device persistence
- separate local save from the adult page so phone and iPad notes do not overwrite each other
- export with reduced-size photo data for later merge or upload

Recommended real-world flow:
1. At home, open the adult and kid pages once on the two devices.
2. Collect locally during the walk.
3. Back at home on the same Wi-Fi, use `Upload to laptop` from each device.
4. The laptop server stores each uploaded bundle under `uploads/`.
5. If direct upload is unavailable, use `Export kid notes` on the iPad and `Import kid export` on the adult page as the fallback.

Offline note:
- true service-worker offline install only works on `localhost` or HTTPS
- on a plain laptop LAN URL like `http://10.0.0.50:8090`, the safe assumption is still: load the page at home and keep the tab open during the walk

If you want the earlier tracker prototype, open [http://127.0.0.1:8080/legacy-tracker.html](http://127.0.0.1:8080/legacy-tracker.html).

## Immediate next execution steps

1. Use [docs/challenge-pack-schema.md](/Users/praneet/personal-moss-world-tracker/docs/challenge-pack-schema.md) as the new content contract.
2. Use [docs/challenge-first-implementation-spec.md](/Users/praneet/personal-moss-world-tracker/docs/challenge-first-implementation-spec.md) as the execution plan.
3. Refactor the current adult and kid pages from route-first to challenge-first.
4. Run `review` on the first implementation branch before polishing.
